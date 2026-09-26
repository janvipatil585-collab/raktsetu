from rest_framework import serializers
from .models import Registrant, ConsentRecord, TurnoutPrediction, AttendanceRecord
from communications.models import CommunicationLog
from audit.models import AuditLogEntry
from communications.personalization import generate_confirmation_message
from communications.whatsapp import build_wa_me_link
from django.utils import timezone

class ConsentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsentRecord
        fields = ['id', 'consent_type', 'is_granted', 'granted_at', 'revoked_at']

class TurnoutPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TurnoutPrediction
        fields = ['id', 'score_label', 'score_value', 'computed_at', 'signals_used']

class AttendanceRecordSerializer(serializers.ModelSerializer):
    checked_in_by_name = serializers.ReadOnlyField(source='checked_in_by.username')
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'status', 'checked_in_at', 'checked_in_by', 'checked_in_by_name']

class CommunicationLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.ReadOnlyField(source='sent_by.username')
    class Meta:
        model = CommunicationLog
        fields = ['id', 'message_type', 'channel', 'content_sent', 'language', 'sent_at', 'delivery_status', 'sent_by_name']

# Organizer / Admin view with full details
class OrganizerRegistrantSerializer(serializers.ModelSerializer):
    consent_records = ConsentRecordSerializer(many=True, read_only=True)
    turnout_prediction = TurnoutPredictionSerializer(read_only=True)
    attendance_record = AttendanceRecordSerializer(read_only=True)
    attendance_status = serializers.SerializerMethodField()
    communication_consent = serializers.ReadOnlyField()
    reminder_sent_by_name = serializers.ReadOnlyField(source='reminder_sent_by.username')
    latest_communication = serializers.SerializerMethodField()

    class Meta:
        model = Registrant
        fields = [
            'id', 'registration_id', 'drive', 'full_name', 'phone_number', 'whatsapp_number', 'blood_group',
            'preferred_language', 'email', 'registration_status', 'attendance_status',
            'confirmation_status', 'confirmation_sent_at',
            'reminder_status', 'reminder_sent_at', 'reminder_sent_by', 'reminder_sent_by_name',
            'communication_consent', 'registered_at',
            'consent_records', 'turnout_prediction', 'attendance_record',
            'latest_communication'
        ]

    def get_attendance_status(self, obj):
        if hasattr(obj, 'attendance_record') and obj.attendance_record:
            return obj.attendance_record.status
        return 'predicted'

    def get_latest_communication(self, obj):
        latest = obj.communication_logs.order_by('-sent_at').first()
        if latest:
            return CommunicationLogSerializer(latest).data
        return None

# Volunteer view with full authorized contact information for drive volunteers
class VolunteerRegistrantSerializer(serializers.ModelSerializer):
    attendance_status = serializers.SerializerMethodField()
    communication_consent = serializers.ReadOnlyField()
    reminder_sent_by_name = serializers.ReadOnlyField(source='reminder_sent_by.username')

    class Meta:
        model = Registrant
        fields = [
            'id', 'registration_id', 'drive', 'full_name', 'phone_number', 'whatsapp_number', 'blood_group',
            'preferred_language', 'registration_status', 'attendance_status',
            'confirmation_status', 'reminder_status', 'reminder_sent_at', 'reminder_sent_by_name',
            'communication_consent', 'registered_at'
        ]

    def get_attendance_status(self, obj):
        if hasattr(obj, 'attendance_record') and obj.attendance_record:
            return obj.attendance_record.status
        return 'predicted'

