"""Email verification code sending and validation service."""

import os
import random
import smtplib
import string
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from models import VerificationCode

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.qq.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

CODE_LENGTH = 6
CODE_EXPIRE_MINUTES = 5


def generate_code() -> str:
    """Generate a random 6-digit verification code."""
    return "".join(random.choices(string.digits, k=CODE_LENGTH))


def send_verification_code(db: Session, email: str) -> bool:
    """Generate a code, save to DB, and send via SMTP. Returns True on success."""
    code = generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRE_MINUTES)

    # Save code to database
    record = VerificationCode(email=email, code=code, expires_at=expires_at)
    db.add(record)
    db.commit()

    # Send email
    if not SMTP_USER or not SMTP_PASS:
        # Dev mode: print code to console if SMTP not configured
        print(f"[DEV] 验证码 for {email}: {code}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_USER
        msg["To"] = email
        msg["Subject"] = "【今天吃什么】邮箱验证码"

        html_body = f"""
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #333;">今天吃什么 - 邮箱验证</h2>
            <p style="color: #666; font-size: 14px;">你的验证码是：</p>
            <div style="font-size: 32px; font-weight: bold; color: #ff6b35;
                        letter-spacing: 6px; padding: 16px 0;">{code}</div>
            <p style="color: #999; font-size: 12px;">验证码 {CODE_EXPIRE_MINUTES} 分钟内有效，请勿泄露给他人。</p>
        </div>
        """
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, email, msg.as_string())

        return True
    except Exception as e:
        print(f"[ERROR] 发送验证码失败: {e}")
        return False


def verify_code(db: Session, email: str, code: str) -> bool:
    """Check if the code is valid and not expired. Marks it as used."""
    now = datetime.now(timezone.utc)
    record = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.used == False,  # noqa: E712
            VerificationCode.expires_at > now,
        )
        .order_by(VerificationCode.created_at.desc())
        .first()
    )

    if not record:
        return False

    record.used = True
    db.commit()
    return True
