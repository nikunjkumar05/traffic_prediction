import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the project root to the python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Force load the .env file
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

from src.realtime_alerts import ViolationAlertSystem

def test_dispatch():
    # Format the phone number (remove dashes)
    target_phone = "+919214775938".replace("-", "")
    
    alert = {
        'message': "🚨 *ClearLane Live Test*\n\nThis is an automated dispatch from the Gridlock 2.0 Command Center via Twilio Sandbox.\n\n✅ Integration: SUCCESS\n✅ Ready for Hackathon Demo."
    }
    
    print(f"Initializing ViolationAlertSystem...")
    engine = ViolationAlertSystem()
    
    print(f"Dispatching test payload to {target_phone}...")
    success = engine.send_via_whatsapp(alert, target_phone)
    
    if success:
        print("\n🎉 WhatsApp test completed successfully!")
    else:
        print("\n❌ WhatsApp test failed. Check the errors above.")

if __name__ == "__main__":
    test_dispatch()
