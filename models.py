from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DECIMAL, Enum, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class RoomCategory(Base):
    __tablename__ = "room_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    rooms = relationship("Room", back_populates="category")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("room_categories.id"))
    room_number = Column(String(10), unique=True, nullable=False)
    price = Column(DECIMAL(10,2), nullable=False)
    num_beds = Column(Integer, nullable=False)
    size = Column(String(20), nullable=False)
    cot_available = Column(Boolean, default=False)
    view_type = Column(Enum('beach', 'forest', 'city', 'garden', name='view_type'), nullable=False)
    has_tv = Column(Boolean, default=True)
    has_internet = Column(Boolean, default=True)
    has_minibar = Column(Boolean, default=True)
    description = Column(Text)
    image_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("RoomCategory", back_populates="rooms")
    reservations = relationship("Reservation", back_populates="room")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('guest', 'manager', name='user_role'), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    reservations = relationship("Reservation", back_populates="user")

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    guest_name = Column(String(100), nullable=False)
    guest_document = Column(String(50), nullable=False)
    price = Column(DECIMAL(10,2), nullable=False)
    arrival_date = Column(Date, nullable=False)
    departure_date = Column(Date, nullable=False)
    num_guests = Column(Integer, nullable=False)
    payment_method = Column(Enum('credit_card', 'debit_card', 'cash', 'bank_transfer', name='payment_method'), nullable=False)
    pension_type = Column(Enum('room_only', 'bed_and_breakfast', 'half_board', 'full_board', name='pension_type'), nullable=False)
    cancellation_option = Column(Boolean, default=False)
    status = Column(Enum('pending', 'confirmed', 'cancelled', 'completed', name='reservation_status'), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)

    room = relationship("Room", back_populates="reservations")
    user = relationship("User", back_populates="reservations") 