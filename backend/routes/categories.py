from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, database, auth
from pydantic import BaseModel

router = APIRouter(
    prefix="/categories",
    tags=["categories"]
)

# Pydantic models for request/response
class CategoryBase(BaseModel):
    name: str
    description: str = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int

    class Config:
        orm_mode = True

@router.post("/", response_model=Category)
def create_category(
    category: CategoryCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_category = models.RoomCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[Category])
def read_categories(
    db: Session = Depends(database.get_db)
):
    categories = db.query(models.RoomCategory).all()
    return categories

@router.get("/{category_id}", response_model=Category)
def read_category(
    category_id: int,
    db: Session = Depends(database.get_db)
):
    category = db.query(models.RoomCategory).filter(models.RoomCategory.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.put("/{category_id}", response_model=Category)
def update_category(
    category_id: int,
    category: CategoryBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_category = db.query(models.RoomCategory).filter(models.RoomCategory.id == category_id).first()
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict().items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_category = db.query(models.RoomCategory).filter(models.RoomCategory.id == category_id).first()
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"} 