import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.serializers import CustomTokenObtainPairSerializer

print("--- Testing CustomTokenObtainPairSerializer with {'email': 'admin@raktsetu.org', 'password': 'demo1234'} ---")
serializer = CustomTokenObtainPairSerializer(data={'email': 'admin@raktsetu.org', 'password': 'demo1234'})
try:
    if serializer.is_valid():
        print("VALID! Tokens:", serializer.validated_data.keys())
        print("User data:", serializer.validated_data.get('user'))
    else:
        print("INVALID! Errors:", serializer.errors)
except Exception as e:
    print("EXCEPTION:", e)
