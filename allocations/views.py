from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Allocation
from resources.models import Resource
from notifications.views import create_notification


@csrf_exempt
def allocation_list(request):

    if request.method == "GET":

        allocations = Allocation.objects.all().order_by("-id")

        result = []

        for allocation in allocations:
            result.append({
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity
            })

        return JsonResponse({
            "message": "Allocations retrieved successfully",
            "allocations": result
        })

    elif request.method == "POST":

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
                "message": "event_id is required"
            }, status=400)

        if resource_id is None:
            return JsonResponse({
                "message": "resource_id is required"
            }, status=400)

        if quantity is None:
            return JsonResponse({
                "message": "quantity is required"
            }, status=400)

        try:
            event_id = int(event_id)
            resource_id = int(resource_id)
            quantity = int(quantity)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id, resource_id and quantity must be valid numbers"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        if quantity <= 0:
            return JsonResponse({
                "message": "quantity must be greater than 0"
            }, status=400)

        try:
            resource = Resource.objects.get(
                id=resource_id
            )
        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        if quantity > resource.available:

            create_notification(
                event_id,
                "Resource",
                "Resource conflict detected for event "
                + str(event_id)
            )

            return JsonResponse({
                "message": "Resource conflict",
                "error": "Not enough resources available",
                "available": resource.available,
                "requested": quantity
            }, status=400)

        resource.available -= quantity
        resource.save()

        allocation = Allocation.objects.create(
            event_id=event_id,
            resource_id=resource_id,
            quantity=quantity
        )

        return JsonResponse({
            "message": "Resource allocated successfully",
            "allocation": {
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity
            },
            "remaining_available": resource.available
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        allocation_id = data.get("id")
        new_quantity = data.get("quantity")

        if allocation_id is None:
            return JsonResponse({
                "message": "Allocation id is required"
            }, status=400)

        if new_quantity is None:
            return JsonResponse({
                "message": "quantity is required"
            }, status=400)

        try:
            allocation_id = int(allocation_id)
            new_quantity = int(new_quantity)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "id and quantity must be valid numbers"
            }, status=400)

        if new_quantity <= 0:
            return JsonResponse({
                "message": "quantity must be greater than 0"
            }, status=400)

        try:
            allocation = Allocation.objects.get(
                id=allocation_id
            )
        except Allocation.DoesNotExist:
            return JsonResponse({
                "message": "Allocation not found"
            }, status=404)

        try:
            resource = Resource.objects.get(
                id=allocation.resource_id
            )
        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        old_quantity = allocation.quantity

        if new_quantity > old_quantity:

            extra_quantity = new_quantity - old_quantity

            if extra_quantity > resource.available:

                create_notification(
                    allocation.event_id,
                    "Resource",
                    "Resource conflict detected for event "
                    + str(allocation.event_id)
                )

                return JsonResponse({
                    "message": "Resource conflict",
                    "error": "Not enough resources available",
                    "available": resource.available,
                    "requested_extra": extra_quantity
                }, status=400)

            resource.available -= extra_quantity

        elif new_quantity < old_quantity:

            released_quantity = old_quantity - new_quantity

            resource.available += released_quantity

        allocation.quantity = new_quantity

        resource.save()
        allocation.save()

        return JsonResponse({
            "message": "Allocation updated successfully",
            "allocation": {
                "id": allocation.id,
                "event_id": allocation.event_id,
                "resource_id": allocation.resource_id,
                "quantity": allocation.quantity
            },
            "remaining_available": resource.available
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        allocation_id = data.get("id")

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

        try:
            resource = Resource.objects.get(
                id=allocation.resource_id
            )
        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        released_quantity = allocation.quantity

        resource.available += released_quantity

        resource.save()
        allocation.delete()

        return JsonResponse({
            "message": "Allocation deleted successfully",
            "released_quantity": released_quantity,
            "available": resource.available
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)