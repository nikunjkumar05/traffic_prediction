import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_request(path, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = e.reason
        return e.code, err_body
    except Exception as e:
        return 999, str(e)

def test_flow():
    print("[FLOW] Starting Flipkart Scout Report Verification Flow Test...\n")
    
    # 1. Login as Scout
    code, res = make_request("/api/auth/login", method="POST", data={"username": "scout", "password": "scout"})
    if code != 200:
        print(f"FAIL: Scout login failed: {res}")
        sys.exit(1)
    scout_token = res["token"]
    scout_id = res["scout_id"]
    print(f"PASS: Logged in as Scout '{scout_id}'.")
    
    # 2. Submit a parking report
    report_payload = {
        "scout_id": scout_id,
        "junction": "Silk Board",
        "latitude": 12.9176,
        "longitude": 77.6246,
        "photo_url": "evidence_pic.jpg",
        "vehicle_number": "KA01AB1234",
        "notes": "Blocking transit lane"
    }
    code, res = make_request("/api/flipkart-scouts/report", method="POST", headers={"Authorization": f"Bearer {scout_token}"}, data=report_payload)
    if code != 200:
        print(f"FAIL: Report submission failed: {res}")
        sys.exit(1)
    
    report_id = res["report_id"]
    print(f"PASS: Submitted report. Received ID: {report_id}, status: {res['status']}.")
    
    # 3. Check reports as Scout (should see only own report, status PENDING)
    code, res = make_request("/api/flipkart-scouts/reports", method="GET", headers={"Authorization": f"Bearer {scout_token}"})
    if code != 200:
        print(f"FAIL: Scout fetching reports failed: {res}")
        sys.exit(1)
        
    reports = res["reports"]
    matching_reports = [r for r in reports if r["report_id"] == report_id]
    if len(matching_reports) != 1:
        print(f"FAIL: Scout reports list did not contain submitted report ID {report_id}.")
        sys.exit(1)
        
    db_report_id = matching_reports[0]["id"]
    status = matching_reports[0]["status"]
    print(f"PASS: Scout report retrieved from DB. DB integer ID: {db_report_id}, status: {status}.")
    if status != "PENDING":
        print(f"FAIL: Expected PENDING status, got {status}")
        sys.exit(1)

    # 4. Login as SI
    code, res = make_request("/api/auth/login", method="POST", data={"username": "si", "password": "si"})
    if code != 200:
        print(f"FAIL: SI login failed: {res}")
        sys.exit(1)
    si_token = res["token"]
    print("PASS: Logged in as Sub-Inspector Nikunj Sharma.")

    # 5. SI Vets report (Approve)
    code, res = make_request(f"/api/flipkart-scouts/verify/{db_report_id}", method="POST", headers={"Authorization": f"Bearer {si_token}"}, data={"status": "APPROVED"})
    if code != 200:
        print(f"FAIL: SI verification failed: {res}")
        sys.exit(1)
    print("PASS: SI successfully approved the report.")

    # 6. Check report status as Scout again (should be APPROVED)
    code, res = make_request("/api/flipkart-scouts/reports", method="GET", headers={"Authorization": f"Bearer {scout_token}"})
    reports = res["reports"]
    matching_reports = [r for r in reports if r["report_id"] == report_id]
    status = matching_reports[0]["status"]
    print(f"PASS: Scout report status is now {status}.")
    if status != "APPROVED":
        print(f"FAIL: Expected status APPROVED, got {status}")
        sys.exit(1)

    # 7. Check leaderboard (approved report should count, awarding 50 coins)
    code, res = make_request("/api/flipkart-scouts/leaderboard", method="GET", headers={"Authorization": f"Bearer {scout_token}"})
    leaderboard = res["leaderboard"]
    matching_scout = [s for s in leaderboard if s["scout_id"] == scout_id]
    if len(matching_scout) != 1:
        print(f"FAIL: Scout '{scout_id}' not found on leaderboard after approval.")
        sys.exit(1)
    
    report_count = matching_scout[0]["report_count"]
    coins = matching_scout[0]["coins_earned"]
    print(f"PASS: Scout is on leaderboard with {report_count} approved report(s) and {coins} SuperCoins.")
    if coins != 50:
        print(f"FAIL: Expected 50 coins, got {coins}")
        sys.exit(1)

    print("\n[SUCCESS] ALL VERIFICATION FLOW TESTS PASSED!")

if __name__ == "__main__":
    test_flow()
