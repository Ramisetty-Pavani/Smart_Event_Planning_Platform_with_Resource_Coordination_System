from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


# Store approval requests
approvals = []


# Allowed approval types
ALLOWED_TYPES = [
    "Vendor",
    "Budget",
    "Resource",
    "Event"
]


# Allowed approval statuses
ALLOWED_STATUS = [
    "Pending",
    "Approved",
    "Rejected"
]


@csrf_exempt
def approval_list(request):

    # =====================================================
    # GET - View all approvals
    # =====================================================

    if request.method == "GET":

        return JsonResponse({
            "message": "Approvals retrieved successfully",
            "approvals": approvals
        })


    # =====================================================
    # POST - Create approval request
    # =====================================================

    elif request.method == "POST":

        # Check JSON
        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)


        # Get data
        event_id = data.get("event_id")
        request_type = data.get("request_type")
        description = data.get("description")
        requested_by = data.get("requested_by")


        # -------------------------------------------------
        # Required field validation
        # -------------------------------------------------

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


        # -------------------------------------------------
        # Validate event_id
        # -------------------------------------------------

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


        # -------------------------------------------------
        # Validate request type
        # -------------------------------------------------

        if request_type not in ALLOWED_TYPES:
            return JsonResponse({
                "message": "Invalid request_type",
                "allowed_types": ALLOWED_TYPES
            }, status=400)


        # -------------------------------------------------
        # Create approval
        # -------------------------------------------------

        approval = {
            "id": len(approvals) + 1,
            "event_id": event_id,
            "request_type": request_type,
            "description": description.strip(),
            "requested_by": requested_by.strip(),
            "status": "Pending"
        }


        approvals.append(approval)


        return JsonResponse({
            "message": "Approval request created successfully",
            "approval": approval
        }, status=201)


    # =====================================================
    # PUT - Update approval
    # =====================================================

    elif request.method == "PUT":

        # Check JSON
        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)


        approval_id = data.get("id")


        # -------------------------------------------------
        # Validate ID
        # -------------------------------------------------

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


        # -------------------------------------------------
        # Find approval
        # -------------------------------------------------

        for approval in approvals:

            if approval["id"] == approval_id:

                # -----------------------------------------
                # Update description
                # -----------------------------------------

                if "description" in data:

                    if not data["description"] or not data["description"].strip():
                        return JsonResponse({
                            "message": "Description cannot be empty"
                        }, status=400)

                    approval["description"] = data["description"].strip()


                # -----------------------------------------
                # Update requested_by
                # -----------------------------------------

                if "requested_by" in data:

                    if not data["requested_by"] or not data["requested_by"].strip():
                        return JsonResponse({
                            "message": "requested_by cannot be empty"
                        }, status=400)

                    approval["requested_by"] = data["requested_by"].strip()


                # -----------------------------------------
                # Update request type
                # -----------------------------------------

                if "request_type" in data:

                    if data["request_type"] not in ALLOWED_TYPES:
                        return JsonResponse({
                            "message": "Invalid request_type",
                            "allowed_types": ALLOWED_TYPES
                        }, status=400)

                    approval["request_type"] = data["request_type"]


                # -----------------------------------------
                # Update event ID
                # -----------------------------------------

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


                    approval["event_id"] = new_event_id


                # -----------------------------------------
                # Update status
                # -----------------------------------------

                if "status" in data:

                    if data["status"] not in ALLOWED_STATUS:
                        return JsonResponse({
                            "message": "Invalid status",
                            "allowed_status": ALLOWED_STATUS
                        }, status=400)


                    approval["status"] = data["status"]


                return JsonResponse({
                    "message": "Approval updated successfully",
                    "approval": approval
                })


        # Approval not found

        return JsonResponse({
            "message": "Approval not found"
        }, status=404)


    # =====================================================
    # DELETE - Delete approval
    # =====================================================

    elif request.method == "DELETE":

        # Check JSON
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


        # Find and delete

        for approval in approvals:

            if approval["id"] == approval_id:

                approvals.remove(approval)

                return JsonResponse({
                    "message": "Approval deleted successfully"
                })


        return JsonResponse({
            "message": "Approval not found"
        }, status=404)


    # =====================================================
    # Unsupported HTTP method
    # =====================================================

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)