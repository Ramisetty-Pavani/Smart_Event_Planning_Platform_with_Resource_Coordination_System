from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

import json
from datetime import datetime

from .models import Event
from registrations.models import Registration
from allocations.models import Allocation
from resources.models import Resource
from vendors.models import Vendor
from vendors.views import check_vendor_conflict
from notifications.views import create_notification
from dashboard.models import ConflictRecord


def get_user_role(request):
    if not request.user.is_authenticated:
        return None

    if request.user.is_superuser:
        return "Admin"

    try:
        return request.user.userprofile.role
    except Exception:
        return None


def times_overlap(start1, end1, start2, end2):
    return start1 < end2 and end1 > start2


def send_event_notification(event_id, message):
    try:
        create_notification(
            event_id,
            "Event",
            message
        )
    except Exception:
        pass


def check_resource_conflicts_for_event(
    event,
    new_date,
    new_start_time,
    new_end_time
):
    """
    Re-check all resources already allocated to an event
    against other events after a date/time change.

    Returns a conflict dictionary if a conflict is found.
    Otherwise returns None.
    """

    allocations = Allocation.objects.filter(
        event_id=event.id
    )

    for allocation in allocations:

        try:
            resource = Resource.objects.get(
                id=allocation.resource_id
            )

        except Resource.DoesNotExist:
            continue

        overlapping_quantity = 0
        conflicting_event_ids = []

        other_allocations = Allocation.objects.filter(
            resource_id=allocation.resource_id
        ).exclude(
            event_id=event.id
        )

        for other_allocation in other_allocations:

            try:
                other_event = Event.objects.get(
                    id=other_allocation.event_id
                )

            except Event.DoesNotExist:
                continue

            if other_event.date != new_date:
                continue

            if (
                other_event.start_time is None
                or other_event.end_time is None
            ):
                continue

            if new_start_time is None or new_end_time is None:
                continue

            if times_overlap(
                other_event.start_time,
                other_event.end_time,
                new_start_time,
                new_end_time
            ):

                overlapping_quantity += (
                    other_allocation.quantity
                )

                if (
                    other_allocation.event_id
                    not in conflicting_event_ids
                ):
                    conflicting_event_ids.append(
                        other_allocation.event_id
                    )

        total_required = (
            overlapping_quantity
            + allocation.quantity
        )

        if total_required > resource.quantity:

            return {
                "resource": resource,
                "allocation": allocation,
                "already_required": overlapping_quantity,
                "requested": allocation.quantity,
                "total_required": total_required,
                "conflicting_event_ids": (
                    conflicting_event_ids
                )
            }

    return None


def check_vendor_conflicts_for_event(
    event,
    new_date,
    new_start_time,
    new_end_time
):
    """
    Re-check active vendors assigned to an event
    against other events after a date/time change.
    """

    vendors = Vendor.objects.filter(
        event_id=event.id,
        status__in=["Pending", "Confirmed"]
    )

    for vendor in vendors:

        # Create a temporary event-like object
        # containing the proposed date/time.
        proposed_event = Event(
            id=event.id,
            date=new_date,
            start_time=new_start_time,
            end_time=new_end_time,
            location=event.location
        )

        conflict = check_vendor_conflict(
            vendor.company,
            proposed_event,
            exclude_vendor_id=vendor.id
        )

        if conflict:
            return {
                "vendor": vendor,
                "conflict": conflict
            }

    return None


