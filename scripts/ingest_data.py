import os
import sys
import pandas as pd
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import engine, SessionLocal
from backend.models import Base, CameraJunction

def ingest_data():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    parquet_path = os.environ.get(
        "DISPATCHMIND_CACHE",
        "data/processed/dispatchmind_scored.parquet"
    )
    
    if not os.path.exists(parquet_path):
        print(f"Error: Could not find processed data at {parquet_path}")
        print("Please run the API once to generate the cache, or run data_pipeline.py directly.")
        return
        
    print(f"Loading data from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    
    print(f"Loaded {len(df)} rows. Mapping to database columns...")
    
    # Ensure created_datetime is proper datetime
    if "created_datetime" not in df.columns:
        date_col = "created_date" if "created_date" in df.columns else None
        if date_col:
            df["created_datetime"] = pd.to_datetime(df[date_col], errors="coerce")
        else:
            df["created_datetime"] = pd.Timestamp("2024-06-01 12:00:00")
            
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], errors="coerce")
    
    # Rename or drop columns to match model
    columns_to_keep = [
        "vehicle_number", "vehicle_type", "latitude", "longitude", 
        "created_datetime", "violation_type", "single_violation", 
        "junction_name", "mapped_junction", "police_station",
        "hour", "day_of_week", "month", "duration_minutes", "severity",
        "congestion_cost", "gridlock_score", "impact_tier", 
        "vehicles_blocked_hr", "economic_loss_inr", "co2_kg", "person_hours_blocked"
    ]
    
    # Fill missing columns with None/NaN if they don't exist
    for col in columns_to_keep:
        if col not in df.columns:
            if col == 'vehicle_number' and 'vehicle_no' in df.columns:
                df[col] = df['vehicle_no']
            else:
                df[col] = None
                
    df_sql = df[columns_to_keep].copy()
    
    print("Inserting violations into database (this may take a moment)...")
    # Drop all and recreate to ensure schema matches models.py
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Seed default users
    import hashlib
    import secrets
    def hash_password(password: str, salt: str) -> str:
        return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
    def generate_salt() -> str:
        return secrets.token_hex(16)
    def seed_default_users(db):
        from backend.models import User
        default_users = [
            {"username": "acp", "password": "acp", "role": "acp", "full_name": "ACP Sandeep Kumar", "badge_number": "BTP-ACP-001"},
            {"username": "si", "password": "si", "role": "si", "full_name": "SI Nikunj Sharma", "badge_number": "BTP-SI-104"},
            {"username": "constable", "password": "constable", "role": "constable", "full_name": "Constable Ramesh Gowda", "badge_number": "BTP-PC-982"},
            {"username": "scout", "password": "scout", "role": "scout", "full_name": "Scout Anil Kumar", "scout_id": "FK-SCOUT-77"},
        ]
        for u_info in default_users:
            existing = db.query(User).filter(User.username == u_info["username"]).first()
            if not existing:
                salt = generate_salt()
                hashed_pwd = hash_password(u_info["password"], salt)
                user = User(
                    username=u_info["username"],
                    hashed_password=hashed_pwd,
                    salt=salt,
                    role=u_info["role"],
                    full_name=u_info["full_name"],
                    badge_number=u_info.get("badge_number"),
                    scout_id=u_info.get("scout_id")
                )
                db.add(user)
        db.commit()
        print("OK: Seeded default users in database.")

    db_init = SessionLocal()
    try:
        seed_default_users(db_init)
    finally:
        db_init.close()
        
    # We don't include 'id' in df_sql so SQLite auto-increments it during append
    df_sql.to_sql("violations", con=engine, if_exists="append", index=False)
    
    print("Populating cameras table...")
    # Get unique mapped_junctions
    junctions = df_sql["mapped_junction"].dropna().unique()
    
    db = SessionLocal()
    try:
        # Clear existing
        db.query(CameraJunction).delete()
        
        cameras = []
        for j in junctions:
            if j == "No Junction" or j == "Unknown":
                continue
            # Find an approximate location for this junction from the data
            j_df = df_sql[df_sql["mapped_junction"] == j]
            if len(j_df) > 0:
                lat = j_df["latitude"].median()
                lon = j_df["longitude"].median()
                cameras.append(CameraJunction(
                    junction_id=j,
                    latitude=lat,
                    longitude=lon,
                    is_online=True
                ))
        
        db.add_all(cameras)
        db.commit()
        print(f"Inserted {len(cameras)} cameras into database.")
    except Exception as e:
        db.rollback()
        print(f"Error populating cameras: {e}")
    finally:
        db.close()
        
    print("Ingestion complete!")

if __name__ == "__main__":
    ingest_data()
