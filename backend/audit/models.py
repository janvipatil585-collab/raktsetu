from django.db import models
from django.conf import settings

class AuditLogEntry(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    actor_name = models.CharField(max_length=255, null=True, blank=True)
    actor_role = models.CharField(max_length=50, default='System')
    action_type = models.CharField(max_length=100) # e.g. REGISTRATION_CREATED, WHATSAPP_CONFIRMATION_SENT, REMINDER_SENT, ATTENDANCE_MARKED
    entity_type = models.CharField(max_length=100) # e.g. Registrant, Drive, CommunicationLog, User
    entity_id = models.CharField(max_length=100)
    drive = models.ForeignKey('drives.Drive', on_delete=models.CASCADE, null=True, blank=True, related_name='audit_logs')
    details = models.JSONField(default=dict)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        name = self.actor_name or (self.actor.username if self.actor else "System")
        return f"[{self.timestamp}] {name} ({self.actor_role}) -> {self.action_type} on {self.entity_type} #{self.entity_id}"

def log_audit_event(action_type, entity_type, entity_id, details, actor=None, actor_name=None, actor_role=None, drive=None, metadata=None):
    if actor and not actor_name:
        full = f"{actor.first_name} {actor.last_name}".strip()
        actor_name = full if full else actor.username
    if actor and not actor_role:
        actor_role = actor.role.capitalize() if hasattr(actor, 'role') else 'User'
    if not actor_name:
        actor_name = 'System'
    if not actor_role:
        actor_role = 'System'

    detail_obj = details if isinstance(details, dict) else {'description': str(details)}

    return AuditLogEntry.objects.create(
        actor=actor,
        actor_name=actor_name,
        actor_role=actor_role,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        drive=drive,
        details=detail_obj,
        metadata=metadata or {},
    )

