from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .models import Resource
from allocations.models import Allocation
from events.models import Event


@csrf_exempt
def resource_list(request, id=None):

    # GET
    if request.method == "GET":

        if id is not None:
            try:
                resource = Resource.objects.get(id=id)

                allocated = resource.quantity - resource.available

                return JsonResponse({
                    "id": resource.id,
                    "name": resource.name,
                    "quantity": resource.quantity,
                    "available": resource.available,
                    "allocated": allocated
                })

            except Resource.DoesNotExist:
                return JsonResponse({
                    "message": "Resource not found"
                }, status=404)

        resources = Resource.objects.all()

        data = []

        for resource in resources:
            allocated = resource.quantity - resource.available

            data.append({
                "id": resource.id,
                "name": resource.name,
                "quantity": resource.quantity,
                "available": resource.available,
                "allocated": allocated
            })

        return JsonResponse({
            "message": "Resources retrieved successfully",
            "resources": data
        })


    # POST
    if request.method == "POST":

        try:
            data = json.loads(request.body)

            name = data.get("name")
            quantity = data.get("quantity")

            if not name:
                return JsonResponse({
                    "message": "Resource name is required"
                }, status=400)

            if quantity is None:
                return JsonResponse({
                    "message": "Quantity is required"
                }, status=400)

            try:
                quantity = int(quantity)
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Quantity must be an integer"
                }, status=400)

            if quantity <= 0:
                return JsonResponse({
                    "message": "Quantity must be greater than zero"
                }, status=400)

            if Resource.objects.filter(name__iexact=name).exists():
                return JsonResponse({
                    "message": "Resource with this name already exists"
                }, status=400)

            resource = Resource.objects.create(
                name=name,
                quantity=quantity,
                available=quantity
            )

            return JsonResponse({
                "message": "Resource created successfully",
                "resource": {
                    "id": resource.id,
                    "name": resource.name,
                    "quantity": resource.quantity,
                    "available": resource.available,
                    "allocated": 0
                }
            }, status=201)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON"
            }, status=400)


    # PUT
    if request.method == "PUT":

        try:
            resource_id = id

            if resource_id is None:
                data = json.loads(request.body)
                resource_id = data.get("id")
            else:
                data = json.loads(request.body)

            if resource_id is None:
                return JsonResponse({
                    "message": "Resource ID is required"
                }, status=400)

            try:
                resource = Resource.objects.get(id=resource_id)
            except Resource.DoesNotExist:
                return JsonResponse({
                    "message": "Resource not found"
                }, status=404)

            new_name = data.get("name", resource.name)
            new_quantity = data.get("quantity", resource.quantity)
            new_available = data.get("available", resource.available)

            try:
                new_quantity = int(new_quantity)
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Quantity must be an integer"
                }, status=400)

            try:
                new_available = int(new_available)
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Available quantity must be an integer"
                }, status=400)

            if new_quantity <= 0:
                return JsonResponse({
                    "message": "Quantity must be greater than zero"
                }, status=400)

            if new_available < 0 or new_available > new_quantity:
                return JsonResponse({
                    "message": "Available quantity must be between 0 and total quantity"
                }, status=400)

            # Prevent duplicate resource names
            if Resource.objects.filter(
                name__iexact=new_name
            ).exclude(id=resource.id).exists():

                return JsonResponse({
                    "message": "Resource with this name already exists"
                }, status=400)


            # ------------------------------------------------
            # CHECK ACTUAL ALLOCATIONS
            # ------------------------------------------------

            allocations = Allocation.objects.filter(
                resource_id=resource.id
            )

            max_simultaneous_required = 0

            allocation_list = []

            for allocation in allocations:

                try:
                    event = Event.objects.get(
                        id=allocation.event_id
                    )
                except Event.DoesNotExist:
                    continue

                # If event has no time information,
                # we cannot perform time-based overlap checking.
                if (
                    not event.start_time
                    or not event.end_time
                    or not event.date
                ):
                    continue

                allocation_list.append({
                    "event": event,
                    "quantity": allocation.quantity
                })


            # Find maximum simultaneous allocation
            for current in allocation_list:

                current_event = current["event"]
                total_required = current["quantity"]

                for other in allocation_list:

                    other_event = other["event"]

                    if current_event.id == other_event.id:
                        continue

                    if current_event.date != other_event.date:
                        continue

                    # Time overlap:
                    # startA < endB AND endA > startB

                    overlaps = (
                        current_event.start_time < other_event.end_time
                        and current_event.end_time > other_event.start_time
                    )

                    if overlaps:
                        total_required += other["quantity"]

                max_simultaneous_required = max(
                    max_simultaneous_required,
                    total_required
                )


            # Requested quantity cannot be less than
            # the maximum number required at the same time.

            if new_quantity < max_simultaneous_required:

                return JsonResponse({
                    "message": "Quantity cannot be less than existing allocation requirement",
                    "maximum_simultaneous_required": max_simultaneous_required,
                    "requested_quantity": new_quantity
                }, status=400)


            # ------------------------------------------------
            # UPDATE RESOURCE
            # ------------------------------------------------

            resource.name = new_name
            resource.quantity = new_quantity
            resource.available = new_available

            resource.save()

            allocated = resource.quantity - resource.available

            return JsonResponse({
                "message": "Resource updated successfully",
                "resource": {
                    "id": resource.id,
                    "name": resource.name,
                    "quantity": resource.quantity,
                    "available": resource.available,
                    "allocated": allocated
                }
            })


        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON"
            }, status=400)


    # DELETE
    if request.method == "DELETE":

        try:

            resource_id = id

            if resource_id is None:

                if request.body:
                    data = json.loads(request.body)
                    resource_id = data.get("id")

            if resource_id is None:
                return JsonResponse({
                    "message": "Resource ID is required"
                }, status=400)

            try:
                resource = Resource.objects.get(id=resource_id)
            except Resource.DoesNotExist:
                return JsonResponse({
                    "message": "Resource not found"
                }, status=404)

            allocations_exist = Allocation.objects.filter(
                resource_id=resource.id
            ).exists()

            if allocations_exist:
                return JsonResponse({
                    "message": "Cannot delete resource because it has existing allocations"
                }, status=400)

            resource.delete()

            return JsonResponse({
                "message": "Resource deleted successfully"
            })

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON"
            }, status=400)


    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)