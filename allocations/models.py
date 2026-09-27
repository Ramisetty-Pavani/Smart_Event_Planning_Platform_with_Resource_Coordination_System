from django.db import models


class Allocation(models.Model):
    event_id = models.IntegerField()
    resource_id = models.IntegerField()
    quantity = models.IntegerField()

    def __str__(self):
        return f"Allocation {self.id}"