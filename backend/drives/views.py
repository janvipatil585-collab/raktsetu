import io
import qrcode
from django.http import HttpResponse, Http404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.utils import timezone

from .models import Drive, UserDriveRole
from .serializers import DriveSerializer, UserDriveRoleSerializer
from .permissions import IsDriveAdminOrOrganizer, IsDriveVolunteerOrHigher, IsGlobalAdmin
from registrants.models import Registrant, AttendanceRecord, TurnoutPrediction, ConsentRecord
from registrants.serializers import OrganizerRegistrantSerializer, VolunteerRegistrantSerializer
from communications.models import CommunicationLog
from audit.models import AuditLogEntry
from audit.serializers import AuditLogEntrySerializer

class DriveViewSet(viewsets.ModelViewSet):
    queryset = Drive.objects.all().order_by('-date')
    serializer_class = DriveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Drive.objects.all().order_by('-date')
        assigned_drive_ids = UserDriveRole.objects.filter(user=user).values_list('drive_id', flat=True)
        return Drive.objects.filter(Q(created_by=user) | Q(id__in=assigned_drive_ids)).distinct().order_by('-date')

    def perform_create(self, serializer):
        drive = serializer.save(created_by=self.request.user)
        UserDriveRole.objects.create(user=self.request.user, drive=drive, role=self.request.user.role)

    @action(detail=False, methods=['get'], url_path='public_by_slug', permission_classes=[permissions.AllowAny])
    def public_by_slug_query(self, request):
        slug = request.query_params.get('slug')
        if not slug:
            raise Http404("Slug query parameter required")
        try:
            drive = Drive.objects.get(slug=slug)
            return Response(DriveSerializer(drive).data)
        except Drive.DoesNotExist:
            raise Http404("Drive not found")

    @action(detail=False, methods=['get'], url_path=r'public/(?P<slug>[^/.]+)', permission_classes=[permissions.AllowAny])
    def public_by_slug(self, request, slug=None):
        if not slug:
            slug = request.query_params.get('slug')
        try:
            drive = Drive.objects.get(slug=slug)
            return Response(DriveSerializer(drive).data)
        except Drive.DoesNotExist:
            raise Http404("Drive not found")

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def qr(self, request, pk=None):
        drive = self.get_object()
        register_url = f"{request.scheme}://{request.get_host().split(':')[0]}:3000/register/{drive.slug}"
        
        img = qrcode.make(register_url)
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return HttpResponse(buffer.getvalue(), content_type='image/png')

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def registrants(self, request, pk=None):
        drive = self.get_object()
        user = request.user
        role_param = request.query_params.get('role_view')

        user_role = user.role
        if user_role != 'admin':
            udr = UserDriveRole.objects.filter(user=user, drive=drive).first()
            if udr:
                user_role = udr.role

        if role_param == 'volunteer' or user_role == 'volunteer':
            registrants = drive.registrants.all().order_by('full_name')
            serializer = VolunteerRegistrantSerializer(registrants, many=True)
            return Response(serializer.data)
        else:
            registrants = drive.registrants.all().select_related('turnout_prediction', 'attendance_record').prefetch_related('consent_records', 'communication_logs').order_by('-registered_at')
            serializer = OrganizerRegistrantSerializer(registrants, many=True)
            return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def dashboard(self, request, pk=None):
        drive = self.get_object()
        user = request.user

        registrants = drive.registrants.all()
        total_registrations = registrants.count()

        actual_attended = AttendanceRecord.objects.filter(registrant__drive=drive, status='attended').count()
        expected_count = max(0, total_registrations - actual_attended)

        reminders_sent = registrants.filter(reminder_status='Sent').count()
        reminders_pending = registrants.exclude(reminder_status='Sent').count()

        confirmed_count = CommunicationLog.objects.filter(
            registrant__drive=drive,
            message_type='confirmation'
        ).values('registrant').distinct().count()

        pending_count = total_registrations - confirmed_count

        high_pred = TurnoutPrediction.objects.filter(registrant__drive=drive, score_label='high').count()
        med_pred = TurnoutPrediction.objects.filter(registrant__drive=drive, score_label='medium').count()
        predicted_count = high_pred + med_pred

        lang_counts = registrants.values('preferred_language').annotate(count=Count('id')).order_by('-count')
        language_breakdown = [
            {'language': item['preferred_language'], 'count': item['count']}
            for item in lang_counts
        ]

        recent_logs = CommunicationLog.objects.filter(registrant__drive=drive).select_related('registrant', 'sent_by').order_by('-sent_at')[:8]
        activity_feed = [
            {
                'id': log.id,
                'message_type': log.message_type,
                'registrant_name': log.registrant.full_name,
                'channel': log.channel,
                'sent_at': log.sent_at,
                'sent_by': log.sent_by.username if log.sent_by else 'System'
            }
            for log in recent_logs
        ]

        return Response({
            'drive_id': drive.id,
            'drive_name': drive.name,
            'institution': drive.institution,
            'date': drive.date,
            'status': drive.status,
            'target_count': drive.target_count,
            'kpis': {
                'total_registrations': total_registrations,
                'total_registered': total_registrations,
                'confirmed_count': confirmed_count,
                'pending_count': pending_count,
                'predicted_attendance': predicted_count,
                'actual_attendance': actual_attended,
                'attended': actual_attended,
                'expected': expected_count,
                'reminders_sent': reminders_sent,
                'reminders_pending': reminders_pending,
            },
            'language_breakdown': language_breakdown,
            'activity_feed': activity_feed
        })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def main_dashboard(request):
    user = request.user

    if user.role == 'admin':
        total_drives = Drive.objects.count()
        total_registrants = Registrant.objects.count()
        total_attended = AttendanceRecord.objects.filter(status='attended').count()
        avg_score = TurnoutPrediction.objects.filter(score_label__in=['low', 'medium', 'high']).aggregate(Avg('score_value'))['score_value__avg'] or 0.0
        
        granted_consents = ConsentRecord.objects.filter(consent_type='this_drive', is_granted=True).count()
        total_consents = ConsentRecord.objects.filter(consent_type='this_drive').count()
        consent_rate = (granted_consents / total_consents * 100) if total_consents > 0 else 100.0

        drives = Drive.objects.all().order_by('-date')
        recent_audits = AuditLogEntry.objects.all().select_related('actor')[:10]

        return Response({
            'role': 'admin',
            'kpis': {
                'total_drives': total_drives,
                'total_registrants': total_registrants,
                'total_attended': total_attended,
                'avg_turnout_score': round(avg_score, 2),
                'consent_rate': round(consent_rate, 1)
            },
            'drives': DriveSerializer(drives, many=True).data,
            'recent_audits': AuditLogEntrySerializer(recent_audits, many=True).data
        })
    else:
        assigned_drives = Drive.objects.filter(Q(created_by=user) | Q(user_roles__user=user)).distinct().order_by('-date')
        primary_drive = assigned_drives.first()

        if not primary_drive:
            return Response({
                'role': user.role,
                'message': 'No assigned drives yet',
                'kpis': {'total_registrations': 0, 'actual_attendance': 0},
                'drives': []
            })

        from rest_framework.test import APIRequestFactory
        view = DriveViewSet.as_view({'get': 'dashboard'})
        return view(request._request, pk=primary_drive.id)
