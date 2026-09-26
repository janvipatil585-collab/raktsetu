from django.utils import timezone
from .models import ConsentRecord, TurnoutPrediction, AttendanceRecord, Registrant
from communications.models import CommunicationLog

def compute_turnout_score(registrant):
    """
    Computes turnout score label (low/medium/high/no_consent) and numerical value (0.0 to 1.0)
    for a given registrant based on consent, confirmation, reminders sent, days until drive,
    and prior attendance rate on completed drives.
    """
    # 1. Check consent for this_drive
    consent_record = ConsentRecord.objects.filter(
        registrant=registrant,
        consent_type='this_drive'
    ).first()

    if not consent_record or not consent_record.is_granted:
        prediction, _ = TurnoutPrediction.objects.get_or_create(registrant=registrant)
        prediction.score_label = 'no_consent'
        prediction.score_value = 0.0
        prediction.signals_used = {
            'consent_granted': False,
            'reason': 'Registrant explicitly withheld or revoked consent for this drive.'
        }
        prediction.save()
        return prediction

    # 2. Features calculation
    # Feature A: Confirmation status (0 to 0.35)
    confirmation_sent = CommunicationLog.objects.filter(
        registrant=registrant,
        message_type='confirmation'
    ).exists()
    confirmation_score = 0.35 if confirmation_sent else 0.15

    # Feature B: Reminder recency & count (0 to 0.20)
    reminder_count = CommunicationLog.objects.filter(
        registrant=registrant,
        message_type='reminder'
    ).count()
    reminder_score = min(0.20, reminder_count * 0.10)

    # Feature C: Days until event recency (0 to 0.20)
    drive_date = registrant.drive.date
    today = timezone.now().date()
    days_until = (drive_date - today).days

    if days_until == 0:
        recency_score = 0.20
    elif 1 <= days_until <= 7:
        recency_score = 0.15
    elif days_until > 7:
        recency_score = 0.10
    else:
        recency_score = 0.05

    # Feature D: Prior attendance rate across past completed drives (0 to 0.25)
    same_phone_registrations = Registrant.objects.filter(
        phone_number=registrant.phone_number,
        drive__status='completed'
    ).exclude(pk=registrant.pk)

    past_total = same_phone_registrations.count()
    if past_total > 0:
        past_attended = AttendanceRecord.objects.filter(
            registrant__in=same_phone_registrations,
            status='attended'
        ).count()
        prior_attendance_rate = past_attended / past_total
    else:
        prior_attendance_rate = 0.50 # baseline neutral assumption for first-time donors

    prior_score = prior_attendance_rate * 0.25

    # Total Score
    total_score = round(min(1.0, max(0.0, confirmation_score + reminder_score + recency_score + prior_score)), 2)

    # Score Label
    if total_score >= 0.70:
        score_label = 'high'
    elif total_score >= 0.40:
        score_label = 'medium'
    else:
        score_label = 'low'

    prediction, _ = TurnoutPrediction.objects.get_or_create(registrant=registrant)
    prediction.score_label = score_label
    prediction.score_value = total_score
    prediction.signals_used = {
        'consent_granted': True,
        'confirmation_sent': confirmation_sent,
        'reminder_count': reminder_count,
        'days_until_event': days_until,
        'prior_attendance_rate': round(prior_attendance_rate, 2),
        'past_completed_drives_count': past_total,
        'calculated_components': {
            'confirmation': round(confirmation_score, 2),
            'reminder': round(reminder_score, 2),
            'recency': round(recency_score, 2),
            'prior_attendance': round(prior_score, 2),
        }
    }
    prediction.save()
    return prediction
