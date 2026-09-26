from django.db import models
from django.conf import settings
from registrants.models import Registrant

class CommunicationLog(models.Model):
    MESSAGE_TYPE_CHOICES = (
        ('confirmation', 'Confirmation'),
        ('reminder', 'Reminder'),
        ('final_call', 'Final Call'),
    )
    CHANNEL_CHOICES = (
        ('whatsapp_manual', 'WhatsApp Manual (wa.me)'),
        ('whatsapp_api', 'WhatsApp Meta Cloud API'),
        ('sms', 'SMS'),
    )
    registrant = models.ForeignKey(Registrant, on_delete=models.CASCADE, related_name='communication_logs')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    channel = models.CharField(max_length=30, choices=CHANNEL_CHOICES, default='whatsapp_manual')
    content_sent = models.TextField()
    language = models.CharField(max_length=20, default='English')
    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(max_length=30, default='sent')
    external_message_id = models.CharField(max_length=255, null=True, blank=True)
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_communications')

    def __str__(self):
        return f"{self.get_message_type_display()} to {self.registrant.full_name} via {self.channel} at {self.sent_at}"
