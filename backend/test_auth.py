import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
User = get_user_model()

print("User count:", User.objects.count())
admin_user = User.objects.filter(username="admin@raktsetu.org").first()
if admin_user:
    print("Found admin user:", admin_user.username, "email:", admin_user.email, "is_active:", admin_user.is_active)
    print("check_password:", admin_user.check_password("demo1234"))

auth_result = authenticate(username="admin@raktsetu.org", password="demo1234")
print("authenticate(username='admin@raktsetu.org'):", auth_result)
