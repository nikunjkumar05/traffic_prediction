import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import SessionLocal
from backend.models import Violation, CameraJunction

db = SessionLocal()

print("Testing Database Models...")

# Test violations count
v_count = db.query(Violation).count()
print(f"Total violations in DB: {v_count}")

# Test camera count
c_count = db.query(CameraJunction).count()
print(f"Total cameras in DB: {c_count}")

# Test inserting a new violation via API mock
from backend.api import create_violation, ViolationIn
import asyncio

async def test_api():
    payload = ViolationIn(
        vehicle_number="KA01TE9999",
        vehicle_type="CAR",
        latitude=12.9716,
        longitude=77.5946,
        violation_type="WRONG PARKING",
        junction_name="BTP001",
        police_station="CUBBON PARK"
    )
    result = await create_violation(payload)
    print(f"API result: {result}")
    
    # Clean up
    if "violation_id" in result:
        vid = result["violation_id"]
        v = db.query(Violation).filter(Violation.id == vid).first()
        db.delete(v)
        db.commit()

asyncio.run(test_api())

db.close()
print("Tests passed successfully.")
