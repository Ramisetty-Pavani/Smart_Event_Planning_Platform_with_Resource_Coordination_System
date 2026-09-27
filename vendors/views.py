from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Vendor
from notifications.views import create_notification


ALLOWED_STATUS = [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled"
]


@csrf_exempt
def vendor_list(request):

    if request.method == "GET":

        vendors = Vendor.objects.all().order_by("-id")

        result = []

        for vendor in vendors:
            result.append({
                "id": vendor.id,
                "event_id": vendor.event_id,
                "name": vendor.name,
                "company": vendor.company,
                "service": vendor.service,
                "cost": float(vendor.cost),
                "status": vendor.status
            })

        return JsonResponse({
            "message": "Vendors retrieved successfully",
            "vendors": result
        })

    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        name = data.get("name")
        company = data.get("company")
        service = data.get("service")
        cost = data.get("cost")
        status = data.get("status", "Pending")

        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        if not name or not name.strip():
            return JsonResponse({
                "message": "Vendor name is required"
            }, status=400)

        if not company or not company.strip():
            return JsonResponse({
                "message": "Company name is required"
            }, status=400)

        if not service or not service.strip():
            return JsonResponse({
                "message": "Service is required"
            }, status=400)

        if cost is None:
            return JsonResponse({
                "message": "Cost is required"
            }, status=400)

        try:
            event_id = int(event_id)
            cost = float(cost)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id and cost must be valid numbers"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        if cost < 0:
            return JsonResponse({
                "message": "Cost cannot be negative"
            }, status=400)

        if status not in ALLOWED_STATUS:
            return JsonResponse({
                "message": "Invalid status",
                "allowed_status": ALLOWED_STATUS
            }, status=400)

        vendor = Vendor.objects.create(
            event_id=event_id,
            name=name.strip(),
            company=company.strip(),
            service=service.strip(),
            cost=cost,
            status=status
        )

        if status == "Confirmed":

            create_notification(
                event_id,
                "Vendor",
                vendor.company
                + " vendor has been confirmed."
            )

        return JsonResponse({
            "message": "Vendor added successfully",
            "vendor": {
                "id": vendor.id,
                "event_id": vendor.event_id,
                "name": vendor.name,
                "company": vendor.company,
                "service": vendor.service,
                "cost": float(vendor.cost),
                "status": vendor.status
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        vendor_id = data.get("id")

        if vendor_id is None:
            return JsonResponse({
                "message": "Vendor id is required"
            }, status=400)

        try:
            vendor_id = int(vendor_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Vendor id must be a valid number"
            }, status=400)

        try:
            vendor = Vendor.objects.get(
                id=vendor_id
            )
        except Vendor.DoesNotExist:
            return JsonResponse({
                "message": "Vendor not found"
            }, status=404)

        old_status = vendor.status

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Vendor name cannot be empty"
                }, status=400)

            vendor.name = data["name"].strip()

        if "company" in data:

            if not data["company"] or not data["company"].strip():
                return JsonResponse({
                    "message": "Company name cannot be empty"
                }, status=400)

            vendor.company = data["company"].strip()

        if "service" in data:

            if not data["service"] or not data["service"].strip():
                return JsonResponse({
                    "message": "Service cannot be empty"
                }, status=400)

            vendor.service = data["service"].strip()

        if "cost" in data:

            try:
                new_cost = float(data["cost"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Cost must be a valid number"
                }, status=400)

            if new_cost < 0:
                return JsonResponse({
                    "message": "Cost cannot be negative"
                }, status=400)

            vendor.cost = new_cost

        if "status" in data:

            if data["status"] not in ALLOWED_STATUS:
                return JsonResponse({
                    "message": "Invalid status",
                    "allowed_status": ALLOWED_STATUS
                }, status=400)

            vendor.status = data["status"]

        vendor.save()

        if (
            old_status != "Confirmed"
            and vendor.status == "Confirmed"
        ):

            create_notification(
                vendor.event_id,
                "Vendor",
                vendor.company
                + " vendor has been confirmed."
            )

        return JsonResponse({
            "message": "Vendor updated successfully",
            "vendor": {
                "id": vendor.id,
                "event_id": vendor.event_id,
                "name": vendor.name,
                "company": vendor.company,
                "service": vendor.service,
                "cost": float(vendor.cost),
                "status": vendor.status
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        vendor_id = data.get("id")

        if vendor_id is None:
            return JsonResponse({
                "message": "Vendor id is required"
            }, status=400)

        try:
            vendor_id = int(vendor_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Vendor id must be a valid number"
            }, status=400)

        try:
            vendor = Vendor.objects.get(
                id=vendor_id
            )
        except Vendor.DoesNotExist:
            return JsonResponse({
                "message": "Vendor not found"
            }, status=404)

        vendor.delete()

        return JsonResponse({
            "message": "Vendor deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)