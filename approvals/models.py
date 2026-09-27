from django.db import models


class Approval(models.Model):
    event_id = models.IntegerField()

    request_type = models.CharField(
        max_length=50
    )

    description = models.CharField(
        max_length=500
    )

    requested_by = models.CharField(
        max_length=200
    )

    status = models.CharField(
        max_length=50,
        default="Pending"
    )

    def __str__(self):
        return f"{self.request_type} - {self.event_id}"