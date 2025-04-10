from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, database, auth
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/overview",
    tags=["overview"]
)

class RecentReservation(BaseModel):
    guest_name: str
    room_number: str
    check_in_date: datetime
    check_out_date: datetime
    status: str

    class Config:
        from_attributes = True

class OverviewData(BaseModel):
    total_rooms: int
    active_reservations: int
    total_users: int
    recent_reservations: List[RecentReservation]

@router.get("/", response_model=OverviewData)
async def get_overview(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get total rooms count
    total_rooms = db.query(func.count(models.Room.id)).scalar()
    
    # Get active reservations count (confirmed and not completed)
    active_reservations = db.query(func.count(models.Reservation.id)).filter(
        models.Reservation.status.in_(["confirmed", "pending"])
    ).scalar()
    
    # Get total users count
    total_users = db.query(func.count(models.User.id)).scalar()
    
    # Get recent reservations (last 5)
    recent_reservations_query = db.query(
        models.Reservation,
        models.Room.room_number
    ).join(
        models.Room, models.Reservation.room_id == models.Room.id
    ).order_by(
        models.Reservation.created_at.desc()
    ).limit(5).all()
    
    recent_reservations = []
    for reservation, room_number in recent_reservations_query:
        recent_reservations.append(
            RecentReservation(
                guest_name=reservation.guest_name,
                room_number=room_number,
                check_in_date=reservation.arrival_date,
                check_out_date=reservation.departure_date,
                status=reservation.status
            )
        )
    
    return OverviewData(
        total_rooms=total_rooms,
        active_reservations=active_reservations,
        total_users=total_users,
        recent_reservations=recent_reservations
    ) 