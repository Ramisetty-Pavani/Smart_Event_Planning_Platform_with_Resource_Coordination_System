import qrcode
import json
import re

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

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

        # =========================
        # REQUIRED FIELDS
        # =========================

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

        # =========================
        # EVENT ID VALIDATION
        # =========================

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

        # =========================
        # CHECK EVENT
        # =========================

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        # =========================
        # EVENT COMPLETION CHECK
        # =========================

        current_date = timezone.localdate()
        current_time = timezone.localtime().time()

        # Event date has already passed
        if event.date < current_date:
            return JsonResponse({
                "message": "Registration is closed. This event has already been completed."
            }, status=400)

        # Event is today and has already ended
        if (
            event.date == current_date
            and event.end_time is not None
            and current_time >= event.end_time
        ):
            return JsonResponse({
                "message": "Registration is closed. This event has already ended."
            }, status=400)

        # =========================
        # NORMALIZE EMAIL
        # =========================

        email = email.strip().lower()

        # =========================
        # EMAIL VALIDATION
        # =========================

        email_pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

        if not re.match(email_pattern, email):
            return JsonResponse({
                "message": "Invalid email address"
            }, status=400)

        # =========================
        # PHONE VALIDATION
        # =========================

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

        # =========================
        # NOTIFICATION
        # =========================

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

            # =========================
            # REACTIVATE CANCELLED REGISTRATION
            # =========================

            if (
                old_status == "Cancelled"
                and new_status != "Cancelled"
            ):

                event = Event.objects.get(
                    id=registration.event_id
                )

                # Check whether event is completed
                current_date = timezone.localdate()
                current_time = timezone.localtime().time()

                if event.date < current_date:
                    return JsonResponse({
                        "message": (
                            "Cannot reactivate registration. "
                            "This event has already been completed."
                        )
                    }, status=400)

                if (
                    event.date == current_date
                    and event.end_time is not None
                    and current_time >= event.end_time
                ):
                    return JsonResponse({
                        "message": (
                            "Cannot reactivate registration. "
                            "This event has already ended."
                        )
                    }, status=400)

                # Capacity check
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


# =====================================================
# SCAN QR AND MARK ATTENDANCE
# =====================================================

@csrf_exempt
def scan_attendance(request):

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

    qr_token = data.get("qr_token")
    event_id = data.get("event_id")

    if not qr_token:
        return JsonResponse({
            "message": "QR token is required"
        }, status=400)

    if event_id is None:
        return JsonResponse({
            "message": "Event id is required"
        }, status=400)

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

    try:
        Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    try:
        registration = Registration.objects.get(
            qr_token=qr_token
        )
    except Registration.DoesNotExist:
        return JsonResponse({
            "message": "Invalid QR code"
        }, status=404)

    if registration.event_id != event_id:
        return JsonResponse({
            "message": "This QR code does not belong to this event"
        }, status=400)

    if registration.status == "Cancelled":
        return JsonResponse({
            "message": "Cancelled registration cannot be marked as Present"
        }, status=400)

    if registration.attendance == "Present":
        return JsonResponse({
            "message": "Attendance already marked",
            "registration_id": registration.id,
            "name": registration.name,
            "attendance": registration.attendance
        }, status=400)

    registration.attendance = "Present"

    registration.save(
        update_fields=["attendance"]
    )

    try:
        create_notification(
            event_id,
            "Attendance",
            "Attendance marked for " + registration.name
        )
    except Exception:
        pass

    return JsonResponse({
        "message": "Attendance marked successfully",
        "registration": {
            "id": registration.id,
            "event_id": registration.event_id,
            "name": registration.name,
            "email": registration.email,
            "status": registration.status,
            "attendance": registration.attendance
        }
    })


# =====================================================
# GENERATE QR CODE
# =====================================================

def generate_qr(request, registration_id):

    try:
        registration = Registration.objects.get(
            id=registration_id
        )
    except Registration.DoesNotExist:
        return JsonResponse({
            "message": "Registration not found"
        }, status=404)

    if not registration.qr_token:
        return JsonResponse({
            "message": "QR token is not available"
        }, status=400)

    qr_data = str(registration.qr_token)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4
    )

    qr.add_data(qr_data)
    qr.make(fit=True)

    image = qr.make_image()

    response = HttpResponse(
        content_type="image/png"
    )

    image.save(
        response,
        format="PNG"
    )

    return response