from django.db import models


class Budget(models.Model):
    event_id = models.IntegerField()
    total_budget = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    def __str__(self):
        return f"Budget for Event {self.event_id}"