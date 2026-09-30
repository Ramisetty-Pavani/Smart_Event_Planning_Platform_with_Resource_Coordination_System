from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json
import re

from .models import Registration
from events.models import Event
from notifications.views import create_notification


@csrf_exempt
def registration_list(request):

    # =========================
    # GET - VIEW REGISTRATIONS
    # =========================
    if request.method == "GET":

        event_id = request.GET.get("event_id")

        if event_id:
            try:
                event_id = int(event_id)
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Event id must be a valid number"
                }, status=400)

            registrations = Registration.objects.filter(
                event_id=event_id
            ).order_by("-id")

        else:
            registrations = Registration.objects.all().order_by("-id")

        registration_data = []

        for registration in registrations:
            registration_data.append({
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
            "registrations": registration_data
        })


    # =========================
    # POST - NEW REGISTRATION
    # =========================
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

        # Required fields
        if event_id is None:
            return JsonResponse({
                "message": "Event id is required"
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
                "message": "Phone number is required"
            }, status=400)

        # Event ID validation
        try:
            event_id = int(event_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Event id must be a valid number"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "Event id must be greater than 0"
            }, status=400)

        # Check event
        try:
            event = Event.objects.get(id=event_id)

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        # Normalize email
        email = email.strip().lower()

        # Email validation
        email_pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

        if not re.match(email_pattern, email):
            return JsonResponse({
                "message": "Invalid email address"
            }, status=400)

        # Phone validation
        phone = str(phone).strip()

        if not phone.isdigit():
            return JsonResponse({
                "message": "Phone number must contain only digits"
            }, status=400)

        if len(phone) != 10:
            return JsonResponse({
                "message": "Phone number must contain exactly 10 digits"
            }, status=400)

        # =========================
        # DUPLICATE REGISTRATION
        # =========================

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

        # =========================
        # CAPACITY CHECK
        # =========================

        if event.capacity is not None:

            active_registrations = Registration.objects.filter(
                event_id=event_id
            ).exclude(
                status="Cancelled"
            ).count()

            if active_registrations >= event.capacity:
                return JsonResponse({
                    "message": "Event capacity is full",
                    "capacity": event.capacity,
                    "registered": active_registrations
                }, status=400)

        # =========================
        # CREATE REGISTRATION
        # =========================

        registration = Registration.objects.create(
            event_id=event_id,
            name=name.strip(),
            email=email,
            phone=phone,
            status="Registered",
            attendance="Not Marked"
        )

        # Notification
        try:
            create_notification(
                event_id,
                "Registration",
                "New registration received from " + registration.name
            )
        except Exception:
            pass

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


    # =========================
    # PUT - UPDATE REGISTRATION
    # =========================
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

        # =========================
        # NAME
        # =========================

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Name cannot be empty"
                }, status=400)

            registration.name = data["name"].strip()

        # =========================
        # EMAIL
        # =========================

        if "email" in data:

            if not data["email"] or not data["email"].strip():
                return JsonResponse({
                    "message": "Email cannot be empty"
                }, status=400)

            email = data["email"].strip().lower()

            email_pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

            if not re.match(email_pattern, email):
                return JsonResponse({
                    "message": "Invalid email address"
                }, status=400)

            duplicate = Registration.objects.filter(
                event_id=registration.event_id,
                email=email
            ).exclude(
                id=registration.id
            ).exclude(
                status="Cancelled"
            ).exists()

            if duplicate:
                return JsonResponse({
                    "message": "This email is already registered for this event"
                }, status=400)

            registration.email = email

        # =========================
        # PHONE
        # =========================

        if "phone" in data:

            phone = str(data["phone"]).strip()

            if not phone.isdigit():
                return JsonResponse({
                    "message": "Phone number must contain only digits"
                }, status=400)

            if len(phone) != 10:
                return JsonResponse({
                    "message": "Phone number must contain exactly 10 digits"
                }, status=400)

            registration.phone = phone

        # =========================
        # STATUS
        # =========================

        if "status" in data:

            new_status = data["status"]

            allowed_statuses = [
                "Registered",
                "Confirmed",
                "Cancelled"
            ]

            if new_status not in allowed_statuses:
                return JsonResponse({
                    "message": (
                        "Status must be Registered, "
                        "Confirmed or Cancelled"
                    )
                }, status=400)

            old_status = registration.status

            # Re-registering a cancelled person
            if (
                old_status == "Cancelled"
                and new_status != "Cancelled"
            ):

                event = Event.objects.get(
                    id=registration.event_id
                )

                if event.capacity is not None:

                    active_registrations = Registration.objects.filter(
                        event_id=registration.event_id
                    ).exclude(
                        status="Cancelled"
                    ).exclude(
                        id=registration.id
                    ).count()

                    if active_registrations >= event.capacity:
                        return JsonResponse({
                            "message": (
                                "Cannot reactivate registration. "
                                "Event capacity is full"
                            ),
                            "capacity": event.capacity,
                            "registered": active_registrations
                        }, status=400)

            registration.status = new_status

        # =========================
        # ATTENDANCE
        # =========================

        if "attendance" in data:

            attendance = data["attendance"]

            allowed_attendance = [
                "Not Marked",
                "Present",
                "Absent"
            ]

            if attendance not in allowed_attendance:
                return JsonResponse({
                    "message": (
                        "Attendance must be Not Marked, "
                        "Present or Absent"
                    )
                }, status=400)

            # Cancelled registration should not be marked present
            if (
                registration.status == "Cancelled"
                and attendance == "Present"
            ):
                return JsonResponse({
                    "message": (
                        "Cancelled registration cannot be "
                        "marked as Present"
                    )
                }, status=400)

            registration.attendance = attendance

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


    # =========================
    # DELETE - CANCEL
    # =========================
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

        # Soft delete: keep the record but cancel it
        registration.status = "Cancelled"
        registration.attendance = "Not Marked"
        registration.save()

        return JsonResponse({
            "message": "Registration cancelled successfully",
            "registration_id": registration.id
        })


    # =========================
    # METHOD NOT ALLOWED
    # =========================

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)


# =====================================================
# SET EVENT CAPACITY
# =====================================================

@csrf_exempt
def set_event_capacity(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
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
            "message": "Event id is required"
        }, status=400)

    if capacity is None:
        return JsonResponse({
            "message": "Capacity is required"
        }, status=400)

    try:
        event_id = int(event_id)
        capacity = int(capacity)

    except (ValueError, TypeError):
        return JsonResponse({
            "message": "Event id and capacity must be valid numbers"
        }, status=400)

    if event_id <= 0:
        return JsonResponse({
            "message": "Event id must be greater than 0"
        }, status=400)

    if capacity <= 0:
        return JsonResponse({
            "message": "Capacity must be greater than 0"
        }, status=400)

    try:
        event = Event.objects.get(id=event_id)

    except Event.DoesNotExist:
        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    active_registrations = Registration.objects.filter(
        event_id=event_id
    ).exclude(
        status="Cancelled"
    ).count()

    if capacity < active_registrations:
        return JsonResponse({
            "message": (
                "Capacity cannot be less than current "
                "active registrations"
            ),
            "current_registrations": active_registrations,
            "requested_capacity": capacity
        }, status=400)

    event.capacity = capacity
    event.save()

    return JsonResponse({
        "message": "Event capacity updated successfully",
        "event_id": event.id,
        "capacity": event.capacity,
        "current_registrations": active_registrations
    })