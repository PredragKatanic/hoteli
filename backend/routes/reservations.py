from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, database, auth
from config import settings
from pydantic import BaseModel
from datetime import date

router = APIRouter(
    prefix="/reservations",
    tags=["reservations"]
)

# Pydantic models for request/response
class ReservationBase(BaseModel):
    room_id: int
    guest_name: str
    guest_document: str
    price: float
    arrival_date: date
    departure_date: date
    num_guests: int
    payment_method: str
    pension_type: str
    cancellation_option: bool = False

class ReservationCreate(ReservationBase):
    pass

class Reservation(ReservationBase):
    id: int
    user_id: int
    status: str
    room_number: str = None

    class Config:
        from_attributes = True

@router.post("/", response_model=Reservation)
def create_reservation(
    reservation: ReservationCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    db_reservation = models.Reservation(**reservation.dict(), user_id=current_user.id)
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    
    # Fetch the room_number for the newly created reservation
    room = db.query(models.Room).filter(models.Room.id == db_reservation.room_id).first()
    if room:
        db_reservation.room_number = room.room_number
    
    return db_reservation

@router.get("/", response_model=List[Reservation])
def read_reservations(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    query = db.query(
        models.Reservation, 
        models.Room.room_number
    ).join(
        models.Room, 
        models.Reservation.room_id == models.Room.id
    )
    
    if current_user.role == "manager":
        result = query.offset(skip).limit(limit).all()
    else:
        result = query.filter(
            models.Reservation.user_id == current_user.id
        ).offset(skip).limit(limit).all()
    
    # Add room_number to each reservation
    reservations = []
    for reservation, room_number in result:
        reservation_dict = {
            "id": reservation.id,
            "room_id": reservation.room_id,
            "user_id": reservation.user_id,
            "guest_name": reservation.guest_name,
            "guest_document": reservation.guest_document,
            "price": reservation.price,
            "arrival_date": reservation.arrival_date,
            "departure_date": reservation.departure_date,
            "num_guests": reservation.num_guests,
            "payment_method": reservation.payment_method,
            "pension_type": reservation.pension_type,
            "cancellation_option": reservation.cancellation_option,
            "status": reservation.status,
            "room_number": room_number
        }
        reservations.append(reservation_dict)
    
    return reservations

@router.get("/{reservation_id}", response_model=Reservation)
def read_reservation(
    reservation_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    result = db.query(
        models.Reservation,
        models.Room.room_number
    ).join(
        models.Room,
        models.Reservation.room_id == models.Room.id
    ).filter(
        models.Reservation.id == reservation_id
    ).first()
    
    if result is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    reservation, room_number = result
    
    if current_user.role != "manager" and reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Add room_number to reservation
    reservation.room_number = room_number
    
    return reservation

@router.put("/{reservation_id}/cancel")
def cancel_reservation(
    reservation_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if current_user.role != "manager" and reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    reservation.status = "cancelled"
    db.commit()
    return {"message": "Reservation cancelled successfully"}

@router.delete("/{reservation_id}")
def delete_reservation(
    reservation_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(reservation)
    db.commit()
    return {"message": "Reservation deleted successfully"}

@router.put("/{reservation_id}", response_model=Reservation)
def update_reservation(
    reservation_id: int,
    reservation_update: ReservationBase,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    # Check if reservation exists
    db_reservation = db.query(models.Reservation).filter(models.Reservation.id == reservation_id).first()
    if db_reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Check permissions - only managers can update any reservation
    if current_user.role != "manager" and db_reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update reservation fields
    for key, value in reservation_update.dict().items():
        setattr(db_reservation, key, value)
    
    db.commit()
    db.refresh(db_reservation)
    
    # Fetch the room_number for the updated reservation
    room = db.query(models.Room).filter(models.Room.id == db_reservation.room_id).first()
    if room:
        db_reservation.room_number = room.room_number
    
    return db_reservation 