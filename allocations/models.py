from django.db import models


class Allocation(models.Model):
    event_id = models.IntegerField()
    resource_id = models.IntegerField()
    quantity = models.IntegerField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"Allocation {self.id}"