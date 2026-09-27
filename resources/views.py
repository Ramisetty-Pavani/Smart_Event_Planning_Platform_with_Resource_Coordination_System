from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Resource


@csrf_exempt
def resource_list(request):

    if request.method == "GET":

        resources = Resource.objects.all().order_by("-id")

        result = []

        for resource in resources:
            result.append({
                "id": resource.id,
                "name": resource.name,
                "quantity": resource.quantity,
                "available": resource.available
            })

        return JsonResponse({
            "message": "Resources retrieved successfully",
            "resources": result
        })

    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        name = data.get("name")
        quantity = data.get("quantity")

        if not name or not name.strip():
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
                "message": "Quantity must be a valid number"
            }, status=400)

        if quantity <= 0:
            return JsonResponse({
                "message": "Quantity must be greater than 0"
            }, status=400)

        resource = Resource.objects.create(
            name=name.strip(),
            quantity=quantity,
            available=quantity
        )

        return JsonResponse({
            "message": "Resource added successfully",
            "resource": {
                "id": resource.id,
                "name": resource.name,
                "quantity": resource.quantity,
                "available": resource.available
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        resource_id = data.get("id")

        if resource_id is None:
            return JsonResponse({
                "message": "Resource id is required"
            }, status=400)

        try:
            resource_id = int(resource_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Resource id must be a valid number"
            }, status=400)

        try:
            resource = Resource.objects.get(id=resource_id)
        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Resource name cannot be empty"
                }, status=400)

            resource.name = data["name"].strip()

        if "quantity" in data:

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

            used_quantity = resource.quantity - resource.available

            if new_quantity < used_quantity:
                return JsonResponse({
                    "message": "Quantity cannot be less than already allocated quantity",
                    "allocated": used_quantity
                }, status=400)

            resource.quantity = new_quantity
            resource.available = new_quantity - used_quantity

        if "available" in data:

            try:
                new_available = int(data["available"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Available quantity must be a valid number"
                }, status=400)

            if new_available < 0:
                return JsonResponse({
                    "message": "Available quantity cannot be negative"
                }, status=400)

            if new_available > resource.quantity:
                return JsonResponse({
                    "message": "Available quantity cannot exceed total quantity"
                }, status=400)

            resource.available = new_available

        resource.save()

        return JsonResponse({
            "message": "Resource updated successfully",
            "resource": {
                "id": resource.id,
                "name": resource.name,
                "quantity": resource.quantity,
                "available": resource.available
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        resource_id = data.get("id")

        if resource_id is None:
            return JsonResponse({
                "message": "Resource id is required"
            }, status=400)

        try:
            resource_id = int(resource_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Resource id must be a valid number"
            }, status=400)

        try:
            resource = Resource.objects.get(id=resource_id)
        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        resource.delete()

        return JsonResponse({
            "message": "Resource deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)