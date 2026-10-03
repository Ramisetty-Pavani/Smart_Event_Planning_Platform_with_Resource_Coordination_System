from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Vendor
from events.models import Event
from notifications.views import create_notification


ACTIVE_STATUSES = ["Pending", "Confirmed"]

VALID_STATUSES = [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled"
]


def check_vendor_conflict(
    company,
    event,
    exclude_vendor_id=None
):
    """
    Checks whether the same vendor/company is already
    assigned during an overlapping time.

    Rules:

    1. Same event + overlapping time -> conflict
    2. Different event + overlapping time -> conflict
    3. Same event + non-overlapping time -> allowed
    4. Different event + non-overlapping time -> allowed
    5. Different dates -> allowed
    6. Back-to-back timings -> allowed
    """

    # If the event does not have timing information,
    # time-based conflict checking cannot be performed.
    if not event.start_time or not event.end_time:
        return None

    vendors = Vendor.objects.filter(
        company__iexact=company.strip(),
        status__in=ACTIVE_STATUSES
    )

    # When editing a vendor, exclude the current
    # vendor from its own conflict check.
    if exclude_vendor_id is not None:
        vendors = vendors.exclude(
            id=exclude_vendor_id
        )

    for vendor in vendors:

        try:
            existing_event = Event.objects.get(
                id=vendor.event_id
            )

        except Event.DoesNotExist:
            continue

        # Different dates cannot conflict.
        if existing_event.date != event.date:
            continue

        # If the existing event has no timing,
        # skip time conflict checking.
        if (
            not existing_event.start_time
            or not existing_event.end_time
        ):
            continue

        # ------------------------------------------------
        # TIME OVERLAP CHECK
        # ------------------------------------------------
        #
        # Existing: 10:00 - 12:00
        # New:      12:00 - 14:00
        #
        # These are back-to-back, so they are allowed.
        #
        # Existing: 10:00 - 12:00
        # New:      11:00 - 13:00
        #
        # These overlap, so they conflict.
        # ------------------------------------------------

        if (
            existing_event.end_time <= event.start_time
            or existing_event.start_time >= event.end_time
        ):
            continue

        # Overlap found.
        return {
            "vendor_id": vendor.id,
            "event_id": existing_event.id,
            "company": vendor.company,
            "same_event": (
                existing_event.id == event.id
            )
        }

    return None


