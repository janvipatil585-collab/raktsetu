from django.db.models.signals import post_save
from django.dispatch import receiver
from registrants.models import ConsentRecord, AttendanceRecord
from communications.models import CommunicationLog
from audit.models import AuditLogEntry
from registrants.predictions import compute_turnout_score

@receiver(post_save, sender=ConsentRecord)
def on_consent_saved(sender, instance, created, **kwargs):
    # Auto audit log
    action = "CONSENT_CREATED" if created else ("CONSENT_GRANTED" if instance.is_granted else "CONSENT_REVOKED")
    AuditLogEntry.objects.create(
        actor=None, # system/public or updated via view context
        action_type=action,
        entity_type="ConsentRecord",
        entity_id=str(instance.id),
        details={
            'registrant_id': instance.registrant.id,
            'registrant_name': instance.registrant.full_name,
            'consent_type': instance.consent_type,
            'is_granted': instance.is_granted
        }
    )
    # Trigger turnout score recomputation whenever consent changes
    try:
        compute_turnout_score(instance.registrant)
    except Exception:
        pass

@receiver(post_save, sender=AttendanceRecord)
def on_attendance_saved(sender, instance, created, **kwargs):
    action = "ATTENDANCE_CREATED" if created else f"ATTENDANCE_STATUS_{instance.status.upper()}"
    AuditLogEntry.objects.create(
        actor=instance.checked_in_by,
        action_type=action,
        entity_type="AttendanceRecord",
        entity_id=str(instance.id),
        details={
            'registrant_id': instance.registrant.id,
            'registrant_name': instance.registrant.full_name,
            'status': instance.status,
            'checked_in_at': instance.checked_in_at.isoformat() if instance.checked_in_at else None
        }
    )
    # Trigger turnout score recomputation live
    try:
        compute_turnout_score(instance.registrant)
    except Exception:
        pass

@receiver(post_save, sender=CommunicationLog)
def on_communication_saved(sender, instance, created, **kwargs):
    if created:
        AuditLogEntry.objects.create(
            actor=instance.sent_by,
            action_type=f"COMMUNICATION_{instance.message_type.upper()}_SENT",
            entity_type="CommunicationLog",
            entity_id=str(instance.id),
            details={
                'registrant_id': instance.registrant.id,
                'registrant_name': instance.registrant.full_name,
                'channel': instance.channel,
                'message_type': instance.message_type,
                'language': instance.language
            }
        )
        # Trigger turnout score recomputation live as new communication arrives
        try:
            compute_turnout_score(instance.registrant)
        except Exception:
            pass
