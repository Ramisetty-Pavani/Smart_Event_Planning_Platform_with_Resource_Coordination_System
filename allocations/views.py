from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from resources.views import resources

allocations = []


@csrf_exempt
def allocation_list(request):

    # GET
    if request.method == "GET":

        return JsonResponse({
            "message": "Allocations retrieved successfully",
            "allocations": allocations
        })

    # POST
    elif request.method == "POST":

        data = json.loads(request.body)

        event_id = data.get("event_id")
        resource_id = data.get("resource_id")
        quantity = int(data.get("quantity"))

        for resource in resources:

            if resource["id"] == resource_id:

                if quantity > resource["available"]:
                    return JsonResponse({
                        "message": "Resource conflict",
                        "error": "Not enough resources available",
                        "available": resource["available"],
                        "requested": quantity
                    }, status=400)

                resource["available"] -= quantity

                allocation = {
                    "id": len(allocations) + 1,
                    "event_id": event_id,
                    "resource_id": resource_id,
                    "quantity": quantity
                }

                allocations.append(allocation)

                return JsonResponse({
                    "message": "Resource allocated successfully",
                    "allocation": allocation,
                    "remaining_available": resource["available"]
                }, status=201)

        return JsonResponse({
            "message": "Resource not found"
        }, status=404)

    # PUT
    elif request.method == "PUT":

        data = json.loads(request.body)

        allocation_id = data.get("id")
        new_quantity = int(data.get("quantity"))

        for allocation in allocations:

            if allocation["id"] == allocation_id:

                resource_id = allocation["resource_id"]
                old_quantity = allocation["quantity"]

                for resource in resources:

                    if resource["id"] == resource_id:

                        # If increasing quantity
                        if new_quantity > old_quantity:

                            extra_quantity = new_quantity - old_quantity

                            if extra_quantity > resource["available"]:
                                return JsonResponse({
                                    "message": "Resource conflict",
                                    "error": "Not enough resources available",
                                    "available": resource["available"],
                                    "requested_extra": extra_quantity
                                }, status=400)

                            resource["available"] -= extra_quantity

                        # If decreasing quantity
                        elif new_quantity < old_quantity:

                            released_quantity = old_quantity - new_quantity

                            resource["available"] += released_quantity

                        allocation["quantity"] = new_quantity

                        return JsonResponse({
                            "message": "Allocation updated successfully",
                            "allocation": allocation,
                            "remaining_available": resource["available"]
                        })

                return JsonResponse({
                    "message": "Resource not found"
                }, status=404)

        return JsonResponse({
            "message": "Allocation not found"
        }, status=404)

    # DELETE
    elif request.method == "DELETE":

        data = json.loads(request.body)

        allocation_id = data.get("id")

        for allocation in allocations:

            if allocation["id"] == allocation_id:

                resource_id = allocation["resource_id"]
                released_quantity = allocation["quantity"]

                for resource in resources:

                    if resource["id"] == resource_id:

                        resource["available"] += released_quantity

                        allocations.remove(allocation)

                        return JsonResponse({
                            "message": "Allocation deleted successfully",
                            "released_quantity": released_quantity,
                            "available": resource["available"]
                        })

                return JsonResponse({
                    "message": "Resource not found"
                }, status=404)

        return JsonResponse({
            "message": "Allocation not found"
        }, status=404)