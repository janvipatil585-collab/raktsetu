from django.db import models
from django.conf import settings
from drives.models import Drive

class Registrant(models.Model):
    LANGUAGE_CHOICES = (
        ('English', 'English'),
        ('Hindi', 'Hindi'),
        ('Marathi', 'Marathi'),
        ('Bengali', 'Bengali'),
        ('Tamil', 'Tamil'),
        ('Telugu', 'Telugu'),
        ('Gujarati', 'Gujarati'),
        ('Kannada', 'Kannada'),
        ('Other', 'Other'),
    )
    BLOOD_GROUP_CHOICES = (
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('O+', 'O+'), ('O-', 'O-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
    )
    REMINDER_STATUS_CHOICES = (
        ('Not Sent', 'Not Sent'),
        ('Sent', 'Sent'),
        ('Failed', 'Failed'),
    )

    registration_id = models.CharField(max_length=50, unique=True, blank=True)
    drive = models.ForeignKey(Drive, on_delete=models.CASCADE, related_name='registrants')
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, help_text="E.164 format")
    whatsapp_number = models.CharField(max_length=20, null=True, blank=True, help_text="E.164 format")
    blood_group = models.CharField(max_length=10, choices=BLOOD_GROUP_CHOICES)
    preferred_language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='English')
    email = models.EmailField(null=True, blank=True)
    registered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_donors')
    registration_status = models.CharField(max_length=30, default='Registered')
    
    # Confirmation tracking
    confirmation_status = models.CharField(max_length=20, default='Sent')
    confirmation_sent_at = models.DateTimeField(null=True, blank=True)

    # Reminder tracking
    reminder_status = models.CharField(max_length=20, choices=REMINDER_STATUS_CHOICES, default='Not Sent')
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_reminders')
    
    registered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.whatsapp_number:
            self.whatsapp_number = self.phone_number
        if not self.registration_id:
            words = [w for w in self.drive.name.split() if w.isalnum()]
            code = "".join([w[0] for w in words[:2]]).upper() or "SP"
            count = Registrant.objects.filter(drive=self.drive).count() + 1
            self.registration_id = f"RST-{code}-{count:03d}"
        super().save(*args, **kwargs)

    @property
    def communication_consent(self):
        record = self.consent_records.filter(consent_type='this_drive').first()
        return record.is_granted if record else True

    def __str__(self):
        return f"[{self.registration_id}] {self.full_name} ({self.blood_group}) - {self.drive.name}"


class ConsentRecord(models.Model):
    CONSENT_TYPE_CHOICES = (
        ('this_drive', 'This Drive Only'),
        ('future_drives', 'Future Drives'),
    )
    registrant = models.ForeignKey(Registrant, on_delete=models.CASCADE, related_name='consent_records')
    consent_type = models.CharField(max_length=20, choices=CONSENT_TYPE_CHOICES)
    is_granted = models.BooleanField(default=True)
    granted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('registrant', 'consent_type')

    def __str__(self):
        status = "Granted" if self.is_granted else "Revoked"
        return f"{self.registrant.full_name} - {self.consent_type}: {status}"


class TurnoutPrediction(models.Model):
    SCORE_LABEL_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('no_consent', 'No Consent'),
    )
    registrant = models.OneToOneField(Registrant, on_delete=models.CASCADE, related_name='turnout_prediction')
    score_label = models.CharField(max_length=20, choices=SCORE_LABEL_CHOICES, default='medium')
    score_value = models.FloatField(default=0.5)
    computed_at = models.DateTimeField(auto_now=True)
    signals_used = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.registrant.full_name} - {self.score_label} ({self.score_value:.2f})"


class AttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ('predicted', 'Predicted'),
        ('attended', 'Attended'),
        ('no_show', 'No Show'),
    )
    registrant = models.OneToOneField(Registrant, on_delete=models.CASCADE, related_name='attendance_record')
    checked_in_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='predicted')

    def __str__(self):
        return f"{self.registrant.full_name} - Status: {self.status}"
