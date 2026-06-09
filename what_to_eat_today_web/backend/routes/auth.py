"""Authentication routes: email verification code login."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from auth_service import send_verification_code, verify_code
from database import SessionLocal
from jwt_utils import create_token, get_current_user_id
from models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SendCodeRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_nju_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.endswith("@smail.nju.edu.cn") and not v.endswith("@nju.edu.cn"):
            raise ValueError("仅支持南京大学邮箱（@nju.edu.cn 或 @smail.nju.edu.cn）")
        return v


class VerifyRequest(BaseModel):
    email: str
    code: str


class SetNicknameRequest(BaseModel):
    nickname: str

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 20:
            raise ValueError("昵称长度需在 1-20 个字符之间")
        return v


class TokenResponse(BaseModel):
    token: str
    need_nickname: bool
    nickname: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    nickname: str | None


@router.post("/send-code")
def send_code(req: SendCodeRequest):
    """Send a 6-digit verification code to the given NJU email."""
    db = SessionLocal()
    try:
        success = send_verification_code(db, req.email)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="验证码发送失败，请稍后重试",
            )
        return {"message": "验证码已发送，请查收邮件"}
    finally:
        db.close()


@router.post("/verify", response_model=TokenResponse)
def verify(req: VerifyRequest):
    """Verify the code and return a JWT token."""
    db = SessionLocal()
    try:
        email = req.email.strip().lower()
        if not verify_code(db, email, req.code.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误或已过期",
            )

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_token(user.id)
        return TokenResponse(
            token=token,
            need_nickname=user.nickname is None,
            nickname=user.nickname,
        )
    finally:
        db.close()


@router.post("/set-nickname", response_model=UserResponse)
def set_nickname(
    req: SetNicknameRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Set nickname for the current user (first-time login)."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        user.nickname = req.nickname
        db.commit()
        db.refresh(user)
        return UserResponse(id=user.id, email=user.email, nickname=user.nickname)
    finally:
        db.close()


@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id)):
    """Get current user info."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        return UserResponse(id=user.id, email=user.email, nickname=user.nickname)
    finally:
        db.close()
