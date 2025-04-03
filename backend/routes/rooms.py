from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, database, auth
from ..config import settings
from pydantic import BaseModel

router = APIRouter(
    prefix="/rooms",
    tags=["rooms"]
)

# Pydantic models for request/response
class RoomBase(BaseModel):
    room_number: str
    price: float
    num_beds: int
    size: str
    view_type: str
    description: str = None
    image_url: str = None

class RoomCreate(RoomBase):
    category_id: int
    cot_available: bool = False
    has_tv: bool = True
    has_internet: bool = True
    has_minibar: bool = True

class Room(RoomBase):
    id: int
    category_id: Optional[int] = None
    cot_available: bool = False
    has_tv: bool = True
    has_internet: bool = True
    has_minibar: bool = True
    category_name: Optional[str] = None
    status: str = "available"

    class Config:
        from_attributes = True

@router.post("/", response_model=Room)
def create_room(
    room: RoomCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    room_dict = room.dict()
    # Set default values for boolean fields if not provided
    if "cot_available" not in room_dict:
        room_dict["cot_available"] = False
    if "has_tv" not in room_dict:
        room_dict["has_tv"] = True
    if "has_internet" not in room_dict:
        room_dict["has_internet"] = True
    if "has_minibar" not in room_dict:
        room_dict["has_minibar"] = True
    
    db_room = models.Room(**room_dict)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    
    # Add category name to the room
    if db_room.category:
        db_room.category_name = db_room.category.name
    else:
        db_room.category_name = "Uncategorized"
    
    # Ensure boolean fields have default values
    if db_room.cot_available is None:
        db_room.cot_available = False
    if db_room.has_tv is None:
        db_room.has_tv = True
    if db_room.has_internet is None:
        db_room.has_internet = True
    if db_room.has_minibar is None:
        db_room.has_minibar = True
    
    return db_room

@router.get("/", response_model=List[Room])
def read_rooms(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    guests: Optional[int] = None,
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Room)
    
    # Apply filters if provided
    if category_id:
        query = query.filter(models.Room.category_id == category_id)
    
    # Skip and limit for pagination
    rooms = query.offset(skip).limit(limit).all()
    
    # Add category name to each room and ensure boolean fields have default values
    for room in rooms:
        if room.category:
            room.category_name = room.category.name
        else:
            room.category_name = "Uncategorized"
            
        # Ensure boolean fields have default values
        if room.cot_available is None:
            room.cot_available = False
        if room.has_tv is None:
            room.has_tv = True
        if room.has_internet is None:
            room.has_internet = True
        if room.has_minibar is None:
            room.has_minibar = True
    return rooms

@router.get("/{room_id}", response_model=Room)
def read_room(room_id: int, db: Session = Depends(database.get_db)):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Add category name to the room
    if room.category:
        room.category_name = room.category.name
    else:
        room.category_name = "Uncategorized"
    
    # Ensure boolean fields have default values
    if room.cot_available is None:
        room.cot_available = False
    if room.has_tv is None:
        room.has_tv = True
    if room.has_internet is None:
        room.has_internet = True
    if room.has_minibar is None:
        room.has_minibar = True
    
    return room

@router.put("/{room_id}", response_model=Room)
def update_room(
    room_id: int,
    room: RoomCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if db_room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    for key, value in room.dict().items():
        setattr(db_room, key, value)
    
    db.commit()
    db.refresh(db_room)
    
    # Add category name to the room
    if db_room.category:
        db_room.category_name = db_room.category.name
    else:
        db_room.category_name = "Uncategorized"
    
    # Ensure boolean fields have default values
    if db_room.cot_available is None:
        db_room.cot_available = False
    if db_room.has_tv is None:
        db_room.has_tv = True
    if db_room.has_internet is None:
        db_room.has_internet = True
    if db_room.has_minibar is None:
        db_room.has_minibar = True
    
    return db_room

@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # First check if the room exists
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if db_room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check for active reservations (pending or confirmed)
    active_reservations = db.query(models.Reservation).filter(
        models.Reservation.room_id == room_id,
        models.Reservation.status.in_(["pending", "confirmed"])
    ).count()
    
    if active_reservations > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete room with {active_reservations} active reservations. Cancel all reservations first."
        )
    
    try:
        # Mark completed/cancelled reservations as having no room (set room_id to null)
        reservations = db.query(models.Reservation).filter(
            models.Reservation.room_id == room_id,
            models.Reservation.status.in_(["cancelled", "completed"])
        ).all()
        
        for reservation in reservations:
            reservation.room_id = None
        
        # Now delete the room
        db.delete(db_room)
        db.commit()
        return {"message": "Room deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error deleting room: {str(e)}"
        ) 