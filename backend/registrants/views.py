from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Registrant, ConsentRecord, TurnoutPrediction, AttendanceRecord
from .serializers import (
    PublicRegistrationSerializer, OrganizerRegistrantSerializer, VolunteerRegistrantSerializer,
    ConsentRecordSerializer, TurnoutPredictionSerializer, AttendanceRecordSerializer
)
from .consent import require_consent
from .predictions import compute_turnout_score
from communications.models import CommunicationLog
from communications.personalization import generate_message
from communications.whatsapp import build_wa_me_link
from drives.models import Drive

class PublicRegistrationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicRegistrationSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registrant = serializer.save()
        return Response(OrganizerRegistrantSerializer(registrant).data, status=status.HTTP_201_CREATED)


class RegistrantViewSet(viewsets.ModelViewSet):
    queryset = Registrant.objects.all()
    serializer_class = OrganizerRegistrantSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def checkin(self, request, pk=None):
        registrant = self.get_object()
        attendance, _ = AttendanceRecord.objects.get_or_create(registrant=registrant)
        
        attendance.status = 'attended'
        attendance.checked_in_by = request.user
        attendance.checked_in_at = timezone.now()
        attendance.save()

        from audit.models import log_audit_event
        log_audit_event(
            action_type="ATTENDANCE_MARKED",
            entity_type="Registrant",
            entity_id=registrant.registration_id or str(registrant.id),
            actor=request.user,
            drive=registrant.drive,
            details={
                'description': f"Attendance status changed from Expected to Attended for {registrant.full_name}.",
                'registrant_name': registrant.full_name,
                'checked_in_by': request.user.username
            }
        )

        return Response({
            'message': f"Registrant {registrant.full_name} checked in successfully!",
            'attendance': AttendanceRecordSerializer(attendance).data
        })

    @action(detail=True, methods=['get', 'patch'], permission_classes=[permissions.AllowAny])
    def consent(self, request, pk=None):
        registrant = get_object_or_404(Registrant, pk=pk)
        
        if request.method == 'GET':
            records = ConsentRecord.objects.filter(registrant=registrant)
            return Response(ConsentRecordSerializer(records, many=True).data)

        elif request.method == 'PATCH':
            this_drive = request.data.get('this_drive')
            future_drives = request.data.get('future_drives')

            now = timezone.now()
            updated_records = []

            if this_drive is not None:
                rec, _ = ConsentRecord.objects.get_or_create(registrant=registrant, consent_type='this_drive')
                rec.is_granted = bool(this_drive)
                if rec.is_granted:
                    rec.granted_at = now
                    rec.revoked_at = None
                else:
                    rec.revoked_at = now
                rec.save()
                updated_records.append(rec)

            if future_drives is not None:
                rec, _ = ConsentRecord.objects.get_or_create(registrant=registrant, consent_type='future_drives')
                rec.is_granted = bool(future_drives)
                if rec.is_granted:
                    rec.granted_at = now
                    rec.revoked_at = None
                else:
                    rec.revoked_at = now
                rec.save()
                updated_records.append(rec)

            compute_turnout_score(registrant)

            from audit.models import log_audit_event
            log_audit_event(
                action_type="CONSENT_UPDATED",
                entity_type="Registrant",
                entity_id=registrant.registration_id or str(registrant.id),
                actor=request.user if request.user and request.user.is_authenticated else None,
                actor_name=registrant.full_name if not (request.user and request.user.is_authenticated) else None,
                actor_role="Registrant" if not (request.user and request.user.is_authenticated) else None,
                drive=registrant.drive,
                details={
                    'description': f"WhatsApp communication consent updated for {registrant.full_name}.",
                    'this_drive': this_drive,
                    'future_drives': future_drives
                }
            )

            all_records = ConsentRecord.objects.filter(registrant=registrant)
            return Response({
                'message': 'Consent preferences updated successfully.',
                'consent_records': ConsentRecordSerializer(all_records, many=True).data
            })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def turnout(self, request, pk=None):
        registrant = self.get_object()
        prediction = compute_turnout_score(registrant)
        return Response(TurnoutPredictionSerializer(prediction).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def recompute_turnout(self, request, pk=None):
        registrant = self.get_object()
        prediction = compute_turnout_score(registrant)
        return Response(TurnoutPredictionSerializer(prediction).data)

    @action(detail=True, methods=['post'], url_path='send-reminder', permission_classes=[permissions.IsAuthenticated])
    def send_reminder(self, request, pk=None):
        registrant = self.get_object()

        # 1. Enforce consent at START of function
        require_consent(registrant, consent_type='this_drive')

        channel = request.data.get('channel', 'manual')
        custom_message = request.data.get('custom_message')

        # Generate or use custom message
        if custom_message and custom_message.strip():
            message_text = custom_message.strip()
        else:
            message_text = generate_message(registrant, registrant.drive, stage='reminder')

        sender_user = request.user
        log = CommunicationLog.objects.create(
            registrant=registrant,
            message_type='reminder',
            channel='whatsapp_manual' if channel == 'manual' else 'whatsapp_api',
            content_sent=message_text,
            language=registrant.preferred_language,
            delivery_status='sent',
            sent_by=sender_user
        )

        # Update registrant reminder status
        registrant.reminder_status = 'Sent'
        registrant.reminder_sent_at = timezone.now()
        registrant.reminder_sent_by = sender_user
        registrant.save()

        # System Audit Log
        from audit.models import log_audit_event
        log_audit_event(
            action_type="REMINDER_SENT",
            entity_type="Registrant",
            entity_id=registrant.registration_id or str(registrant.id),
            actor=sender_user,
            drive=registrant.drive,
            details={
                'description': f"{registrant.preferred_language} WhatsApp reminder sent to {registrant.full_name}.",
                'registrant_name': registrant.full_name,
                'language': registrant.preferred_language
            }
        )

        # Build wa.me link
        wa_target_phone = registrant.whatsapp_number or registrant.phone_number
        wa_me_link = build_wa_me_link(
            registrant_phone=wa_target_phone,
            message_text=message_text,
            sender_name=f"{sender_user.first_name} {sender_user.last_name}".strip() or sender_user.username,
            sender_phone=sender_user.phone or "+910000000000"
        )

        return Response({
            'message': 'Reminder generated successfully.',
            'wa_me_link': wa_me_link,
            'content_sent': message_text,
            'log_id': log.id,
            'sent_by_user': sender_user.username,
            'sender_phone': sender_user.phone,
            'registrant': VolunteerRegistrantSerializer(registrant).data
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_bulk_reminders(request, drive_id):
    drive = get_object_or_404(Drive, id=drive_id)
    sender_user = request.user

    consented_registrants = Registrant.objects.filter(
        drive=drive,
        consent_records__consent_type='this_drive',
        consent_records__is_granted=True
    ).distinct()

    from audit.models import log_audit_event
    log_audit_event(
        action_type="BULK_REMINDER_STARTED",
        entity_type="Drive",
        entity_id=str(drive.id),
        actor=sender_user,
        drive=drive,
        details={
            'description': f"Bulk WhatsApp reminder initiated for {consented_registrants.count()} eligible registrants.",
            'drive_name': drive.name,
            'eligible_count': consented_registrants.count()
        }
    )

    results = []
    now = timezone.now()
    for registrant in consented_registrants:
        try:
            require_consent(registrant, 'this_drive')

            message_text = generate_message(registrant, drive, stage='reminder')
            log = CommunicationLog.objects.create(
                registrant=registrant,
                message_type='reminder',
                channel='whatsapp_manual',
                content_sent=message_text,
                language=registrant.preferred_language,
                delivery_status='sent',
                sent_by=sender_user
            )

            registrant.reminder_status = 'Sent'
            registrant.reminder_sent_at = now
            registrant.reminder_sent_by = sender_user
            registrant.save()

            wa_target_phone = registrant.whatsapp_number or registrant.phone_number
            wa_me_link = build_wa_me_link(
                registrant_phone=wa_target_phone,
                message_text=message_text,
                sender_name=f"{sender_user.first_name} {sender_user.last_name}".strip() or sender_user.username,
                sender_phone=sender_user.phone or "+910000000000"
            )

            results.append({
                'registrant_id': registrant.id,
                'full_name': registrant.full_name,
                'phone_number': wa_target_phone,
                'wa_me_link': wa_me_link,
                'status': 'success'
            })
        except Exception as e:
            registrant.reminder_status = 'Failed'
            registrant.save()
            results.append({
                'registrant_id': registrant.id,
                'full_name': registrant.full_name,
                'phone_number': registrant.phone_number,
                'status': 'blocked',
                'reason': str(e)
            })

    success_count = sum(1 for r in results if r['status'] == 'success')
    failed_count = len(results) - success_count

    log_audit_event(
        action_type="BULK_REMINDER_COMPLETED",
        entity_type="Drive",
        entity_id=str(drive.id),
        actor=sender_user,
        drive=drive,
        details={
            'description': f"Bulk reminder completed. {success_count} sent, {failed_count} failed or skipped due to consent.",
            'sent': success_count,
            'failed': failed_count
        }
    )

    return Response({
        'drive_id': drive.id,
        'drive_name': drive.name,
        'processed_count': len(results),
        'results': results
    })
