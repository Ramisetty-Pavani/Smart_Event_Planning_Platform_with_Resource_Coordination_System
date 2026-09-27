from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Approval
from notifications.views import create_notification


ALLOWED_TYPES = [
    "Vendor",
    "Budget",
    "Resource",
    "Event"
]

ALLOWED_STATUS = [
    "Pending",
    "Approved",
    "Rejected"
]


@csrf_exempt
def approval_list(request):

    if request.method == "GET":

        approvals = Approval.objects.all().order_by("-id")

        result = []

        for approval in approvals:
            result.append({
                "id": approval.id,
                "event_id": approval.event_id,
                "request_type": approval.request_type,
                "description": approval.description,
                "requested_by": approval.requested_by,
                "status": approval.status
            })

        return JsonResponse({
            "message": "Approvals retrieved successfully",
            "approvals": result
        })

    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("event_id")
        request_type = data.get("request_type")
        description = data.get("description")
        requested_by = data.get("requested_by")

        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        if request_type is None:
            return JsonResponse({
                "message": "request_type is required"
            }, status=400)

        if not description or not description.strip():
            return JsonResponse({
                "message": "description is required"
            }, status=400)

        if not requested_by or not requested_by.strip():
            return JsonResponse({
                "message": "requested_by is required"
            }, status=400)

        try:
            event_id = int(event_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id must be a valid number"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        if request_type not in ALLOWED_TYPES:
            return JsonResponse({
                "message": "Invalid request_type",
                "allowed_types": ALLOWED_TYPES
            }, status=400)

        approval = Approval.objects.create(
            event_id=event_id,
            request_type=request_type,
            description=description.strip(),
            requested_by=requested_by.strip(),
            status="Pending"
        )

        create_notification(
            event_id,
            "Approval",
            "New "
            + request_type
            + " approval request is waiting for review."
        )

        return JsonResponse({
            "message": "Approval request created successfully",
            "approval": {
                "id": approval.id,
                "event_id": approval.event_id,
                "request_type": approval.request_type,
                "description": approval.description,
                "requested_by": approval.requested_by,
                "status": approval.status
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        approval_id = data.get("id")

        if approval_id is None:
            return JsonResponse({
                "message": "Approval id is required"
            }, status=400)

        try:
            approval_id = int(approval_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Approval id must be a valid number"
            }, status=400)

        try:
            approval = Approval.objects.get(
                id=approval_id
            )
        except Approval.DoesNotExist:
            return JsonResponse({
                "message": "Approval not found"
            }, status=404)

        if "description" in data:

            if not data["description"] or not data["description"].strip():
                return JsonResponse({
                    "message": "Description cannot be empty"
                }, status=400)

            approval.description = data["description"].strip()

        if "requested_by" in data:

            if not data["requested_by"] or not data["requested_by"].strip():
                return JsonResponse({
                    "message": "requested_by cannot be empty"
                }, status=400)

            approval.requested_by = data["requested_by"].strip()

        if "request_type" in data:

            if data["request_type"] not in ALLOWED_TYPES:
                return JsonResponse({
                    "message": "Invalid request_type",
                    "allowed_types": ALLOWED_TYPES
                }, status=400)

            approval.request_type = data["request_type"]

        if "event_id" in data:

            try:
                new_event_id = int(data["event_id"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "event_id must be a valid number"
                }, status=400)

            if new_event_id <= 0:
                return JsonResponse({
                    "message": "event_id must be greater than 0"
                }, status=400)

            approval.event_id = new_event_id

        if "status" in data:

            if data["status"] not in ALLOWED_STATUS:
                return JsonResponse({
                    "message": "Invalid status",
                    "allowed_status": ALLOWED_STATUS
                }, status=400)

            approval.status = data["status"]

        approval.save()

        return JsonResponse({
            "message": "Approval updated successfully",
            "approval": {
                "id": approval.id,
                "event_id": approval.event_id,
                "request_type": approval.request_type,
                "description": approval.description,
                "requested_by": approval.requested_by,
                "status": approval.status
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        approval_id = data.get("id")

        if approval_id is None:
            return JsonResponse({
                "message": "Approval id is required"
            }, status=400)

        try:
            approval_id = int(approval_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Approval id must be a valid number"
            }, status=400)

        try:
            approval = Approval.objects.get(
                id=approval_id
            )
        except Approval.DoesNotExist:
            return JsonResponse({
                "message": "Approval not found"
            }, status=404)

        approval.delete()

        return JsonResponse({
            "message": "Approval deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)