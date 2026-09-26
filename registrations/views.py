from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json
import re

from events.views import events


registrations = []


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


# Event capacity
event_capacity = {}


@csrf_exempt
def registration_list(request):

    # =========================================================
    # GET - Retrieve registrations
    # =========================================================

    if request.method == "GET":

        event_id = request.GET.get("event_id")

        if event_id is not None:

            try:
                event_id = int(event_id)
            except (ValueError, TypeError):

                return JsonResponse({
                    "message": "event_id must be a valid number"
                }, status=400)

            filtered_registrations = []

            for registration in registrations:

                if registration["event_id"] == event_id:
                    filtered_registrations.append(registration)

            return JsonResponse({
                "message": "Registrations retrieved successfully",
                "registrations": filtered_registrations
            })

        return JsonResponse({
            "message": "Registrations retrieved successfully",
            "registrations": registrations
        })


    # =========================================================
    # POST - Create registration
    # =========================================================

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


        # -----------------------------------------------------
        # Required fields
        # -----------------------------------------------------

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


        # -----------------------------------------------------
        # Validate event ID
        # -----------------------------------------------------

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


        # -----------------------------------------------------
        # Check whether event exists
        # -----------------------------------------------------

        event_exists = False

        for event in events:

            if event["id"] == event_id:
                event_exists = True
                break


        if not event_exists:

            return JsonResponse({
                "message": "Event not found"
            }, status=404)


        # -----------------------------------------------------
        # Validate email
        # -----------------------------------------------------

        email = email.strip().lower()

        email_pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"

        if not re.match(email_pattern, email):

            return JsonResponse({
                "message": "Invalid email format"
            }, status=400)


        # -----------------------------------------------------
        # Validate phone
        # -----------------------------------------------------

        phone = str(phone).strip()

        if not phone.isdigit() or len(phone) != 10:

            return JsonResponse({
                "message": "Phone must contain exactly 10 digits"
            }, status=400)


        # -----------------------------------------------------
        # Check duplicate registration
        # -----------------------------------------------------

        for registration in registrations:

            if (
                registration["event_id"] == event_id
                and registration["email"] == email
                and registration["status"] != "Cancelled"
            ):

                return JsonResponse({
                    "message": "This email is already registered for this event"
                }, status=400)


        # -----------------------------------------------------
        # Check event capacity
        # -----------------------------------------------------

        capacity = event_capacity.get(event_id)

        if capacity is not None:

            active_registrations = 0

            for registration in registrations:

                if (
                    registration["event_id"] == event_id
                    and registration["status"] != "Cancelled"
                ):

                    active_registrations += 1


            if active_registrations >= capacity:

                return JsonResponse({
                    "message": "Event registration capacity is full",
                    "capacity": capacity,
                    "registered": active_registrations
                }, status=400)


        # -----------------------------------------------------
        # Create registration
        # -----------------------------------------------------

        registration = {

            "id": len(registrations) + 1,

            "event_id": event_id,

            "name": name.strip(),

            "email": email,

            "phone": phone,

            "status": "Registered",

            "attendance": "Not Marked"
        }


        registrations.append(registration)


        return JsonResponse({

            "message": "Registration successful",

            "registration": registration

        }, status=201)


    # =========================================================
    # PUT - Update registration
    # =========================================================

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


        for registration in registrations:

            if registration["id"] == registration_id:


                # -------------------------------------------------
                # Update name
                # -------------------------------------------------

                if "name" in data:

                    if not data["name"] or not data["name"].strip():

                        return JsonResponse({
                            "message": "Name cannot be empty"
                        }, status=400)

                    registration["name"] = data["name"].strip()


                # -------------------------------------------------
                # Update email
                # -------------------------------------------------

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

                    registration["email"] = email


                # -------------------------------------------------
                # Update phone
                # -------------------------------------------------

                if "phone" in data:

                    phone = str(data["phone"]).strip()

                    if not phone.isdigit() or len(phone) != 10:

                        return JsonResponse({
                            "message": "Phone must contain exactly 10 digits"
                        }, status=400)

                    registration["phone"] = phone


                # -------------------------------------------------
                # Update registration status
                # -------------------------------------------------

                if "status" in data:

                    if data["status"] not in ALLOWED_STATUS:

                        return JsonResponse({

                            "message": "Invalid registration status",

                            "allowed_status": ALLOWED_STATUS

                        }, status=400)

                    registration["status"] = data["status"]


                # -------------------------------------------------
                # Update attendance
                # -------------------------------------------------

                if "attendance" in data:

                    if data["attendance"] not in ALLOWED_ATTENDANCE:

                        return JsonResponse({

                            "message": "Invalid attendance status",

                            "allowed_attendance": ALLOWED_ATTENDANCE

                        }, status=400)

                    registration["attendance"] = data["attendance"]


                return JsonResponse({

                    "message": "Registration updated successfully",

                    "registration": registration

                })


        return JsonResponse({

            "message": "Registration not found"

        }, status=404)


    # =========================================================
    # DELETE - Cancel registration
    # =========================================================

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


        for registration in registrations:

            if registration["id"] == registration_id:

                registration["status"] = "Cancelled"

                return JsonResponse({

                    "message": "Registration cancelled successfully",

                    "registration": registration

                })


        return JsonResponse({

            "message": "Registration not found"

        }, status=404)


    # =========================================================
    # Other methods
    # =========================================================

    return JsonResponse({

        "message": "Method not allowed"

    }, status=405)


# =============================================================
# SET EVENT CAPACITY
# =============================================================

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


    # Check event exists

    event_exists = False

    for event in events:

        if event["id"] == event_id:

            event_exists = True

            break


    if not event_exists:

        return JsonResponse({

            "message": "Event not found"

        }, status=404)


    event_capacity[event_id] = capacity


    return JsonResponse({

        "message": "Event capacity set successfully",

        "event_id": event_id,

        "capacity": capacity

    })