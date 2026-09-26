from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import re

vendors = []

ALLOWED_STATUS = [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled"
]


@csrf_exempt
def vendor_list(request):

    # =====================================================
    # GET - View all vendors
    # =====================================================

    if request.method == "GET":

        return JsonResponse({
            "message": "Vendors retrieved successfully",
            "vendors": vendors
        })


    # =====================================================
    # POST - Add vendor
    # =====================================================

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


        # Required field validation

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


        # Validate cost

        try:
            cost = float(cost)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Cost must be a valid number"
            }, status=400)

        if cost < 0:
            return JsonResponse({
                "message": "Cost cannot be negative"
            }, status=400)


        # Validate status

        if status not in ALLOWED_STATUS:
            return JsonResponse({
                "message": "Invalid status",
                "allowed_status": ALLOWED_STATUS
            }, status=400)


        # Create vendor

        vendor = {
            "id": len(vendors) + 1,
            "event_id": event_id,
            "name": name.strip(),
            "company": company.strip(),
            "service": service.strip(),
            "cost": cost,
            "status": status
        }

        vendors.append(vendor)

        return JsonResponse({
            "message": "Vendor added successfully",
            "vendor": vendor
        }, status=201)


    # =====================================================
    # PUT - Update vendor
    # =====================================================

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


        for vendor in vendors:

            if vendor["id"] == vendor_id:

                # Update name

                if "name" in data:

                    if not data["name"] or not data["name"].strip():
                        return JsonResponse({
                            "message": "Vendor name cannot be empty"
                        }, status=400)

                    vendor["name"] = data["name"].strip()


                # Update company

                if "company" in data:

                    if not data["company"] or not data["company"].strip():
                        return JsonResponse({
                            "message": "Company name cannot be empty"
                        }, status=400)

                    vendor["company"] = data["company"].strip()


                # Update service

                if "service" in data:

                    if not data["service"] or not data["service"].strip():
                        return JsonResponse({
                            "message": "Service cannot be empty"
                        }, status=400)

                    vendor["service"] = data["service"].strip()


                # Update cost

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

                    vendor["cost"] = new_cost


                # Update status

                if "status" in data:

                    if data["status"] not in ALLOWED_STATUS:
                        return JsonResponse({
                            "message": "Invalid status",
                            "allowed_status": ALLOWED_STATUS
                        }, status=400)

                    vendor["status"] = data["status"]


                return JsonResponse({
                    "message": "Vendor updated successfully",
                    "vendor": vendor
                })


        return JsonResponse({
            "message": "Vendor not found"
        }, status=404)


    # =====================================================
    # DELETE - Delete vendor
    # =====================================================

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


        for vendor in vendors:

            if vendor["id"] == vendor_id:

                vendors.remove(vendor)

                return JsonResponse({
                    "message": "Vendor deleted successfully"
                })


        return JsonResponse({
            "message": "Vendor not found"
        }, status=404)


    # =====================================================
    # Unsupported method
    # =====================================================

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)