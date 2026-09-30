from django.db import models


class ConflictRecord(models.Model):
    conflict_type = models.CharField(max_length=50)
    event_id = models.IntegerField(null=True, blank=True)
    conflicting_event_id = models.IntegerField(null=True, blank=True)
    resource_id = models.IntegerField(null=True, blank=True)
    description = models.TextField()
    status = models.CharField(max_length=30, default="Prevented")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.conflict_type} - Event {self.event_id}"