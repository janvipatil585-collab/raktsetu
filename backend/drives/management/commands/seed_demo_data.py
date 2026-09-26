import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from accounts.models import User
from drives.models import Drive, UserDriveRole
from registrants.models import Registrant, ConsentRecord, TurnoutPrediction, AttendanceRecord
from registrants.predictions import compute_turnout_score
from communications.models import CommunicationLog
from audit.models import AuditLogEntry

fake = Faker('en_IN')

class Command(BaseCommand):
    help = 'Seed demo data for RaktSetu Blood Donation Platform'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Clearing old demo data..."))
        AuditLogEntry.objects.all().delete()
        CommunicationLog.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        TurnoutPrediction.objects.all().delete()
        ConsentRecord.objects.all().delete()
        Registrant.objects.all().delete()
        UserDriveRole.objects.all().delete()
        Drive.objects.all().delete()
        User.objects.all().delete()

        password = "demo1234"

        self.stdout.write(self.style.SUCCESS("Creating Users..."))

        # 1. Admin
        admin_user = User.objects.create_superuser(
            username="admin@raktsetu.org",
            email="admin@raktsetu.org",
            password=password,
            first_name="Rajesh",
            last_name="Sharma",
            role="admin",
            phone="+919876543210",
            institution="RaktSetu National Network",
            is_active=True
        )

        # 2. Organizer 1 - St. Vincent Pallotti — Nagpur
        org1_user = User.objects.create_user(
            username="organizer.pallotti@raktsetu.org",
            email="organizer.pallotti@raktsetu.org",
            password=password,
            first_name="Father",
            last_name="Paul",
            role="organizer",
            phone="+919876543211",
            institution="St. Vincent Pallotti — Nagpur",
            is_active=True
        )

        # 3. Organizer 2 - VNIT Nagpur
        org2_user = User.objects.create_user(
            username="organizer.vnit@raktsetu.org",
            email="organizer.vnit@raktsetu.org",
            password=password,
            first_name="Dr. Amit",
            last_name="Deshmukh",
            role="organizer",
            phone="+919876543212",
            institution="VNIT — Nagpur",
            is_active=True
        )

        # 4. Volunteer 1 - Janvi Patil
        vol1_user = User.objects.create_user(
            username="janvi.patil@raktsetu.org",
            email="janvi.patil@raktsetu.org",
            password=password,
            first_name="Janvi",
            last_name="Patil",
            role="volunteer",
            phone="+918668233176",
            institution="St. Vincent Pallotti — Nagpur",
            is_active=True
        )

        # 5. Volunteer 2 - Priya Kakuste
        vol2_user = User.objects.create_user(
            username="priya.kakuste@raktsetu.org",
            email="priya.kakuste@raktsetu.org",
            password=password,
            first_name="Priya",
            last_name="Kakuste",
            role="volunteer",
            phone="+919673614569",
            institution="VNIT — Nagpur",
            is_active=True
        )

        self.stdout.write(self.style.SUCCESS("Creating Drives..."))

        today = timezone.now().date()

        # Drive 1: Active Primary Drive
        drive_active = Drive.objects.create(
            name="Blood Donation Drive — St. Vincent Pallotti, Nagpur",
            institution="St. Vincent Pallotti — Nagpur",
            date=today,
            venue="Pallotti Campus Main Auditorium, Wardha Road, Nagpur",
            target_count=60,
            screening_info_url="https://stpallotti.edu.in/blood-drive-guidelines",
            status="active",
            created_by=org1_user
        )

        # Drive 2: Upcoming Drive
        drive_upcoming = Drive.objects.create(
            name="Youth Blood Donation Drive — VNIT Nagpur",
            institution="VNIT — Nagpur",
            date=today + timedelta(days=5),
            venue="VNIT Student Activity Centre Hall B",
            target_count=40,
            screening_info_url="https://vnit.ac.in/blood-drive-info",
            status="upcoming",
            created_by=org2_user
        )

        # Drive 3: Completed Drive
        drive_completed = Drive.objects.create(
            name="Nagpur Community Blood Mobilization Drive",
            institution="City NGO Forum — Nagpur",
            date=today - timedelta(days=25),
            venue="Reshimbagh Ground Pavilion, Nagpur",
            target_count=50,
            screening_info_url="https://nagpur.gov.in/blood-donor-rules",
            status="completed",
            created_by=admin_user
        )

        # Scoped Drive Roles
        UserDriveRole.objects.create(user=org1_user, drive=drive_active, role='organizer')
        UserDriveRole.objects.create(user=vol1_user, drive=drive_active, role='volunteer')

        UserDriveRole.objects.create(user=org2_user, drive=drive_upcoming, role='organizer')
        UserDriveRole.objects.create(user=vol2_user, drive=drive_upcoming, role='volunteer')

        languages = ['English', 'Hindi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Other']
        blood_groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

        # Seed Registrants for Completed Drive (25 registrants)
        self.stdout.write("Seeding 25 registrants for Completed drive...")
        completed_phones = []
        for i in range(25):
            phone = f"+9198000{1000 + i}"
            completed_phones.append(phone)
            r = Registrant.objects.create(
                drive=drive_completed,
                full_name=fake.name(),
                phone_number=phone,
                whatsapp_number=phone,
                blood_group=random.choice(blood_groups),
                preferred_language=random.choice(languages),
                email=fake.email(),
                registered_by=admin_user,
                reminder_status='Sent' if i < 18 else 'Not Sent'
            )
            ConsentRecord.objects.create(registrant=r, consent_type='this_drive', is_granted=True, granted_at=timezone.now())
            ConsentRecord.objects.create(registrant=r, consent_type='future_drives', is_granted=True, granted_at=timezone.now())
            
            att_status = 'attended' if i < 18 else 'no_show'
            AttendanceRecord.objects.create(
                registrant=r,
                checked_in_by=admin_user if att_status == 'attended' else None,
                checked_in_at=timezone.now() - timedelta(days=25) if att_status == 'attended' else None,
                status=att_status
            )
            compute_turnout_score(r)

        # Seed Registrants for Active Drive (30 registrants)
        self.stdout.write("Seeding 30 registrants for Active drive...")
        for i in range(30):
            if i < 4:
                phone = completed_phones[i]
            else:
                phone = f"+9198111{2000 + i}"

            name = fake.name()
            lang = languages[i % len(languages)]
            bg = blood_groups[i % len(blood_groups)]
            rem_stat = 'Sent' if i < 12 else 'Not Sent'

            r = Registrant.objects.create(
                drive=drive_active,
                full_name=name,
                phone_number=phone,
                whatsapp_number=phone,
                blood_group=bg,
                preferred_language=lang,
                email=f"donor{i+1}@gmail.com",
                registered_by=vol1_user if i % 3 == 0 else None,
                reminder_status=rem_stat,
                reminder_sent_at=timezone.now() if rem_stat == 'Sent' else None,
                reminder_sent_by=org1_user if rem_stat == 'Sent' else None
            )

            this_drive_consent = False if i in [5, 12] else True
            future_drives_consent = False if i in [3, 8, 15, 5, 12] else True

            ConsentRecord.objects.create(
                registrant=r,
                consent_type='this_drive',
                is_granted=this_drive_consent,
                granted_at=timezone.now() if this_drive_consent else None,
                revoked_at=timezone.now() if not this_drive_consent else None
            )
            ConsentRecord.objects.create(
                registrant=r,
                consent_type='future_drives',
                is_granted=future_drives_consent,
                granted_at=timezone.now() if future_drives_consent else None,
                revoked_at=timezone.now() if not future_drives_consent else None
            )

            att_status = 'attended' if i < 8 else 'predicted'
            AttendanceRecord.objects.create(
                registrant=r,
                checked_in_by=vol1_user if i < 8 else None,
                checked_in_at=timezone.now() if i < 8 else None,
                status=att_status
            )

            if i % 2 == 0:
                CommunicationLog.objects.create(
                    registrant=r,
                    message_type='confirmation' if i % 4 == 0 else 'reminder',
                    channel='whatsapp_manual',
                    content_sent=f"Hello {name}, reminder for Blood Drive at Pallotti.",
                    language=lang,
                    sent_by=org1_user
                )

            compute_turnout_score(r)

            # Audit Logs
            from audit.models import log_audit_event
            log_audit_event(
                action_type="REGISTRATION_CREATED",
                entity_type="Registrant",
                entity_id=r.registration_id,
                actor_name=r.full_name,
                actor_role="Registrant",
                drive=drive_active,
                details={
                    'description': f"New registrant {r.full_name} registered for {drive_active.name}.",
                    'registration_id': r.registration_id,
                    'full_name': r.full_name,
                    'language': lang
                }
            )

            if this_drive_consent:
                log_audit_event(
                    action_type="CONSENT_GRANTED",
                    entity_type="ConsentRecord",
                    entity_id=r.registration_id,
                    actor_name=r.full_name,
                    actor_role="Registrant",
                    drive=drive_active,
                    details={'description': "WhatsApp communication consent granted during registration."}
                )

            if rem_stat == 'Sent':
                log_audit_event(
                    action_type="REMINDER_SENT",
                    entity_type="Registrant",
                    entity_id=r.registration_id,
                    actor=org1_user,
                    actor_name="Father Paul",
                    actor_role="Organizer",
                    drive=drive_active,
                    details={'description': f"{lang} WhatsApp reminder sent to {r.full_name}."}
                )

            if att_status == 'attended':
                log_audit_event(
                    action_type="ATTENDANCE_MARKED",
                    entity_type="Registrant",
                    entity_id=r.registration_id,
                    actor=vol1_user,
                    actor_name="Janvi Patil",
                    actor_role="Volunteer",
                    drive=drive_active,
                    details={'description': f"Attendance status changed from Expected to Attended for {r.full_name}."}
                )

        # Seed Registrants for Upcoming Drive (15 registrants)
        self.stdout.write("Seeding 15 registrants for Upcoming drive...")
        for i in range(15):
            r = Registrant.objects.create(
                drive=drive_upcoming,
                full_name=fake.name(),
                phone_number=f"+9198222{3000 + i}",
                blood_group=blood_groups[i % len(blood_groups)],
                preferred_language=languages[i % len(languages)],
                email=f"vnit_donor{i+1}@vnit.ac.in",
                registered_by=None
            )
            ConsentRecord.objects.create(registrant=r, consent_type='this_drive', is_granted=True, granted_at=timezone.now())
            ConsentRecord.objects.create(registrant=r, consent_type='future_drives', is_granted=True, granted_at=timezone.now())
            AttendanceRecord.objects.create(registrant=r, status='predicted')
            compute_turnout_score(r)

            log_audit_event(
                action_type="REGISTRATION_CREATED",
                entity_type="Registrant",
                entity_id=r.registration_id,
                actor_name=r.full_name,
                actor_role="Registrant",
                drive=drive_upcoming,
                details={'description': f"New registrant {r.full_name} registered for {drive_upcoming.name}."}
            )

        self.stdout.write(self.style.SUCCESS("=================================================="))
        self.stdout.write(self.style.SUCCESS("DEMO DATA SEEDED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("=================================================="))
        self.stdout.write(self.style.SUCCESS(f"Demo Password for all accounts: {password}\n"))
        self.stdout.write(self.style.SUCCESS("Available Demo Accounts:"))
        self.stdout.write(f"1. ADMIN:      admin@raktsetu.org (Phone: {admin_user.phone})")
        self.stdout.write(f"2. ORGANIZER 1: organizer.pallotti@raktsetu.org (Phone: {org1_user.phone})")
        self.stdout.write(f"3. ORGANIZER 2: organizer.vnit@raktsetu.org (Phone: {org2_user.phone})")
        self.stdout.write(f"4. VOLUNTEER 1: janvi.patil@raktsetu.org (Phone: {vol1_user.phone})")
        self.stdout.write(f"5. VOLUNTEER 2: priya.kakuste@raktsetu.org (Phone: {vol2_user.phone})")
        self.stdout.write(self.style.SUCCESS("=================================================="))
