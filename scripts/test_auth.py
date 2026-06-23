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

def run_tests():
    print("[RUN] Starting Security & Role-Based Access Control Tests...\n")
    
    # 1. Test Health endpoint (should be public)
    code, res = make_request("/api/health")
    if code == 200:
        print("PASS: /api/health is accessible without authentication.")
    else:
        print(f"FAIL: /api/health returned status {code}: {res}")
        sys.exit(1)
        
    # 2. Test accessing protected endpoint without token
    code, res = make_request("/api/early-warning-system")
    if code == 401:
        print("PASS: Accessing protected endpoint without token returns 401 Unauthorized.")
    else:
        print(f"FAIL: Expected 401 for unauthorized access, got {code}: {res}")
        sys.exit(1)

    # 3. Test accessing protected endpoint with invalid token
    code, res = make_request("/api/early-warning-system", headers={"Authorization": "Bearer invalid_token_123"})
    if code == 401:
        print("PASS: Accessing protected endpoint with invalid token returns 401 Unauthorized.")
    else:
        print(f"FAIL: Expected 401 for invalid token, got {code}: {res}")
        sys.exit(1)

    # 4. Test login with incorrect credentials
    code, res = make_request("/api/auth/login", method="POST", data={"username": "acp", "password": "wrongpassword"})
    if code == 400:
        print("PASS: Login with incorrect credentials returns 400 Bad Request.")
    else:
        print(f"FAIL: Expected 400 for incorrect login, got {code}: {res}")
        sys.exit(1)

    # 5. Perform valid logins and obtain tokens for different roles
    roles = ["acp", "si", "constable", "scout"]
    tokens = {}
    
    for role in roles:
        code, res = make_request("/api/auth/login", method="POST", data={"username": role, "password": role})
        if code == 200 and "token" in res and res["role"] == role:
            print(f"PASS: Successful login for user '{role}' ({res['full_name']}) returns token.")
            tokens[role] = res["token"]
        else:
            print(f"FAIL: Login failed for user '{role}' with status {code}: {res}")
            sys.exit(1)

    print("\n[AUTH] Testing Authorization & Role Guards...\n")

    # 6. Test ACP-only endpoint (/api/early-warning-system)
    # Constable should get 403 Forbidden
    code, res = make_request("/api/early-warning-system", headers={"Authorization": f"Bearer {tokens['constable']}"})
    if code == 403:
        print("PASS: Constable is blocked from ACP-only endpoint (403 Forbidden).")
    else:
        print(f"FAIL: Expected 403 for Constable accessing ACP-only endpoint, got {code}: {res}")
        sys.exit(1)
        
    # SI should get 403 Forbidden
    code, res = make_request("/api/early-warning-system", headers={"Authorization": f"Bearer {tokens['si']}"})
    if code == 403:
        print("PASS: Sub-Inspector is blocked from ACP-only endpoint (403 Forbidden).")
    else:
        print(f"FAIL: Expected 403 for SI accessing ACP-only endpoint, got {code}: {res}")
        sys.exit(1)

    # ACP should succeed (200 OK)
    code, res = make_request("/api/early-warning-system", headers={"Authorization": f"Bearer {tokens['acp']}"})
    if code == 200:
        print("PASS: ACP successfully accesses ACP-only endpoint.")
    else:
        print(f"FAIL: ACP failed to access ACP-only endpoint with status {code}: {res}")
        sys.exit(1)

    # 7. Test SI-or-ACP endpoint (/api/dispatch)
    # Constable should get 403 Forbidden
    code, res = make_request("/api/dispatch", headers={"Authorization": f"Bearer {tokens['constable']}"})
    if code == 403:
        print("PASS: Constable is blocked from SI-or-ACP endpoint (403 Forbidden).")
    else:
        print(f"FAIL: Expected 403 for Constable accessing SI-or-ACP endpoint, got {code}: {res}")
        sys.exit(1)

    # SI should succeed (200 OK)
    code, res = make_request("/api/dispatch", headers={"Authorization": f"Bearer {tokens['si']}"})
    if code == 200:
        print("PASS: Sub-Inspector successfully accesses SI-or-ACP endpoint.")
    else:
        print(f"FAIL: SI failed to access SI-or-ACP endpoint with status {code}: {res}")
        sys.exit(1)

    # 8. Test general police endpoint (/api/overview)
    # Scout should get 403 Forbidden (restricted from general police metrics)
    code, res = make_request("/api/overview", headers={"Authorization": f"Bearer {tokens['scout']}"})
    if code == 403:
        print("PASS: Scout is blocked from general Police endpoint (403 Forbidden).")
    else:
        print(f"FAIL: Expected 403 for Scout accessing Police endpoint, got {code}: {res}")
        sys.exit(1)

    # Constable should succeed (200 OK)
    code, res = make_request("/api/overview", headers={"Authorization": f"Bearer {tokens['constable']}"})
    if code == 200:
        print("PASS: Constable successfully accesses general Police endpoint.")
    else:
        print(f"FAIL: Constable failed to access Police endpoint with status {code}: {res}")
        sys.exit(1)

    # 9. Test Scout endpoint (/api/flipkart-scouts/leaderboard)
    # Scout should succeed (200 OK)
    code, res = make_request("/api/flipkart-scouts/leaderboard", headers={"Authorization": f"Bearer {tokens['scout']}"})
    if code == 200:
        print("PASS: Scout successfully accesses Scout leaderboard endpoint.")
    else:
        print(f"FAIL: Scout failed to access leaderboard with status {code}: {res}")
        sys.exit(1)

    # 10. Test Logout
    code, res = make_request("/api/auth/logout", method="POST", headers={"Authorization": f"Bearer {tokens['acp']}"})
    if code == 200:
        print("PASS: Logout endpoint revokes token successfully.")
    else:
        print(f"FAIL: Logout failed with status {code}: {res}")
        sys.exit(1)

    # Accessing after logout should fail
    code, res = make_request("/api/early-warning-system", headers={"Authorization": f"Bearer {tokens['acp']}"})
    if code == 401:
        print("PASS: Revoked token can no longer access protected endpoints.")
    else:
        print(f"FAIL: Expected 401 for revoked token, got {code}: {res}")
        sys.exit(1)

    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY! Security setup is robust and ready for deployment.")

if __name__ == "__main__":
    run_tests()
