from django.db import models


class Registration(models.Model):
    event_id = models.IntegerField()
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=10)

    status = models.CharField(
        max_length=50,
        default="Registered"
    )

    attendance = models.CharField(
        max_length=50,
        default="Not Marked"
    )

    def __str__(self):
        return self.name