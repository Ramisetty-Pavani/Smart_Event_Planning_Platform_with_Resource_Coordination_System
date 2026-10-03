from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ("Admin", "Admin"),
        ("Organizer", "Organizer"),
        ("Participant", "Participant"),
        ("Staff", "Staff"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    full_name = models.CharField(max_length=200)

    phone = models.CharField(
        max_length=10,
        blank=True
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default="Participant"
    )

    def __str__(self):
        return self.user.username