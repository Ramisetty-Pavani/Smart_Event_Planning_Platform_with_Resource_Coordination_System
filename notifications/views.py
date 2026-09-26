from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

notifications = []
def create_notification(event_id, notification_type, message):
    """
    Creates a notification automatically.
    """

    notification = {
        "id": len(notifications) + 1,
        "event_id": event_id,
        "notification_type": notification_type,
        "message": message,
        "status": "Unread"
    }

    notifications.append(notification)

    return notification

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


@csrf_exempt
def notification_list(request):

    # ==================================================
    # GET
    # ==================================================

    if request.method == "GET":

        return JsonResponse({
            "message": "Notifications retrieved successfully",
            "notifications": notifications
        })


    # ==================================================
    # POST
    # ==================================================

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


        # Required fields

        if event_id is None:

            return JsonResponse({
                "message": "event_id is required"
            }, status=400)


        if not notification_type:

            return JsonResponse({
                "message": "notification_type is required"
            }, status=400)


        if not message or not message.strip():

            return JsonResponse({
                "message": "message is required"
            }, status=400)


        # Validate event ID

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


        # Validate notification type

        if notification_type not in ALLOWED_TYPES:

            return JsonResponse({
                "message": "Invalid notification type",
                "allowed_types": ALLOWED_TYPES
            }, status=400)


        # Create notification

        notification = {

            "id": len(notifications) + 1,

            "event_id": event_id,

            "notification_type": notification_type,

            "message": message.strip(),

            "status": "Unread"
        }


        notifications.append(notification)


        return JsonResponse({

            "message": "Notification created successfully",

            "notification": notification

        }, status=201)


    # ==================================================
    # PUT
    # ==================================================

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


        for notification in notifications:

            if notification["id"] == notification_id:

                if "message" in data:

                    if not data["message"] or not data["message"].strip():

                        return JsonResponse({
                            "message": "Message cannot be empty"
                        }, status=400)

                    notification["message"] = data["message"].strip()


                if "status" in data:

                    if data["status"] not in ALLOWED_STATUS:

                        return JsonResponse({
                            "message": "Invalid status",
                            "allowed_status": ALLOWED_STATUS
                        }, status=400)

                    notification["status"] = data["status"]


                return JsonResponse({

                    "message": "Notification updated successfully",

                    "notification": notification

                })


        return JsonResponse({
            "message": "Notification not found"
        }, status=404)


    # ==================================================
    # DELETE
    # ==================================================

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


        for notification in notifications:

            if notification["id"] == notification_id:

                notifications.remove(notification)

                return JsonResponse({
                    "message": "Notification deleted successfully"
                })


        return JsonResponse({
            "message": "Notification not found"
        }, status=404)


    # ==================================================
    # Unsupported method
    # ==================================================

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)