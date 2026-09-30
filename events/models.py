from django.db import models


class Event(models.Model):
    name = models.CharField(max_length=200)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200)
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    capacity = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name