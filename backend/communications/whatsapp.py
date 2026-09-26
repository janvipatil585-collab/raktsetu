import urllib.parse
from decouple import config
import requests

def build_wa_me_link(registrant_phone, message_text, sender_name, sender_phone):
    """
    Builds a direct wa.me link with URL-encoded text.
    Embeds the logged-in sender's name and phone number as the WhatsApp contact identity.
    """
    # Clean phone numbers (E.164 without leading plus for wa.me URL target)
    clean_target_phone = registrant_phone.replace('+', '').replace(' ', '').replace('-', '')
    
    sender_signature = f"\n\n---\nSent by: {sender_name} ({sender_phone})\nSt. Vincent Pallotti Blood Donation Drive Team"
    full_message = f"{message_text}{sender_signature}"
    
    encoded_message = urllib.parse.quote(full_message)
    wa_link = f"https://wa.me/{clean_target_phone}?text={encoded_message}"
    return wa_link

def send_via_meta_cloud_api(registrant_phone, message_text):
    """
    Stub for Meta WhatsApp Cloud API integration.
    Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN set in environment variables.
    
    NOTE: Setup Meta Business app & System User access token outside this codebase for production.
    """
    phone_number_id = config('WHATSAPP_PHONE_NUMBER_ID', default=None)
    access_token = config('WHATSAPP_ACCESS_TOKEN', default=None)

    if not phone_number_id or not access_token:
        # Graceful fallback in development environment
        return {
            'status': 'simulated',
            'message': 'Meta Cloud API credentials not configured. Use manual wa.me link instead.',
            'external_id': 'SIMULATED-META-MSG-12345'
        }

    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": registrant_phone.replace('+', ''),
        "type": "text",
        "text": {"body": message_text}
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        response_json = response.json()
        if response.status_code == 200:
            return {
                'status': 'sent',
                'external_id': response_json.get('messages', [{}])[0].get('id', 'META-MSG-OK')
            }
        else:
            return {
                'status': 'failed',
                'error': response_json
            }
    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e)
        }