class PublicRegistrationSerializer(serializers.ModelSerializer):
    this_drive_consent = serializers.BooleanField(write_only=True, default=True)
    future_drives_consent = serializers.BooleanField(write_only=True, default=False)
    wa_confirmation_link = serializers.SerializerMethodField(read_only=True)
    confirmation_message = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Registrant
        fields = [
            'id', 'registration_id', 'drive', 'full_name', 'phone_number', 'whatsapp_number',
            'blood_group', 'preferred_language', 'email',
            'this_drive_consent', 'future_drives_consent',
            'wa_confirmation_link', 'confirmation_message'
        ]

    def validate(self, attrs):
        drive = attrs.get('drive')
        phone = attrs.get('phone_number')
        if drive and phone:
            existing = Registrant.objects.filter(drive=drive, phone_number=phone).exists()
            if existing:
                raise serializers.ValidationError({
                    'phone_number': "This WhatsApp number is already registered for this blood donation drive."
                })
        return attrs

    def create(self, validated_data):
        this_drive_consent = validated_data.pop('this_drive_consent', True)
        future_drives_consent = validated_data.pop('future_drives_consent', False)

        now = timezone.now()
        validated_data['confirmation_status'] = 'Sent'
        validated_data['confirmation_sent_at'] = now

        registrant = Registrant.objects.create(**validated_data)

        # Create Consent Records
        ConsentRecord.objects.create(
            registrant=registrant,
            consent_type='this_drive',
            is_granted=this_drive_consent,
            granted_at=now if this_drive_consent else None
        )
        ConsentRecord.objects.create(
            registrant=registrant,
            consent_type='future_drives',
            is_granted=future_drives_consent,
            granted_at=now if future_drives_consent else None
        )

        # Initialize Attendance Record
        AttendanceRecord.objects.create(
            registrant=registrant,
            status='predicted'
        )

        # Generate & Record Confirmation Message if consented
        conf_msg = generate_confirmation_message(registrant, registrant.drive)
        CommunicationLog.objects.create(
            registrant=registrant,
            message_type='confirmation',
            channel='whatsapp_manual',
            content_sent=conf_msg,
            language=registrant.preferred_language,
            delivery_status='sent'
        )

        # System Audit Logs
        from audit.models import log_audit_event

        log_audit_event(
            action_type="REGISTRATION_CREATED",
            entity_type="Registrant",
            entity_id=registrant.registration_id or str(registrant.id),
            actor_name=registrant.full_name,
            actor_role="Registrant",
            drive=registrant.drive,
            details={
                'description': f"New registrant {registrant.full_name} registered for {registrant.drive.name}.",
                'registration_id': registrant.registration_id,
                'full_name': registrant.full_name,
                'drive_name': registrant.drive.name,
                'language': registrant.preferred_language
            }
        )

        if this_drive_consent:
            log_audit_event(
                action_type="CONSENT_GRANTED",
                entity_type="ConsentRecord",
                entity_id=registrant.registration_id or str(registrant.id),
                actor_name=registrant.full_name,
                actor_role="Registrant",
                drive=registrant.drive,
                details={
                    'description': "WhatsApp communication consent granted during registration.",
                    'registrant': registrant.full_name
                }
            )

        log_audit_event(
            action_type="WHATSAPP_CONFIRMATION_SENT",
            entity_type="CommunicationLog",
            entity_id=registrant.registration_id or str(registrant.id),
            actor_name="System",
            actor_role="System",
            drive=registrant.drive,
            details={
                'description': f"{registrant.preferred_language} registration confirmation message generated & sent.",
                'registrant_name': registrant.full_name,
                'language': registrant.preferred_language
            }
        )

        # Compute initial turnout score
        from registrants.predictions import compute_turnout_score
        compute_turnout_score(registrant)

        return registrant

    def get_wa_confirmation_link(self, obj):
        conf_msg = generate_confirmation_message(obj, obj.drive)
        return build_wa_me_link(
            registrant_phone=obj.whatsapp_number or obj.phone_number,
            message_text=conf_msg,
            sender_name="RaktSetu Team",
            sender_phone="+91-RaktSetu"
        )

    def get_confirmation_message(self, obj):
        return generate_confirmation_message(obj, obj.drive)
