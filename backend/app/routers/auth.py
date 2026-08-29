"""
Authentication router: Signup, Login, and Current User profile endpoints.
"""

from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db import User
from app.services.auth import (
    create_access_token,
    get_password_hash,
    require_current_user,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "teacher"  # "teacher" | "student"
    scholar_id: Optional[str] = None  # 7-digit for students


class LoginRequest(BaseModel):
    email: str  # Email, 7-digit Scholar ID, or Admin_DSVV01
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    scholar_id: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_active: bool
    class_id: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    role = body.role.lower().strip()
    if role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin registration is restricted. Please log in with authorized admin credentials.",
        )

    clean_email = body.email.lower().strip()

    if role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student accounts cannot be created via public sign-up. Your institution Admin must provision your account. Please sign in using your 7-digit Scholar ID and default password (student@dsvv123).",
        )

    # Teacher registration (open worldwide)
    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered. Please log in.",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=clean_email,
        hashed_pw=get_password_hash(body.password),
        full_name=body.full_name or clean_email.split("@")[0].capitalize(),
        role="teacher",
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=str(new_user.id),
            email=new_user.email,
            scholar_id=None,
            full_name=new_user.full_name,
            role=new_user.role,
            is_active=new_user.is_active,
            class_id=None,
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = body.email.strip()
    user: Optional[User] = None

    # 1. 7-digit Scholar ID match
    if identifier.isdigit() and len(identifier) == 7:
        res = await db.execute(select(User).where(User.scholar_id == identifier))
        user = res.scalar_one_or_none()

    # 2. Admin username match (Admin_DSVV01)
    elif identifier.lower() in ["admin_dsvv01", "admin_dsvv01@dsvv.ac.in", "admin@dsvv.ac.in"]:
        res = await db.execute(select(User).where(User.role == "admin").limit(1))
        user = res.scalar_one_or_none()

    # 3. Email match
    if not user:
        res = await db.execute(select(User).where(User.email.ilike(identifier)))
        user = res.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your Email/Scholar ID and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            scholar_id=user.scholar_id,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            class_id=str(user.class_id) if user.class_id else None,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(require_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        scholar_id=current_user.scholar_id,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        class_id=str(current_user.class_id) if current_user.class_id else None,
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Allow authenticated students, teachers, or admins to change their password.
    """
    if not verify_password(body.current_password, current_user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect.",
        )
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    current_user.hashed_pw = get_password_hash(body.new_password)
    await db.commit()
    return {
        "status": "success",
        "message": "Password updated successfully. Please use your new password next time you sign in.",
    }