@csrf_exempt
@login_required
def event_list(request):

    role = get_user_role(request)

    if role is None:
        return JsonResponse({
            "message": "User role not found"
        }, status=403)

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

    # Only Admin and Organizer can modify events
    if role not in ["Admin", "Organizer"]:
        return JsonResponse({
            "message": "You do not have permission to modify events"
        }, status=403)

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

        try:
            event_date = datetime.strptime(
                date,
                "%Y-%m-%d"
            ).date()

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Date must be in YYYY-MM-DD format"
            }, status=400)

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

        if event_start_time >= event_end_time:
            return JsonResponse({
                "message": "End time must be after start time"
            }, status=400)

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
            event = Event.objects.get(
                id=event_id
            )

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        # ==================================================
        # PREPARE PROPOSED VALUES
        # ==================================================

        new_name = event.name
        new_date = event.date
        new_start_time = event.start_time
        new_end_time = event.end_time
        new_location = event.location
        new_budget = event.budget
        new_capacity = event.capacity

        # ==================================================
        # NAME
        # ==================================================

        if "name" in data:

            if (
                not data["name"]
                or not data["name"].strip()
            ):
                return JsonResponse({
                    "message": "Event name cannot be empty"
                }, status=400)

            new_name = data["name"].strip()

        # ==================================================
        # DATE
        # ==================================================

        if "date" in data:

            try:
                new_date = datetime.strptime(
                    data["date"],
                    "%Y-%m-%d"
                ).date()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Date must be in YYYY-MM-DD format"
                }, status=400)

        # ==================================================
        # START TIME
        # ==================================================

        if "start_time" in data:

            try:
                new_start_time = datetime.strptime(
                    data["start_time"],
                    "%H:%M"
                ).time()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Start time must be in HH:MM format"
                }, status=400)

        # ==================================================
        # END TIME
        # ==================================================

        if "end_time" in data:

            try:
                new_end_time = datetime.strptime(
                    data["end_time"],
                    "%H:%M"
                ).time()

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "End time must be in HH:MM format"
                }, status=400)

        # ==================================================
        # TIME VALIDATION
        # ==================================================

        if new_start_time and new_end_time:

            if new_start_time >= new_end_time:
                return JsonResponse({
                    "message": "End time must be after start time"
                }, status=400)

        # ==================================================
        # LOCATION
        # ==================================================

        if "location" in data:

            if (
                not data["location"]
                or not data["location"].strip()
            ):
                return JsonResponse({
                    "message": "Event location cannot be empty"
                }, status=400)

            new_location = data["location"].strip()

        # ==================================================
        # BUDGET
        # ==================================================

        if "budget" in data:

            try:
                new_budget = float(
                    data["budget"]
                )

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Budget must be a valid number"
                }, status=400)

            if new_budget <= 0:
                return JsonResponse({
                    "message": "Budget must be greater than 0"
                }, status=400)

        # ==================================================
        # CAPACITY
        # ==================================================

        if "capacity" in data:

            try:
                new_capacity = int(
                    data["capacity"]
                )

            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Capacity must be a valid number"
                }, status=400)

            if new_capacity <= 0:
                return JsonResponse({
                    "message": "Capacity must be greater than 0"
                }, status=400)

            active_registrations = (
                Registration.objects.filter(
                    event_id=event.id
                )
                .exclude(
                    status="Cancelled"
                )
                .count()
            )

            if new_capacity < active_registrations:

                message = (
                    "Capacity cannot be less than the current "
                    "number of active registrations"
                )

                # Notify about rejected capacity change
                send_event_notification(
                    event.id,
                    "Last-minute event change rejected: "
                    + message
                )

                return JsonResponse({
                    "message": message,
                    "current_registrations":
                        active_registrations,
                    "requested_capacity":
                        new_capacity
                }, status=400)

        # ==================================================
        # 1. LOCATION CONFLICT CHECK
        # ==================================================

        if (
            new_start_time
            and new_end_time
            and new_location
        ):

            location_conflict = Event.objects.filter(
                date=new_date,
                location__iexact=new_location,
                start_time__lt=new_end_time,
                end_time__gt=new_start_time
            ).exclude(
                id=event.id
            ).exists()

            if location_conflict:

                message = (
                    "Location conflict: another event is already "
                    "scheduled at this location during this time"
                )

                send_event_notification(
                    event.id,
                    "Last-minute event change rejected: "
                    + message
                )

                ConflictRecord.objects.create(
                    conflict_type="Location",
                    event_id=event.id,
                    description=message,
                    status="Prevented"
                )

                return JsonResponse({
                    "message": message
                }, status=400)

        # ==================================================
        # 2. RESOURCE CONFLICT CHECK
        # ==================================================

        resource_conflict = (
            check_resource_conflicts_for_event(
                event,
                new_date,
                new_start_time,
                new_end_time
            )
        )

        if resource_conflict:

            resource = resource_conflict["resource"]

            message = (
                f"Resource conflict: changing this event "
                f"would make {resource.name} unavailable. "
                f"Requested: "
                f"{resource_conflict['requested']}, "
                f"already required by overlapping events: "
                f"{resource_conflict['already_required']}, "
                f"total capacity: {resource.quantity}."
            )

            send_event_notification(
                event.id,
                "Last-minute event change rejected: "
                + message
            )

            for conflicting_event_id in (
                resource_conflict["conflicting_event_ids"]
            ):

                ConflictRecord.objects.create(
                    conflict_type="Resource",
                    event_id=event.id,
                    conflicting_event_id=
                        conflicting_event_id,
                    resource_id=resource.id,
                    description=message,
                    status="Prevented"
                )

            return JsonResponse({
                "message": message,
                "resource": resource.name,
                "requested":
                    resource_conflict["requested"],
                "already_required":
                    resource_conflict["already_required"],
                "total_capacity":
                    resource.quantity,
                "conflicting_event_ids":
                    resource_conflict[
                        "conflicting_event_ids"
                    ]
            }, status=400)

        # ==================================================
        # 3. VENDOR CONFLICT CHECK
        # ==================================================

        vendor_conflict = (
            check_vendor_conflicts_for_event(
                event,
                new_date,
                new_start_time,
                new_end_time
            )
        )

        if vendor_conflict:

            vendor = vendor_conflict["vendor"]
            conflict = vendor_conflict["conflict"]

            if conflict["same_event"]:

                message = (
                    "Vendor conflict: this vendor would "
                    "overlap with another assignment for "
                    "the same event"
                )

            else:

                message = (
                    "Vendor conflict: changing this event "
                    "would make the vendor overlap with "
                    "another event"
                )

            send_event_notification(
                event.id,
                "Last-minute event change rejected: "
                + message
            )

            return JsonResponse({
                "message": message,
                "vendor": vendor.company,
                "conflicting_vendor_id":
                    conflict["vendor_id"],
                "conflicting_event_id":
                    conflict["event_id"]
            }, status=400)

        # ==================================================
        # ALL CHECKS PASSED
        # ==================================================

        event.name = new_name
        event.date = new_date
        event.start_time = new_start_time
        event.end_time = new_end_time
        event.location = new_location
        event.budget = new_budget
        event.capacity = new_capacity

        event.save()

        # ==================================================
        # UPDATE EXISTING ALLOCATION TIMES
        # ==================================================

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        for allocation in allocations:
            allocation.start_time = event.start_time
            allocation.end_time = event.end_time
            allocation.save()

        # ==================================================
        # SUCCESS NOTIFICATION
        # ==================================================

        send_event_notification(
            event.id,
            "Event details were changed successfully. "
            "Existing resource allocations were updated "
            "to match the new event timing."
        )

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
            event = Event.objects.get(
                id=event_id
            )

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        event.delete()

        return JsonResponse({
            "message": "Event deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)