@csrf_exempt
def vendor_list(request):

    # ==================================================
    # GET
    # ==================================================

    if request.method == "GET":

        vendors = Vendor.objects.all().order_by("-id")

        vendor_data = []

        for vendor in vendors:

            vendor_data.append({
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
            "vendors": vendor_data
        })

    # ==================================================
    # POST
    # ==================================================

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
        status = data.get(
            "status",
            "Pending"
        )

        # ------------------------------------------------
        # REQUIRED FIELDS
        # ------------------------------------------------

        if event_id is None:
            return JsonResponse({
                "message": "Event id is required"
            }, status=400)

        if not name or not name.strip():
            return JsonResponse({
                "message": "Vendor name is required"
            }, status=400)

        if not company or not company.strip():
            return JsonResponse({
                "message": "Vendor company is required"
            }, status=400)

        if not service or not service.strip():
            return JsonResponse({
                "message": "Vendor service is required"
            }, status=400)

        if cost is None:
            return JsonResponse({
                "message": "Vendor cost is required"
            }, status=400)

        # ------------------------------------------------
        # EVENT ID
        # ------------------------------------------------

        try:
            event_id = int(event_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Event id must be a valid number"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "Event id must be greater than 0"
            }, status=400)

        # ------------------------------------------------
        # EVENT EXISTENCE
        # ------------------------------------------------

        try:
            event = Event.objects.get(
                id=event_id
            )

        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        # ------------------------------------------------
        # COST
        # ------------------------------------------------

        try:
            vendor_cost = float(cost)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Cost must be a valid number"
            }, status=400)

        if vendor_cost <= 0:
            return JsonResponse({
                "message": "Cost must be greater than 0"
            }, status=400)

        # ------------------------------------------------
        # STATUS
        # ------------------------------------------------

        if status not in VALID_STATUSES:
            return JsonResponse({
                "message": (
                    "Status must be Pending, Confirmed, "
                    "Completed or Cancelled"
                )
            }, status=400)

        # ==================================================
        # VENDOR CONFLICT CHECK
        # ==================================================

        conflict = check_vendor_conflict(
            company,
            event
        )

        if conflict:

            # Create notification
            try:
                create_notification(
                    event_id,
                    "Vendor",
                    (
                        "Vendor conflict detected for "
                        + company.strip()
                    )
                )

            except Exception:
                pass

            # Different message for same event
            # and different event.
            if conflict["same_event"]:

                conflict_message = (
                    "Vendor conflict: this vendor is already "
                    "assigned to the same event during the same time"
                )

            else:

                conflict_message = (
                    "Vendor conflict: this vendor is already "
                    "assigned to another event during the same time"
                )

            return JsonResponse({
                "message": conflict_message,
                "conflicting_vendor_id":
                    conflict["vendor_id"],
                "conflicting_event_id":
                    conflict["event_id"],
                "company":
                    conflict["company"]
            }, status=400)

        # ==================================================
        # CREATE VENDOR
        # ==================================================

        vendor = Vendor.objects.create(
            event_id=event_id,
            name=name.strip(),
            company=company.strip(),
            service=service.strip(),
            cost=vendor_cost,
            status=status
        )

        # ------------------------------------------------
        # CONFIRMED VENDOR NOTIFICATION
        # ------------------------------------------------

        if status == "Confirmed":

            try:
                create_notification(
                    event_id,
                    "Vendor",
                    (
                        "Vendor confirmed: "
                        + company.strip()
                    )
                )

            except Exception:
                pass

        return JsonResponse({
            "message": "Vendor created successfully",
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

    # ==================================================
    # PUT
    # ==================================================

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

        # ------------------------------------------------
        # VENDOR ID
        # ------------------------------------------------

        try:
            vendor_id = int(vendor_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Vendor id must be a valid number"
            }, status=400)

        # ------------------------------------------------
        # FIND VENDOR
        # ------------------------------------------------

        try:
            vendor = Vendor.objects.get(
                id=vendor_id
            )

        except Vendor.DoesNotExist:
            return JsonResponse({
                "message": "Vendor not found"
            }, status=404)

        # ==================================================
        # EVENT
        # ==================================================

        if "event_id" in data:

            try:
                new_event_id = int(
                    data["event_id"]
                )

            except (ValueError, TypeError):
                return JsonResponse({
                    "message":
                        "Event id must be a valid number"
                }, status=400)

            if new_event_id <= 0:
                return JsonResponse({
                    "message":
                        "Event id must be greater than 0"
                }, status=400)

            try:
                new_event = Event.objects.get(
                    id=new_event_id
                )

            except Event.DoesNotExist:
                return JsonResponse({
                    "message": "Event not found"
                }, status=404)

            vendor.event_id = new_event_id

        else:

            try:
                new_event = Event.objects.get(
                    id=vendor.event_id
                )

            except Event.DoesNotExist:
                return JsonResponse({
                    "message":
                        "Vendor's event not found"
                }, status=404)

        # ==================================================
        # NAME
        # ==================================================

        if "name" in data:

            if (
                not data["name"]
                or not data["name"].strip()
            ):
                return JsonResponse({
                    "message":
                        "Vendor name cannot be empty"
                }, status=400)

            vendor.name = data["name"].strip()

        # ==================================================
        # COMPANY
        # ==================================================

        if "company" in data:

            if (
                not data["company"]
                or not data["company"].strip()
            ):
                return JsonResponse({
                    "message":
                        "Vendor company cannot be empty"
                }, status=400)

            vendor.company = data["company"].strip()

        # ==================================================
        # SERVICE
        # ==================================================

        if "service" in data:

            if (
                not data["service"]
                or not data["service"].strip()
            ):
                return JsonResponse({
                    "message":
                        "Vendor service cannot be empty"
                }, status=400)

            vendor.service = data["service"].strip()

        # ==================================================
        # COST
        # ==================================================

        if "cost" in data:

            try:
                new_cost = float(
                    data["cost"]
                )

            except (ValueError, TypeError):
                return JsonResponse({
                    "message":
                        "Cost must be a valid number"
                }, status=400)

            if new_cost <= 0:
                return JsonResponse({
                    "message":
                        "Cost must be greater than 0"
                }, status=400)

            vendor.cost = new_cost

        # ==================================================
        # STATUS
        # ==================================================

        old_status = vendor.status

        if "status" in data:

            new_status = data["status"]

            if new_status not in VALID_STATUSES:
                return JsonResponse({
                    "message": (
                        "Status must be Pending, Confirmed, "
                        "Completed or Cancelled"
                    )
                }, status=400)

            vendor.status = new_status

        # ==================================================
        # VENDOR CONFLICT CHECK
        # ==================================================

        # Only active vendors participate
        # in conflict checking.
        if vendor.status in ACTIVE_STATUSES:

            conflict = check_vendor_conflict(
                vendor.company,
                new_event,
                exclude_vendor_id=vendor.id
            )

            if conflict:

                try:
                    create_notification(
                        vendor.event_id,
                        "Vendor",
                        (
                            "Vendor conflict detected "
                            "while updating vendor"
                        )
                    )

                except Exception:
                    pass

                if conflict["same_event"]:

                    conflict_message = (
                        "Vendor conflict: this vendor is "
                        "already assigned to the same event "
                        "during the same time"
                    )

                else:

                    conflict_message = (
                        "Vendor conflict: this vendor is "
                        "already assigned to another event "
                        "during the same time"
                    )

                return JsonResponse({
                    "message": conflict_message,
                    "conflicting_vendor_id":
                        conflict["vendor_id"],
                    "conflicting_event_id":
                        conflict["event_id"]
                }, status=400)

        # ==================================================
        # SAVE
        # ==================================================

        vendor.save()

        # ==================================================
        # CONFIRMED NOTIFICATION
        # ==================================================

        if (
            old_status != "Confirmed"
            and vendor.status == "Confirmed"
        ):

            try:
                create_notification(
                    vendor.event_id,
                    "Vendor",
                    (
                        "Vendor confirmed: "
                        + vendor.company
                    )
                )

            except Exception:
                pass

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

    # ==================================================
    # DELETE
    # ==================================================

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

        # ------------------------------------------------
        # VENDOR ID
        # ------------------------------------------------

        try:
            vendor_id = int(vendor_id)

        except (ValueError, TypeError):
            return JsonResponse({
                "message":
                    "Vendor id must be a valid number"
            }, status=400)

        # ------------------------------------------------
        # FIND VENDOR
        # ------------------------------------------------

        try:
            vendor = Vendor.objects.get(
                id=vendor_id
            )

        except Vendor.DoesNotExist:
            return JsonResponse({
                "message": "Vendor not found"
            }, status=404)

        # ------------------------------------------------
        # DELETE
        # ------------------------------------------------

        vendor.delete()

        return JsonResponse({
            "message":
                "Vendor deleted successfully"
        })

    # ==================================================
    # METHOD NOT ALLOWED
    # ==================================================

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)