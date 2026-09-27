from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json
import re

from events.models import Event
from .models import Registration
from notifications.views import create_notification


ALLOWED_STATUS = [
    "Registered",
    "Confirmed",
    "Cancelled"
]

ALLOWED_ATTENDANCE = [
    "Not Marked",
    "Present",
    "Absent"
]


@csrf_exempt
def registration_list(request):

    if request.method == "GET":

        event_id = request.GET.get("event_id")

        if event_id is not None:

            try:
                event_id = int(event_id)
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "event_id must be a valid number"
                }, status=400)

            registrations = Registration.objects.filter(
                event_id=event_id
            ).order_by("-id")

        else:

            registrations = Registration.objects.all().order_by("-id")

        result = []

        for registration in registrations:
            result.append({
                "id": registration.id,
                "event_id": registration.event_id,
                "name": registration.name,
                "email": registration.email,
                "phone": registration.phone,
                "status": registration.status,
                "attendance": registration.attendance
            })

        return JsonResponse({
            "message": "Registrations retrieved successfully",
            "registrations": result
        })

    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        name = data.get("name")
        email = data.get("email")
        phone = data.get("phone")

        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        if not name or not name.strip():
            return JsonResponse({
                "message": "Name is required"
            }, status=400)

        if not email or not email.strip():
            return JsonResponse({
                "message": "Email is required"
            }, status=400)

        if not phone:
            return JsonResponse({
                "message": "Phone is required"
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

        try:
            event = Event.objects.get(
                id=event_id
            )
        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        email = email.strip().lower()

        email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"

        if not re.match(email_pattern, email):
            return JsonResponse({
                "message": "Invalid email format"
            }, status=400)

        phone = str(phone).strip()

        if not phone.isdigit() or len(phone) != 10:
            return JsonResponse({
                "message": "Phone must contain exactly 10 digits"
            }, status=400)

        existing_registration = Registration.objects.filter(
            event_id=event_id,
            email=email
        ).exclude(
            status="Cancelled"
        ).exists()

        if existing_registration:
            return JsonResponse({
                "message": "This email is already registered for this event"
            }, status=400)

        if event.capacity is not None:

            active_registrations = Registration.objects.filter(
                event_id=event_id
            ).exclude(
                status="Cancelled"
            ).count()

            if active_registrations >= event.capacity:

                return JsonResponse({
                    "message": "Event registration capacity is full",
                    "capacity": event.capacity,
                    "registered": active_registrations
                }, status=400)

        registration = Registration.objects.create(
            event_id=event_id,
            name=name.strip(),
            email=email,
            phone=phone,
            status="Registered",
            attendance="Not Marked"
        )

        create_notification(
            event_id,
            "Registration",
            name.strip()
            + " registered for event "
            + str(event_id)
        )

        return JsonResponse({
            "message": "Registration successful",
            "registration": {
                "id": registration.id,
                "event_id": registration.event_id,
                "name": registration.name,
                "email": registration.email,
                "phone": registration.phone,
                "status": registration.status,
                "attendance": registration.attendance
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        registration_id = data.get("id")

        if registration_id is None:
            return JsonResponse({
                "message": "Registration id is required"
            }, status=400)

        try:
            registration_id = int(registration_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Registration id must be a valid number"
            }, status=400)

        try:
            registration = Registration.objects.get(
                id=registration_id
            )
        except Registration.DoesNotExist:
            return JsonResponse({
                "message": "Registration not found"
            }, status=404)

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Name cannot be empty"
                }, status=400)

            registration.name = data["name"].strip()

        if "email" in data:

            email = data["email"]

            if not email or not email.strip():
                return JsonResponse({
                    "message": "Email cannot be empty"
                }, status=400)

            email = email.strip().lower()

            if not re.match(
                r"^[\w\.-]+@[\w\.-]+\.\w+$",
                email
            ):
                return JsonResponse({
                    "message": "Invalid email format"
                }, status=400)

            registration.email = email

        if "phone" in data:

            phone = str(data["phone"]).strip()

            if not phone.isdigit() or len(phone) != 10:
                return JsonResponse({
                    "message": "Phone must contain exactly 10 digits"
                }, status=400)

            registration.phone = phone

        if "status" in data:

            if data["status"] not in ALLOWED_STATUS:
                return JsonResponse({
                    "message": "Invalid registration status",
                    "allowed_status": ALLOWED_STATUS
                }, status=400)

            registration.status = data["status"]

        if "attendance" in data:

            if data["attendance"] not in ALLOWED_ATTENDANCE:
                return JsonResponse({
                    "message": "Invalid attendance status",
                    "allowed_attendance": ALLOWED_ATTENDANCE
                }, status=400)

            registration.attendance = data["attendance"]

        registration.save()

        return JsonResponse({
            "message": "Registration updated successfully",
            "registration": {
                "id": registration.id,
                "event_id": registration.event_id,
                "name": registration.name,
                "email": registration.email,
                "phone": registration.phone,
                "status": registration.status,
                "attendance": registration.attendance
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        registration_id = data.get("id")

        if registration_id is None:
            return JsonResponse({
                "message": "Registration id is required"
            }, status=400)

        try:
            registration_id = int(registration_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Registration id must be a valid number"
            }, status=400)

        try:
            registration = Registration.objects.get(
                id=registration_id
            )
        except Registration.DoesNotExist:
            return JsonResponse({
                "message": "Registration not found"
            }, status=404)

        registration.status = "Cancelled"
        registration.save()

        return JsonResponse({
            "message": "Registration cancelled successfully",
            "registration": {
                "id": registration.id,
                "event_id": registration.event_id,
                "name": registration.name,
                "email": registration.email,
                "phone": registration.phone,
                "status": registration.status,
                "attendance": registration.attendance
            }
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)


@csrf_exempt
def set_event_capacity(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Only POST method is allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    event_id = data.get("event_id")
    capacity = data.get("capacity")

    if event_id is None:
        return JsonResponse({
            "message": "event_id is required"
        }, status=400)

    if capacity is None:
        return JsonResponse({
            "message": "capacity is required"
        }, status=400)

    try:
        event_id = int(event_id)
        capacity = int(capacity)
    except (ValueError, TypeError):
        return JsonResponse({
            "message": "event_id and capacity must be valid numbers"
        }, status=400)

    if event_id <= 0:
        return JsonResponse({
            "message": "event_id must be greater than 0"
        }, status=400)

    if capacity <= 0:
        return JsonResponse({
        "message": "capacity must be greater than 0"
        }, status=400)

    try:
        event = Event.objects.get(
            id=event_id
        )
    except Event.DoesNotExist:
        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    event.capacity = capacity
    event.save()

    return JsonResponse({
        "message": "Event capacity set successfully",
        "event_id": event.id,
        "capacity": event.capacity
    })