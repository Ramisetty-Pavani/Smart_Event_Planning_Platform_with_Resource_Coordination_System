from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

import json

from .models import Notification
from events.models import Event


ALLOWED_TYPES = [
    "General",
    "Budget",
    "Resource",
    "Approval",
    "Registration",
    "Vendor",
    "Event",
    "Attendance"
]

ALLOWED_STATUS = [
    "Unread",
    "Read"
]


def create_notification(
    event_id,
    notification_type,
    message,
    recipient_email=None
):

    existing_notification = Notification.objects.filter(
        event_id=event_id,
        notification_type=notification_type,
        message=message,
        recipient_email=recipient_email,
        status="Unread"
    ).first()

    if existing_notification:
        return existing_notification

    notification = Notification.objects.create(
        event_id=event_id,
        recipient_email=recipient_email,
        notification_type=notification_type,
        message=message,
        status="Unread"
    )

    return notification


def get_user_role(user):

    if not user.is_authenticated:
        return None

    if user.is_superuser:
        return "Admin"

    try:
        return user.userprofile.role
    except Exception:
        return None


# =============================================================
# GET EVENT NAME FROM EVENT ID
# =============================================================

def get_event_name(event_id):

    try:
        event = Event.objects.get(id=event_id)
        return event.name

    except Event.DoesNotExist:
        return "Unknown Event"


def get_notifications_for_user(user):

    role = get_user_role(user)

    # Admin sees all notifications
    if role == "Admin":

        return Notification.objects.all().order_by("-id")

    # Organizer sees all notifications
    if role == "Organizer":

        return Notification.objects.all().order_by("-id")

    # Staff sees operational notifications
    if role == "Staff":

        return Notification.objects.filter(
            notification_type__in=[
                "General",
                "Event",
                "Resource",
                "Registration",
                "Attendance",
                "Approval"
            ]
        ).order_by("-id")

    # Participant sees only their own notifications
    if role == "Participant":

        user_email = (
            user.email or ""
        ).strip().lower()

        if not user_email:
            return Notification.objects.none()

        return Notification.objects.filter(
            recipient_email__iexact=user_email,
            notification_type__in=[
                "General",
                "Event",
                "Registration",
                "Attendance"
            ]
        ).order_by("-id")

    return Notification.objects.none()


def can_update_notification(
    user,
    notification
):

    role = get_user_role(user)

    # Admin and Organizer
    if role in [
        "Admin",
        "Organizer"
    ]:

        return True

    # Staff
    if role == "Staff":

        return notification.notification_type in [
            "General",
            "Event",
            "Resource",
            "Registration",
            "Attendance",
            "Approval"
        ]

    # Participant
    if role == "Participant":

        user_email = (
            user.email or ""
        ).strip().lower()

        notification_email = (
            notification.recipient_email or ""
        ).strip().lower()

        return (
            user_email
            and notification_email
            and user_email == notification_email
        )

    return False


# =============================================================
# CONVERT NOTIFICATION INTO RESPONSE
# =============================================================

def notification_to_dict(notification):

    return {
        "id": notification.id,

        # Keep event_id for backend reference
        "event_id": notification.event_id,

        # Get actual event name
        "event_name": get_event_name(
            notification.event_id
        ),

        "recipient_email":
            notification.recipient_email,

        "notification_type":
            notification.notification_type,

        "message":
            notification.message,

        "status":
            notification.status
    }


