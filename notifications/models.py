from django.db import models


class Notification(models.Model):
    event_id = models.IntegerField()

    recipient_email = models.EmailField(
        max_length=254,
        null=True,
        blank=True
    )

    notification_type = models.CharField(
        max_length=50
    )

    message = models.CharField(
        max_length=500
    )

    status = models.CharField(
        max_length=50,
        default="Unread"
    )

    def __str__(self):
        return self.message