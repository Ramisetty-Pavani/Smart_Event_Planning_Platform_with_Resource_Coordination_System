from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Notification


ALLOWED_TYPES = [
    "General",
    "Budget",
    "Resource",
    "Approval",
    "Registration",
    "Vendor",
    "Event"
]

ALLOWED_STATUS = [
    "Unread",
    "Read"
]


def create_notification(event_id, notification_type, message):

    existing_notification = Notification.objects.filter(
        event_id=event_id,
        notification_type=notification_type,
        message=message,
        status="Unread"
    ).first()

    if existing_notification:
        return existing_notification

    notification = Notification.objects.create(
        event_id=event_id,
        notification_type=notification_type,
        message=message,
        status="Unread"
    )

    return notification


@csrf_exempt
def notification_list(request):

    if request.method == "GET":

        notifications = Notification.objects.all().order_by("-id")

        result = []

        for notification in notifications:
            result.append({
                "id": notification.id,
                "event_id": notification.event_id,
                "notification_type": notification.notification_type,
                "message": notification.message,
                "status": notification.status
            })

        return JsonResponse({
            "message": "Notifications retrieved successfully",
            "notifications": result
        })

    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        notification_type = data.get("notification_type")
        message = data.get("message")

        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        try:
            event_id = int(event_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id must be a valid number"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        if not notification_type:
            return JsonResponse({
                "message": "notification_type is required"
            }, status=400)

        if notification_type not in ALLOWED_TYPES:
            return JsonResponse({
                "message": "Invalid notification type",
                "allowed_types": ALLOWED_TYPES
            }, status=400)

        if not message or not message.strip():
            return JsonResponse({
                "message": "message is required"
            }, status=400)

        notification = Notification.objects.create(
            event_id=event_id,
            notification_type=notification_type,
            message=message.strip(),
            status="Unread"
        )

        return JsonResponse({
            "message": "Notification created successfully",
            "notification": {
                "id": notification.id,
                "event_id": notification.event_id,
                "notification_type": notification.notification_type,
                "message": notification.message,
                "status": notification.status
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        notification_id = data.get("id")

        if notification_id is None:
            return JsonResponse({
                "message": "Notification id is required"
            }, status=400)

        try:
            notification_id = int(notification_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Notification id must be a valid number"
            }, status=400)

        try:
            notification = Notification.objects.get(
                id=notification_id
            )
        except Notification.DoesNotExist:
            return JsonResponse({
                "message": "Notification not found"
            }, status=404)

        if "message" in data:

            if not data["message"] or not data["message"].strip():
                return JsonResponse({
                    "message": "Message cannot be empty"
                }, status=400)

            notification.message = data["message"].strip()

        if "notification_type" in data:

            if data["notification_type"] not in ALLOWED_TYPES:
                return JsonResponse({
                    "message": "Invalid notification type",
                    "allowed_types": ALLOWED_TYPES
                }, status=400)

            notification.notification_type = data[
                "notification_type"
            ]

        if "status" in data:

            if data["status"] not in ALLOWED_STATUS:
                return JsonResponse({
                    "message": "Invalid status",
                    "allowed_status": ALLOWED_STATUS
                }, status=400)

            notification.status = data["status"]

        notification.save()

        return JsonResponse({
            "message": "Notification updated successfully",
            "notification": {
                "id": notification.id,
                "event_id": notification.event_id,
                "notification_type": notification.notification_type,
                "message": notification.message,
                "status": notification.status
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        notification_id = data.get("id")

        if notification_id is None:
            return JsonResponse({
                "message": "Notification id is required"
            }, status=400)

        try:
            notification_id = int(notification_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Notification id must be a valid number"
            }, status=400)

        try:
            notification = Notification.objects.get(
                id=notification_id
            )
        except Notification.DoesNotExist:
            return JsonResponse({
                "message": "Notification not found"
            }, status=404)

        notification.delete()

        return JsonResponse({
            "message": "Notification deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)