from rest_framework import serializers, exceptions
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'institution']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.CharField(required=False, write_only=True)
        self.fields['username'] = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        username_or_email = attrs.get('email') or attrs.get('username')
        password = attrs.get('password')

        if not username_or_email or not password:
            raise exceptions.AuthenticationFailed('Must include email/username and password.')

        # Look up user by email or username
        user = User.objects.filter(email__iexact=username_or_email).first()
        if not user:
            user = User.objects.filter(username__iexact=username_or_email).first()

        if user:
            authenticated_user = authenticate(username=user.username, password=password)
            if authenticated_user and authenticated_user.is_active:
                refresh = self.get_token(authenticated_user)
                data = {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(authenticated_user).data
                }
                return data

        raise exceptions.AuthenticationFailed(
            'No active account found with the given credentials'
        )
