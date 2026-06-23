from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime

from backend.database import Base

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, index=True, nullable=True)
    vehicle_type = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_datetime = Column(DateTime, index=True)
    violation_type = Column(String, index=True, nullable=True)
    single_violation = Column(String, nullable=True)
    junction_name = Column(String, index=True, nullable=True)
    mapped_junction = Column(String, index=True, nullable=True)
    police_station = Column(String, index=True, nullable=True)
    
    # Computed in data pipeline
    hour = Column(Integer)
    day_of_week = Column(Integer)
    month = Column(Integer)
    duration_minutes = Column(Float)
    severity = Column(Integer)

    # Computed in congestion cost
    congestion_cost = Column(Float)
    gridlock_score = Column(Float)
    impact_tier = Column(String)
    vehicles_blocked_hr = Column(Float)
    economic_loss_inr = Column(Float)
    co2_kg = Column(Float)
    person_hours_blocked = Column(Float)
    
    # Evidence / Court
    image_url = Column(String, nullable=True)

class CameraJunction(Base):
    __tablename__ = "camera_junctions"
    
    id = Column(Integer, primary_key=True, index=True)
    junction_id = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    is_online = Column(Boolean, default=True)
    last_ping = Column(DateTime, nullable=True)

class FlipkartReport(Base):
    __tablename__ = "flipkart_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    scout_id = Column(String)
    junction = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    photo_url = Column(String)
    vehicle_number = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "acp", "si", "constable", "scout"
    full_name = Column(String, nullable=False)
    badge_number = Column(String, nullable=True)
    scout_id = Column(String, nullable=True)

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
