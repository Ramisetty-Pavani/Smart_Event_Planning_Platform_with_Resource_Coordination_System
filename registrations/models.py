from django.db import models
import uuid


class Registration(models.Model):
    event_id = models.IntegerField()
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=10)
    status = models.CharField(max_length=50, default="Registered")
    attendance = models.CharField(max_length=50, default="Not Marked")
    qr_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        null=True,
        blank=True
    )

    def __str__(self):
        return self.name