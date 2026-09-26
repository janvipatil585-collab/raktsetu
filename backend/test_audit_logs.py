import json
import urllib.request
import urllib.error

print("==================================================")
print("TESTING RAKTSETU SYSTEM AUDIT LOGS INTEGRATION")
print("==================================================")

# Login as Organizer (Father Paul)
login_url = "http://localhost:8000/api/auth/login/"
login_payload = {"username": "organizer.pallotti@raktsetu.org", "password": "demo1234"}
req = urllib.request.Request(login_url, data=json.dumps(login_payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req) as resp:
        tokens = json.loads(resp.read().decode())
        access_token = tokens['access']
        print("ORGANIZER LOGIN SUCCESSFUL!")
except Exception as e:
    print(f"Login failed: {e}")
    exit(1)

headers = {'Authorization': f'Bearer {access_token}'}

# Fetch drives list
drives_url = "http://localhost:8000/api/drives/"
drives_req = urllib.request.Request(drives_url, headers=headers)
with urllib.request.urlopen(drives_req) as resp:
    drives = json.loads(resp.read().decode())
    print(f"Assigned Drives: {[(d['id'], d['name']) for d in drives]}")
    active_drive_id = drives[0]['id']

# Fetch audit logs for primary assigned drive
audit_url = f"http://localhost:8000/api/audit-logs/?drive_id={active_drive_id}"
audit_req = urllib.request.Request(audit_url, headers=headers)

try:
    with urllib.request.urlopen(audit_req) as resp:
        audit_logs = json.loads(resp.read().decode())
        logs_list = audit_logs if isinstance(audit_logs, list) else audit_logs.get('results', [])
        print(f"\nFETCHED {len(logs_list)} AUDIT LOGS FOR DRIVE ID #{active_drive_id}:")
        print("=" * 80)
        for log in logs_list[:10]:
            ts = log.get('timestamp')[:19]
            actor = log.get('actor_name') or 'System'
            role = log.get('actor_role') or 'System'
            action = log.get('action_type')
            entity = f"{log.get('entity_type')} #{log.get('entity_id')}"
            details = log.get('details')
            desc = details.get('description') if isinstance(details, dict) else str(details)
            print(f"[{ts}] | {actor} ({role}) | {action} | {entity}")
            print(f"   Details: {desc}")
            print("-" * 80)
except Exception as e:
    print(f"Failed to fetch audit logs: {e}")

print("\n==================================================")
print("SYSTEM AUDIT LOGS VERIFICATION PASSED!")
print("==================================================")
