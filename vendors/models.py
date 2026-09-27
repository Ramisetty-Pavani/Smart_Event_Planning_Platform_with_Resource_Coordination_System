from django.db import models


class Vendor(models.Model):
    event_id = models.IntegerField()
    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    service = models.CharField(max_length=200)
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    status = models.CharField(
        max_length=50,
        default="Pending"
    )

    def __str__(self):
        return self.company