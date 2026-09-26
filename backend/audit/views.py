from django.db.models import Q
from rest_framework import viewsets, permissions
from .models import AuditLogEntry
from .serializers import AuditLogEntrySerializer
from drives.permissions import IsGlobalAdmin

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLogEntry.objects.all().select_related('actor', 'drive').order_by('-timestamp')
    serializer_class = AuditLogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Scoped drive isolation
        drive_id = self.request.query_params.get('drive_id') or self.request.query_params.get('drive')
        if drive_id:
            qs = qs.filter(drive_id=drive_id)
        elif user.role != 'admin':
            from drives.models import UserDriveRole
            assigned_drives = UserDriveRole.objects.filter(user=user).values_list('drive_id', flat=True)
            qs = qs.filter(drive_id__in=assigned_drives)

        action_type = self.request.query_params.get('action_type')
        actor_role = self.request.query_params.get('actor_role')
        search = self.request.query_params.get('search')

        if action_type and action_type != 'ALL':
            qs = qs.filter(action_type__iexact=action_type)
        if actor_role and actor_role != 'ALL':
            qs = qs.filter(actor_role__iexact=actor_role)
        if search:
            qs = qs.filter(
                Q(actor_name__icontains=search) |
                Q(action_type__icontains=search) |
                Q(entity_type__icontains=search) |
                Q(entity_id__icontains=search) |
                Q(details__icontains=search)
            )
        return qs

