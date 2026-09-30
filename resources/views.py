from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Resource


@csrf_exempt
def resource_list(request):

    # =========================
    # GET - VIEW RESOURCES
    # =========================
    if request.method == "GET":

        resources = Resource.objects.all().order_by("-id")

        resource_data = []

        for resource in resources:
            resource_data.append({
                "id": resource.id,
                "name": resource.name,
                "quantity": resource.quantity,
                "available": resource.available,
                "allocated": resource.quantity - resource.available
            })

        return JsonResponse({
            "message": "Resources retrieved successfully",
            "resources": resource_data
        })


    # =========================
    # POST - CREATE RESOURCE
    # =========================
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
                "message": "Resource quantity is required"
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

        # Prevent duplicate resource names
        existing = Resource.objects.filter(
            name__iexact=name.strip()
        ).exists()

        if existing:
            return JsonResponse({
                "message": "Resource with this name already exists"
            }, status=400)

        resource = Resource.objects.create(
            name=name.strip(),
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


    # =========================
    # PUT - UPDATE RESOURCE
    # =========================
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
            resource = Resource.objects.get(
                id=resource_id
            )

        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        # Update name
        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Resource name cannot be empty"
                }, status=400)

            duplicate = Resource.objects.filter(
                name__iexact=data["name"].strip()
            ).exclude(
                id=resource.id
            ).exists()

            if duplicate:
                return JsonResponse({
                    "message": "Resource with this name already exists"
                }, status=400)

            resource.name = data["name"].strip()

        # Update quantity
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

            allocated = resource.quantity - resource.available

            # Cannot reduce total below already allocated amount
            if new_quantity < allocated:
                return JsonResponse({
                    "message": (
                        "Quantity cannot be less than "
                        "already allocated quantity"
                    ),
                    "allocated": allocated,
                    "requested_quantity": new_quantity
                }, status=400)

            resource.quantity = new_quantity
            resource.available = new_quantity - allocated

        # Direct available update
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
                    "message": (
                        "Available quantity cannot be greater "
                        "than total quantity"
                    )
                }, status=400)

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


    # =========================
    # DELETE - DELETE RESOURCE
    # =========================
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
            resource = Resource.objects.get(
                id=resource_id
            )

        except Resource.DoesNotExist:
            return JsonResponse({
                "message": "Resource not found"
            }, status=404)

        allocated = resource.quantity - resource.available

        if allocated > 0:
            return JsonResponse({
                "message": (
                    "Cannot delete resource because it "
                    "is currently allocated"
                ),
                "allocated": allocated
            }, status=400)

        resource.delete()

        return JsonResponse({
            "message": "Resource deleted successfully"
        })


    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)