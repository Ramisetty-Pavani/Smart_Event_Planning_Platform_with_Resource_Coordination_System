from django.db import models


class Expense(models.Model):

    event_id = models.IntegerField()

    description = models.CharField(max_length=200)

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    category = models.CharField(max_length=100)

    def __str__(self):
        return self.description