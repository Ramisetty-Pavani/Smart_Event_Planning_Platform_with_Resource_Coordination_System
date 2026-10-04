import os

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from accounts.models import UserProfile


class Command(BaseCommand):

    help = "Create Render admin user if it does not exist"

    def handle(self, *args, **kwargs):

        username = os.environ.get("ADMIN_USERNAME")
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")

        if not username or not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Admin environment variables are not configured."
                )
            )
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            }
        )

        if created:
            user.set_password(password)
            user.save()

            UserProfile.objects.create(
                user=user,
                full_name=username,
                role="Admin"
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser '{username}' created successfully."
                )
            )

        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser '{username}' already exists."
                )
            )