from rest_framework.exceptions import PermissionDenied
from .models import ConsentRecord

class ConsentRequiredException(PermissionDenied):
    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = "Messaging blocked: Registrant has not granted consent for communications."
        super().__init__(detail=detail, code=code)

def require_consent(registrant, consent_type='this_drive'):
    """
    Raises ConsentRequiredException if the registrant has not granted active consent
    for the specified consent_type ('this_drive' or 'future_drives').
    """
    record = ConsentRecord.objects.filter(
        registrant=registrant,
        consent_type=consent_type
    ).first()

    if not record or not record.is_granted:
        raise ConsentRequiredException(
            f"Consent violation: Registrant '{registrant.full_name}' has not granted consent for '{consent_type}'."
        )
    return True
