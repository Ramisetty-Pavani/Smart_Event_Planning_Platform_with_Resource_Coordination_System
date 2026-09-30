from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json
from datetime import datetime

from .models import Event


@csrf_exempt
def event_list(request):

    # =========================
    # GET - VIEW ALL EVENTS
    # =========================
    if request.method == "GET":

        events = Event.objects.all().order_by("-id")

        event_data = []

        for event in events:
            event_data.append({
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "start_time": (
                    event.start_time.strftime("%H:%M")
                    if event.start_time else None
                ),
                "end_time": (
                    event.end_time.strftime("%H:%M")
                    if event.end_time else None
                ),
                "location": event.location,
                "budget": float(event.budget),
                "capacity": event.capacity
            })

        return JsonResponse({
            "message": "Events retrieved successfully",
            "events": event_data
        })


    # =========================
    # POST - CREATE EVENT
    # =========================
    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        name = data.get("name")
        date = data.get("date")
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        location = data.get("location")
        budget = data.get("budget")
        capacity = data.get("capacity")

        # Required fields
        if not name or not name.strip():
            return JsonResponse({
                "message": "Event name is required"
            }, status=400)

        if not date:
            return JsonResponse({
                "message": "Event date is required"
            }, status=400)

        if not start_time:
            return JsonResponse({
                "message": "Start time is required"
            }, status=400)

        if not end_time:
            return JsonResponse({
                "message": "End time is required"
            }, status=400)

        if not location or not location.strip():
            return JsonResponse({
                "message": "Event location is required"
            }, status=400)

        if budget is None:
            return JsonResponse({
                "message": "Budget is required"
            }, status=400)

        # Date validation
        try:
            event_date = datetime.strptime(
                date,
                "%Y-%m-%d"
            ).date()

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Date must be in YYYY-MM-DD format"
            }, status=400)

        # Time validation
        try:
            event_start_time = datetime.strptime(
                start_time,
                "%H:%M"
            ).time()

            event_end_time = datetime.strptime(
                end_time,
                "%H:%M"
            ).time()

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Time must be in HH:MM format"
            }, status=400)

        # Start time must be before end time
        if event_start_time >= event_end_time:
            return JsonResponse({
                "message": "End time must be after start time"
            }, status=400)

        # Budget validation
        try:
            event_budget = float(budget)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Budget must be a valid number"
            }, status=400)

        if event_budget <= 0:
            return JsonResponse({
                "message": "Budget must be greater than 0"
            }, status=400)

        # Capacity validation
        event_capacity = None

        if capacity is not None:
            try:
                event_capacity = int(capacity)

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Capacity must be a valid number"
                }, status=400)

            if event_capacity <= 0:
                return JsonResponse({
                    "message": "Capacity must be greater than 0"
                }, status=400)

        # Venue conflict check
        location_conflict = Event.objects.filter(
            date=event_date,
            location__iexact=location.strip(),
            start_time__lt=event_end_time,
            end_time__gt=event_start_time
        ).exists()

        if location_conflict:
            return JsonResponse({
                "message": (
                    "Location conflict: another event is already "
                    "scheduled at this location during this time"
                )
            }, status=400)

        # Create event
        event = Event.objects.create(
            name=name.strip(),
            date=event_date,
            start_time=event_start_time,
            end_time=event_end_time,
            location=location.strip(),
            budget=event_budget,
            capacity=event_capacity
        )

        return JsonResponse({
            "message": "Event created successfully",
            "event": {
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "start_time": event.start_time.strftime("%H:%M"),
                "end_time": event.end_time.strftime("%H:%M"),
                "location": event.location,
                "budget": float(event.budget),
                "capacity": event.capacity
            }
        }, status=201)


    # =========================
    # PUT - UPDATE EVENT
    # =========================
    elif request.method == "PUT":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("id")

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

        try:
            event = Event.objects.get(id=event_id)

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        # Name
        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Event name cannot be empty"
                }, status=400)

            event.name = data["name"].strip()

        # Date
        if "date" in data:

            try:
                event.date = datetime.strptime(
                    data["date"],
                    "%Y-%m-%d"
                ).date()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Date must be in YYYY-MM-DD format"
                }, status=400)

        # Start time
        if "start_time" in data:

            try:
                event.start_time = datetime.strptime(
                    data["start_time"],
                    "%H:%M"
                ).time()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Start time must be in HH:MM format"
                }, status=400)

        # End time
        if "end_time" in data:

            try:
                event.end_time = datetime.strptime(
                    data["end_time"],
                    "%H:%M"
                ).time()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "End time must be in HH:MM format"
                }, status=400)

        # Time conflict validation
        if event.start_time and event.end_time:

            if event.start_time >= event.end_time:
                return JsonResponse({
                    "message": "End time must be after start time"
                }, status=400)

        # Location
        if "location" in data:

            if not data["location"] or not data["location"].strip():
                return JsonResponse({
                    "message": "Event location cannot be empty"
                }, status=400)

            event.location = data["location"].strip()

        # Budget
        if "budget" in data:

            try:
                new_budget = float(data["budget"])

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Budget must be a valid number"
                }, status=400)

            if new_budget <= 0:
                return JsonResponse({
                    "message": "Budget must be greater than 0"
                }, status=400)

            event.budget = new_budget

        # Capacity
        if "capacity" in data:

            try:
                new_capacity = int(data["capacity"])

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Capacity must be a valid number"
                }, status=400)

            if new_capacity <= 0:
                return JsonResponse({
                    "message": "Capacity must be greater than 0"
                }, status=400)

            # Check existing registrations
            from registrations.models import Registration

            active_registrations = Registration.objects.filter(
                event_id=event.id
            ).exclude(
                status="Cancelled"
            ).count()

            if new_capacity < active_registrations:
                return JsonResponse({
                    "message": (
                        "Capacity cannot be less than the current "
                        "number of active registrations"
                    ),
                    "current_registrations": active_registrations,
                    "requested_capacity": new_capacity
                }, status=400)

            event.capacity = new_capacity

        # Venue conflict check during update
        if (
            event.start_time
            and event.end_time
            and event.location
        ):

            location_conflict = Event.objects.filter(
                date=event.date,
                location__iexact=event.location,
                start_time__lt=event.end_time,
                end_time__gt=event.start_time
            ).exclude(
                id=event.id
            ).exists()

            if location_conflict:
                return JsonResponse({
                    "message": (
                        "Location conflict: another event is already "
                        "scheduled at this location during this time"
                    )
                }, status=400)

        # Save changes
        event.save()

        return JsonResponse({
            "message": "Event updated successfully",
            "event": {
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "start_time": (
                    event.start_time.strftime("%H:%M")
                    if event.start_time else None
                ),
                "end_time": (
                    event.end_time.strftime("%H:%M")
                    if event.end_time else None
                ),
                "location": event.location,
                "budget": float(event.budget),
                "capacity": event.capacity
            }
        })


    # =========================
    # DELETE - DELETE EVENT
    # =========================
    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("id")

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

        try:
            event = Event.objects.get(id=event_id)

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        event.delete()

        return JsonResponse({
            "message": "Event deleted successfully"
        })


    # =========================
    # OTHER METHODS
    # =========================
    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)