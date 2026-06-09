"""JWT signing/verification and CAS ticket validation utilities."""

import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

# --- Configuration ---

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

CAS_SERVER = "https://authserver.nju.edu.cn/authserver"
CAS_VALIDATE_URL = f"{CAS_SERVER}/serviceValidate"
CAS_NAMESPACE = "http://www.yale.edu/tp/cas"

# --- JWT Functions ---

security = HTTPBearer()


def create_access_token(student_id: str, name: str) -> str:
    """Create a signed JWT token for the given user."""
    payload = {
        "sub": student_id,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency: decode and validate the Bearer token."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


# --- CAS Ticket Validation ---


async def validate_cas_ticket(
    ticket: str, http_client: httpx.AsyncClient
) -> tuple[str, str]:
    """Validate a CAS service ticket and return (student_id, name).

    Raises HTTPException(401) if the ticket is invalid.
    """
    service_url = os.environ.get("CAS_SERVICE_URL", "")
    if not service_url:
        raise RuntimeError("CAS_SERVICE_URL environment variable is required")

    response = await http_client.get(
        CAS_VALIDATE_URL,
        params={"ticket": ticket, "service": service_url},
        timeout=10.0,
    )

    # Parse CAS XML response
    try:
        root = ET.fromstring(response.text)
    except ET.ParseError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CAS ticket validation failed",
        )

    # Check for authentication success
    success_elem = root.find(f"{{{CAS_NAMESPACE}}}authenticationSuccess")
    if success_elem is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CAS ticket validation failed",
        )

    # Extract user info
    user_elem = success_elem.find(f"{{{CAS_NAMESPACE}}}user")
    if user_elem is None or not user_elem.text:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CAS ticket validation failed",
        )

    student_id = user_elem.text.strip()

    # Extract name from attributes
    attrs_elem = success_elem.find(f"{{{CAS_NAMESPACE}}}attributes")
    name = student_id  # fallback to student_id if no name found
    if attrs_elem is not None:
        cn_elem = attrs_elem.find(f"{{{CAS_NAMESPACE}}}cn")
        if cn_elem is not None and cn_elem.text:
            name = cn_elem.text.strip()

    return student_id, name
