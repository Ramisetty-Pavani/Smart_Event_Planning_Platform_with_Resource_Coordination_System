import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Allocation
from events.models import Event
from resources.models import Resource
from notifications.views import create_notification
from dashboard.models import ConflictRecord


def send_notification(event_id, message):
    try:
        create_notification(event_id, "Resource", message)
    except Exception:
        pass


def times_overlap(start1, end1, start2, end2):
    return start1 < end2 and end1 > start2


@csrf_exempt
def allocation_list(request, id=None):

    # =========================
    # GET ALL ALLOCATIONS
    # =========================
    if request.method == "GET":

        allocations = Allocation.objects.all().order_by("-id")

        data = []

        for allocation in allocations:
            data.append({
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity,
                "start_time": allocation.start_time,
                "end_time": allocation.end_time
            })

        return JsonResponse({
            "message": "Allocations retrieved successfully",
            "allocations": data
        })

    # =========================
    # POST - CREATE ALLOCATION
    # =========================
    if request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        resource_id = data.get("resource_id")
        quantity = data.get("quantity")

        if event_id is None:
            return JsonResponse({
                "message": "Event id is required"
            }, status=400)

        if resource_id is None:
            return JsonResponse({
                "message": "Resource id is required"
            }, status=400)

        if quantity is None:
            return JsonResponse({
                "message": "Quantity is required"
            }, status=400)

        try:
            event_id = int(event_id)
            resource_id = int(resource_id)
            quantity = int(quantity)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Event id, resource id and quantity must be valid numbers"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "Event id must be greater than 0"
            }, status=400)

        if resource_id <= 0:
            return JsonResponse({
                "message": "Resource id must be greater than 0"
            }, status=400)

        if quantity <= 0:
            return JsonResponse({
                "message": "Quantity must be greater than 0"
            }, status=400)

        # Check event
        try:
            event = Event.objects.get(id=event_id)

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        if event.start_time is None or event.end_time is None:
            return JsonResponse({
                "message": "Event must have start time and end time before allocating resources"
            }, status=400)

        if event.start_time >= event.end_time:
            return JsonResponse({
                "message": "Event start time must be before end time"
            }, status=400)

        # Check resource
        try:
            resource = Resource.objects.get(id=resource_id)

        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        if quantity > resource.quantity:
            return JsonResponse({
                "message": "Requested quantity cannot exceed total resource quantity",
                "available_total": resource.quantity,
                "requested": quantity
            }, status=400)

        # Same resource cannot be allocated twice
        # to the same event
        existing_same_event = Allocation.objects.filter(
            event_id=event_id,
            resource_id=resource_id
        ).first()

        if existing_same_event:
            return JsonResponse({
                "message": "This resource is already allocated to this event",
                "existing_quantity": existing_same_event.quantity
            }, status=400)

        # Check overlapping allocations
        overlapping_allocations = Allocation.objects.filter(
            resource_id=resource_id
        ).exclude(
            event_id=event_id
        )

        overlapping_quantity = 0
        conflicting_events = []

        for allocation in overlapping_allocations:

            try:
                existing_event = Event.objects.get(
                    id=allocation.event_id
                )

            except Event.DoesNotExist:
                continue

            if existing_event.date != event.date:
                continue

            if (
                existing_event.start_time is None
                or existing_event.end_time is None
            ):
                continue

            if times_overlap(
                existing_event.start_time,
                existing_event.end_time,
                event.start_time,
                event.end_time
            ):

                overlapping_quantity += allocation.quantity

                if allocation.event_id not in conflicting_events:
                    conflicting_events.append(
                        allocation.event_id
                    )

        total_required = overlapping_quantity + quantity

        # Resource capacity conflict
        if total_required > resource.quantity:

            message = (
                f"Resource conflict detected for {resource.name}. "
                f"Requested: {quantity}, "
                f"already required during overlapping events: "
                f"{overlapping_quantity}, "
                f"total capacity: {resource.quantity}."
            )

            send_notification(
                event_id,
                message
            )

            for conflicting_event_id in conflicting_events:

                ConflictRecord.objects.create(
                    conflict_type="Resource",
                    event_id=event_id,
                    conflicting_event_id=conflicting_event_id,
                    resource_id=resource.id,
                    description=message,
                    status="Prevented"
                )

            return JsonResponse({
                "message": "Resource conflict: insufficient resources during this time",
                "resource": resource.name,
                "total_quantity": resource.quantity,
                "already_required": overlapping_quantity,
                "requested": quantity,
                "conflicting_event_ids": conflicting_events
            }, status=400)

        # Create allocation
        allocation = Allocation.objects.create(
            event_id=event_id,
            resource_id=resource_id,
            quantity=quantity,
            start_time=event.start_time,
            end_time=event.end_time
        )

        return JsonResponse({
            "message": "Resource allocated successfully",
            "allocation": {
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity,
                "start_time": allocation.start_time,
                "end_time": allocation.end_time
            }
        }, status=201)

    # =========================
    # PUT - UPDATE ALLOCATION
    # =========================
    if request.method == "PUT":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        # Prefer ID from URL.
        # If URL ID is not provided, allow ID from JSON
        # for backward compatibility.
        allocation_id = id if id is not None else data.get("id")

        if allocation_id is None:
            return JsonResponse({
                "message": "Allocation id is required"
            }, status=400)

        try:
            allocation_id = int(allocation_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Allocation id must be a valid number"
            }, status=400)

        # Find allocation
        try:
            allocation = Allocation.objects.get(
                id=allocation_id
            )

        except Allocation.DoesNotExist:
            return JsonResponse({
                "message": "Allocation not found"
            }, status=404)

        if "quantity" not in data:
            return JsonResponse({
                "message": "Quantity is required"
            }, status=400)

        try:
            new_quantity = int(data["quantity"])

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Quantity must be a valid number"
            }, status=400)

        if new_quantity <= 0:
            return JsonResponse({
                "message": "Quantity must be greater than 0"
            }, status=400)

        # Check associated event
        try:
            event = Event.objects.get(
                id=allocation.event_id
            )

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Associated event not found"
            }, status=404)

        if event.start_time is None or event.end_time is None:
            return JsonResponse({
                "message": "Event must have start time and end time"
            }, status=400)

        if event.start_time >= event.end_time:
            return JsonResponse({
                "message": "Event start time must be before end time"
            }, status=400)

        # Check associated resource
        try:
            resource = Resource.objects.get(
                id=allocation.resource_id
            )

        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Associated resource not found"
            }, status=404)

        if new_quantity > resource.quantity:
            return JsonResponse({
                "message": "Requested quantity exceeds total resource quantity",
                "total_quantity": resource.quantity,
                "requested": new_quantity
            }, status=400)

        # Check other allocations for overlap
        overlapping_quantity = 0
        conflicting_events = []

        other_allocations = Allocation.objects.filter(
            resource_id=resource.id
        ).exclude(
            id=allocation.id
        )

        for other in other_allocations:

            try:
                other_event = Event.objects.get(
                    id=other.event_id
                )

            except Event.DoesNotExist:
                continue

            if other_event.date != event.date:
                continue

            if (
                other_event.start_time is None
                or other_event.end_time is None
            ):
                continue

            if times_overlap(
                other_event.start_time,
                other_event.end_time,
                event.start_time,
                event.end_time
            ):

                overlapping_quantity += other.quantity

                if other.event_id not in conflicting_events:
                    conflicting_events.append(
                        other.event_id
                    )

        # Check total capacity
        if overlapping_quantity + new_quantity > resource.quantity:

            message = (
                f"Resource allocation update causes a conflict "
                f"for {resource.name}. "
                f"Requested: {new_quantity}, "
                f"already required during overlapping events: "
                f"{overlapping_quantity}, "
                f"total capacity: {resource.quantity}."
            )

            send_notification(
                event.id,
                message
            )

            for conflicting_event_id in conflicting_events:

                ConflictRecord.objects.create(
                    conflict_type="Resource",
                    event_id=event.id,
                    conflicting_event_id=conflicting_event_id,
                    resource_id=resource.id,
                    description=message,
                    status="Prevented"
                )

            return JsonResponse({
                "message": "Resource conflict: updated quantity is not available",
                "resource": resource.name,
                "total_quantity": resource.quantity,
                "already_required": overlapping_quantity,
                "requested": new_quantity,
                "conflicting_event_ids": conflicting_events
            }, status=400)

        # Update allocation
        allocation.quantity = new_quantity
        allocation.start_time = event.start_time
        allocation.end_time = event.end_time

        allocation.save()

        return JsonResponse({
            "message": "Allocation updated successfully",
            "allocation": {
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity,
                "start_time": allocation.start_time,
                "end_time": allocation.end_time
            }
        })

    # =========================
    # DELETE - DELETE ALLOCATION
    # =========================
    if request.method == "DELETE":

        try:
            data = json.loads(request.body) if request.body else {}

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        # Prefer ID from URL.
        # If URL ID is not provided, allow ID from JSON.
        allocation_id = id if id is not None else data.get("id")

        if allocation_id is None:
            return JsonResponse({
                "message": "Allocation id is required"
            }, status=400)

        try:
            allocation_id = int(allocation_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Allocation id must be a valid number"
            }, status=400)

        try:
            allocation = Allocation.objects.get(
                id=allocation_id
            )

        except Allocation.DoesNotExist:
            return JsonResponse({
                "message": "Allocation not found"
            }, status=404)

        allocation.delete()

        return JsonResponse({
            "message": "Allocation deleted and resource allocation released successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)