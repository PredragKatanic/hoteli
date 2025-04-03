from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, database, auth
from ..config import settings
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

# Pydantic models for request/response
class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str

class User(UserBase):
    id: int
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        full_name=user.full_name,
        phone=user.phone
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me/", response_model=User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.get("/", response_model=list[User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=User)
def read_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user: UserBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user.dict().items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/me/", response_model=User)
async def update_users_me(
    user_data: UserBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username is being changed
    if user_data.username != db_user.username:
        # Check if new username already exists
        existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update user fields
    for key, value in user_data.dict().items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"} 