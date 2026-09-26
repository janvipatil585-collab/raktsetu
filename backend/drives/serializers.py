from rest_framework import serializers
from .models import Drive, UserDriveRole
from accounts.serializers import UserSerializer

class UserDriveRoleSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    class Meta:
        model = UserDriveRole
        fields = ['id', 'user', 'user_detail', 'drive', 'role']

class DriveSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    registrations_count = serializers.SerializerMethodField()
    attended_count = serializers.SerializerMethodField()

    class Meta:
        model = Drive
        fields = [
            'id', 'name', 'slug', 'date', 'venue', 'target_count',
            'screening_info_url', 'status', 'created_by', 'created_by_name',
            'institution', 'registrations_count', 'attended_count'
        ]

    def get_registrations_count(self, obj):
        return obj.registrants.count()

    def get_attended_count(self, obj):
        from registrants.models import AttendanceRecord
        return AttendanceRecord.objects.filter(registrant__drive=obj, status='attended').count()
