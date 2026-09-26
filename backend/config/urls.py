from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import CustomTokenObtainPairView
from drives.views import DriveViewSet, main_dashboard
from registrants.views import PublicRegistrationViewSet, RegistrantViewSet, send_bulk_reminders
from audit.views import AuditLogViewSet

router = DefaultRouter()
router.register(r'drives', DriveViewSet, basename='drives')
router.register(r'registrations', PublicRegistrationViewSet, basename='registrations')
router.register(r'registrants', RegistrantViewSet, basename='registrants')
router.register(r'audit-log', AuditLogViewSet, basename='audit-log')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Custom view actions
    path('api/dashboard/', main_dashboard, name='main_dashboard'),
    path('api/drives/<int:drive_id>/reminders/send-bulk/', send_bulk_reminders, name='send_bulk_reminders'),

    # Router endpoints
    path('api/', include(router.urls)),
]
