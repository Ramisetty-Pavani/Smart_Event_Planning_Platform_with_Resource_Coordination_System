from django.db import models


class Sponsor(models.Model):
    event_id = models.IntegerField()
    name = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return self.company