from rest_framework.permissions import BasePermission
from .models import UserDriveRole, Drive

class IsGlobalAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')

class IsDriveAdminOrOrganizer(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'admin':
            return True
        drive_id = view.kwargs.get('pk') or view.kwargs.get('drive_id') or request.query_params.get('drive') or request.data.get('drive')
        if not drive_id:
            # Allow list GET requests; querysets are filtered in viewset
            return True
        return UserDriveRole.objects.filter(user=request.user, drive_id=drive_id, role__in=['admin', 'organizer']).exists()

class IsDriveVolunteerOrHigher(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in ['admin', 'organizer']:
            return True
        # If volunteer, check if assigned to drive
        drive_id = view.kwargs.get('pk') or view.kwargs.get('drive_id') or request.query_params.get('drive')
        if not drive_id:
            return True
        return UserDriveRole.objects.filter(user=request.user, drive_id=drive_id).exists()
