import os
import sys

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend.models import FlipkartReport, CameraJunction, Base

def reset_demo():
    print("[RESET] Initializing Gridlock 2.0 Demo Reset...")
    
    db = SessionLocal()
    try:
        # 1. Clear all Flipkart reports
        reports_deleted = db.query(FlipkartReport).delete()
        print(f"SUCCESS: Cleared {reports_deleted} Flipkart Scout reports.")
        
        # 2. Reset all cameras to ONLINE
        cameras = db.query(CameraJunction).all()
        for camera in cameras:
            camera.is_online = True
        print(f"SUCCESS: Reset {len(cameras)} Camera Junctions to ONLINE.")
        
        # Commit the changes
        db.commit()
        print("\nDemo reset successful. The database is clean and ready for the judges!")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR during reset: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_demo()
