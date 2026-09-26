from rest_framework import serializers
from .models import AuditLogEntry

class AuditLogEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.SerializerMethodField()

    class Meta:
        model = AuditLogEntry
        fields = ['id', 'actor', 'actor_name', 'actor_role', 'action_type', 'entity_type', 'entity_id', 'drive', 'details', 'metadata', 'timestamp']

    def get_actor_name(self, obj):
        if obj.actor_name:
            return obj.actor_name
        if obj.actor:
            full = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
            return full if full else obj.actor.username
        return "System"

    def get_actor_role(self, obj):
        if obj.actor_role:
            return obj.actor_role
        if obj.actor and hasattr(obj.actor, 'role'):
            return obj.actor.role.capitalize()
        return "System"

