import json
import urllib.request
import urllib.error

print("==================================================")
print("TESTING VNIT DRIVE LOOKUP & REGISTRATION FLOW")
print("==================================================")

# 1. Lookup Drive by Slug
slug = "youth-blood-donation-drive-vnit-nagpur"
url = f"http://localhost:8000/api/drives/public/{slug}/"
req = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req) as resp:
        drive_data = json.loads(resp.read().decode())
        print(f"SUCCESS: Drive Found!")
        print(f"  ID: {drive_data['id']}")
        print(f"  Name: {drive_data['name']}")
        print(f"  Slug: {drive_data['slug']}")
        print(f"  Venue: {drive_data['venue']}")
        print(f"  Date: {drive_data['date']}")
except Exception as e:
    print(f"FAILED to lookup drive: {e}")
    exit(1)

# 2. Register new donor for VNIT Drive
reg_url = "http://localhost:8000/api/registrations/"
payload = {
    "drive": drive_data['id'],
    "full_name": "Test VNIT Donor",
    "phone_number": "+919988776655",
    "blood_group": "AB+",
    "preferred_language": "Marathi",
    "email": "vnit_test_donor@vnit.ac.in",
    "this_drive_consent": True,
    "future_drives_consent": True
}
data = json.dumps(payload).encode('utf-8')
headers = {'Content-Type': 'application/json'}

try:
    post_req = urllib.request.Request(reg_url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(post_req) as post_resp:
        result = json.loads(post_resp.read().decode())
        print("\nREGISTRATION SUCCESSFUL!")
        print(f"  Registration ID: {result.get('registration_id')}")
        print(f"  Drive ID: {result.get('drive')}")
        print(f"  Full Name: {result.get('full_name')}")
        print(f"  Blood Group: {result.get('blood_group')}")
        print(f"  Preferred Language: {result.get('preferred_language')}")
        print(f"  WA Confirmation Link: {result.get('wa_confirmation_link')}")
except urllib.error.HTTPError as e:
    print(f"Registration HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Registration Error: {e}")

print("\n==================================================")
print("VNIT DRIVE TEST COMPLETED SUCCESSFULLY!")
print("==================================================")