@csrf_exempt
@login_required
def notification_list(request):

    role = get_user_role(
        request.user
    )

    if role is None:

        return JsonResponse({
            "message":
                "User role could not be determined"
        }, status=403)

    # =========================================================
    # GET
    # =========================================================

    if request.method == "GET":

        notifications = (
            get_notifications_for_user(
                request.user
            )
        )

        result = []

        for notification in notifications:

            result.append(
                notification_to_dict(
                    notification
                )
            )

        return JsonResponse({
            "message":
                "Notifications retrieved successfully",

            "notifications":
                result
        })

    # =========================================================
    # POST
    # =========================================================

    elif request.method == "POST":

        if role not in [
            "Admin",
            "Organizer"
        ]:

            return JsonResponse({
                "message":
                    "You do not have permission to create notifications"
            }, status=403)

        try:

            data = json.loads(
                request.body
            )

        except json.JSONDecodeError:

            return JsonResponse({
                "message":
                    "Invalid JSON data"
            }, status=400)

        event_id = data.get(
            "event_id"
        )

        notification_type = data.get(
            "notification_type"
        )

        message = data.get(
            "message"
        )

        recipient_email = data.get(
            "recipient_email"
        )

        if event_id is None:

            return JsonResponse({
                "message":
                    "event_id is required"
            }, status=400)

        try:

            event_id = int(
                event_id
            )

        except (
            ValueError,
            TypeError
        ):

            return JsonResponse({
                "message":
                    "event_id must be a valid number"
            }, status=400)

        if event_id <= 0:

            return JsonResponse({
                "message":
                    "event_id must be greater than 0"
            }, status=400)

        # Check event exists
        try:

            Event.objects.get(
                id=event_id
            )

        except Event.DoesNotExist:

            return JsonResponse({
                "message":
                    "Event not found"
            }, status=404)

        if not notification_type:

            return JsonResponse({
                "message":
                    "notification_type is required"
            }, status=400)

        if notification_type not in ALLOWED_TYPES:

            return JsonResponse({
                "message":
                    "Invalid notification type",
                "allowed_types":
                    ALLOWED_TYPES
            }, status=400)

        if not message or not message.strip():

            return JsonResponse({
                "message":
                    "message is required"
            }, status=400)

        if recipient_email:

            recipient_email = (
                recipient_email
                .strip()
                .lower()
            )

        notification = create_notification(
            event_id,
            notification_type,
            message.strip(),
            recipient_email
        )

        return JsonResponse({
            "message":
                "Notification created successfully",

            "notification":
                notification_to_dict(
                    notification
                )
        }, status=201)

    # =========================================================
    # PUT
    # =========================================================

    elif request.method == "PUT":

        try:

            data = json.loads(
                request.body
            )

        except json.JSONDecodeError:

            return JsonResponse({
                "message":
                    "Invalid JSON data"
            }, status=400)

        notification_id = data.get(
            "id"
        )

        if notification_id is None:

            return JsonResponse({
                "message":
                    "Notification id is required"
            }, status=400)

        try:

            notification_id = int(
                notification_id
            )

        except (
            ValueError,
            TypeError
        ):

            return JsonResponse({
                "message":
                    "Notification id must be a valid number"
            }, status=400)

        try:

            notification = Notification.objects.get(
                id=notification_id
            )

        except Notification.DoesNotExist:

            return JsonResponse({
                "message":
                    "Notification not found"
            }, status=404)

        if not can_update_notification(
            request.user,
            notification
        ):

            return JsonResponse({
                "message":
                    "You do not have permission to update this notification"
            }, status=403)

        # Participant and Staff can only change status
        if role not in [
            "Admin",
            "Organizer"
        ]:

            extra_fields = (
                set(data.keys())
                - {
                    "id",
                    "status"
                }
            )

            if extra_fields:

                return JsonResponse({
                    "message":
                        "You can only change notification status"
                }, status=403)

        if "message" in data:

            if (
                not data["message"]
                or not data["message"].strip()
            ):

                return JsonResponse({
                    "message":
                        "Message cannot be empty"
                }, status=400)

            notification.message = (
                data["message"].strip()
            )

        if "notification_type" in data:

            if (
                data["notification_type"]
                not in ALLOWED_TYPES
            ):

                return JsonResponse({
                    "message":
                        "Invalid notification type",
                    "allowed_types":
                        ALLOWED_TYPES
                }, status=400)

            notification.notification_type = (
                data["notification_type"]
            )

        if "recipient_email" in data:

            recipient_email = (
                data["recipient_email"]
            )

            if recipient_email:

                recipient_email = (
                    recipient_email
                    .strip()
                    .lower()
                )

            notification.recipient_email = (
                recipient_email
            )

        if "status" in data:

            if (
                data["status"]
                not in ALLOWED_STATUS
            ):

                return JsonResponse({
                    "message":
                        "Invalid status",
                    "allowed_status":
                        ALLOWED_STATUS
                }, status=400)

            notification.status = (
                data["status"]
            )

        else:

            return JsonResponse({
                "message":
                    "status is required"
            }, status=400)

        notification.save()

        return JsonResponse({
            "message":
                "Notification updated successfully",

            "notification":
                notification_to_dict(
                    notification
                )
        })

    # =========================================================
    # DELETE
    # =========================================================

    elif request.method == "DELETE":

        if role not in [
            "Admin",
            "Organizer"
        ]:

            return JsonResponse({
                "message":
                    "You do not have permission to delete notifications"
            }, status=403)

        try:

            data = json.loads(
                request.body
            )

        except json.JSONDecodeError:

            return JsonResponse({
                "message":
                    "Invalid JSON data"
            }, status=400)

        notification_id = data.get(
            "id"
        )

        if notification_id is None:

            return JsonResponse({
                "message":
                    "Notification id is required"
            }, status=400)

        try:

            notification_id = int(
                notification_id
            )

        except (
            ValueError,
            TypeError
        ):

            return JsonResponse({
                "message":
                    "Notification id must be a valid number"
            }, status=400)

        try:

            notification = Notification.objects.get(
                id=notification_id
            )

        except Notification.DoesNotExist:

            return JsonResponse({
                "message":
                    "Notification not found"
            }, status=404)

        notification.delete()

        return JsonResponse({
            "message":
                "Notification deleted successfully"
        })

    return JsonResponse({
        "message":
            "Method not allowed"
    }, status=405)