"""Authentication routes: CAS login and user info."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from auth import create_access_token, get_current_user, validate_cas_ticket
from database import SessionLocal
from models import User
from schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request) -> LoginResponse:
    """Validate CAS ticket and return JWT + user info."""
    http_client = request.app.state.http_client

    # Validate ticket with CAS server
    student_id, name = await validate_cas_ticket(body.ticket, http_client)

    # Find or create user
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.student_id == student_id).first()
        if user is None:
            user = User(
                student_id=student_id,
                name=name,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Issue JWT
        token = create_access_token(student_id, name)

        return LoginResponse(
            token=token,
            user=UserOut.model_validate(user),
        )
    finally:
        session.close()


@router.get("/me", response_model=UserOut)
def get_me(payload: dict = Depends(get_current_user)) -> UserOut:
    """Return current user info from JWT."""
    student_id = payload.get("sub", "")

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.student_id == student_id).first()
        if user is None:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return UserOut.model_validate(user)
    finally:
        session.close()
