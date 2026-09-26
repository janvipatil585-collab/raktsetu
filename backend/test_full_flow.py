import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from drives.models import Drive
from registrants.models import Registrant, ConsentRecord, AttendanceRecord
from communications.models import CommunicationLog
from audit.models import AuditLogEntry
from registrants.serializers import PublicRegistrationSerializer

drive = Drive.objects.filter(status='active').first()
print("ACTIVE DRIVE:", drive.name, "| ID:", drive.id, "| Slug:", drive.slug)

payload = {
    'drive': drive.id,
    'full_name': 'Rahul Patil',
    'phone_number': '+919876544332',
    'blood_group': 'B+',
    'preferred_language': 'Hindi',
    'this_drive_consent': True,
    'future_drives_consent': True
}

serializer = PublicRegistrationSerializer(data=payload)
if serializer.is_valid():
    reg = serializer.save()
    print("REGISTRATION SUCCESSFUL!")
    print("Registration ID:", reg.registration_id)
    print("Full Name:", reg.full_name)
    print("Phone Number:", reg.phone_number)
    print("Blood Group:", reg.blood_group)
    print("Preferred Language:", reg.preferred_language)
    print("WA Confirmation Link:", serializer.data.get('wa_confirmation_link'))
    print("Communication Log Count:", CommunicationLog.objects.filter(registrant=reg).count())
    print("Audit Log Count:", AuditLogEntry.objects.filter(entity_id=str(reg.id)).count())
else:
    print("DUPLICATE/VALIDATION PREVENTED:", serializer.errors)
