from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Sponsor
from events.models import Event


@csrf_exempt
def sponsor_list(request):

    if request.method == "GET":

        sponsors = Sponsor.objects.all().order_by("-id")

        result = []

        for sponsor in sponsors:
            result.append({
                "id": sponsor.id,
                "event_id": sponsor.event_id,
                "name": sponsor.name,
                "company": sponsor.company,
                "amount": float(sponsor.amount)
            })

        return JsonResponse({
            "message": "Sponsors retrieved successfully",
            "sponsors": result
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
        amount = data.get("amount")

        if event_id is None:
            return JsonResponse({
                "message": "event_id is required"
            }, status=400)

        if not name or not name.strip():
            return JsonResponse({
                "message": "Sponsor name is required"
            }, status=400)

        if not company or not company.strip():
            return JsonResponse({
                "message": "Company name is required"
            }, status=400)

        if amount is None:
            return JsonResponse({
                "message": "Amount is required"
            }, status=400)

        try:
            event_id = int(event_id)
            amount = float(amount)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "event_id and amount must be valid numbers"
            }, status=400)

        if event_id <= 0:
            return JsonResponse({
                "message": "event_id must be greater than 0"
            }, status=400)

        try:
            Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        if amount < 0:
            return JsonResponse({
                "message": "Amount cannot be negative"
            }, status=400)

        sponsor = Sponsor.objects.create(
            event_id=event_id,
            name=name.strip(),
            company=company.strip(),
            amount=amount
        )

        return JsonResponse({
            "message": "Sponsor added successfully",
            "sponsor": {
                "id": sponsor.id,
                "event_id": sponsor.event_id,
                "name": sponsor.name,
                "company": sponsor.company,
                "amount": float(sponsor.amount)
            }
        }, status=201)

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        sponsor_id = data.get("id")

        if sponsor_id is None:
            return JsonResponse({
                "message": "Sponsor id is required"
            }, status=400)

        try:
            sponsor_id = int(sponsor_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Sponsor id must be a valid number"
            }, status=400)

        try:
            sponsor = Sponsor.objects.get(id=sponsor_id)
        except Sponsor.DoesNotExist:
            return JsonResponse({
                "message": "Sponsor not found"
            }, status=404)

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Sponsor name cannot be empty"
                }, status=400)

            sponsor.name = data["name"].strip()

        if "company" in data:

            if not data["company"] or not data["company"].strip():
                return JsonResponse({
                    "message": "Company name cannot be empty"
                }, status=400)

            sponsor.company = data["company"].strip()

        if "amount" in data:

            try:
                amount = float(data["amount"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Amount must be a valid number"
                }, status=400)

            if amount < 0:
                return JsonResponse({
                    "message": "Amount cannot be negative"
                }, status=400)

            sponsor.amount = amount

        if "event_id" in data:

            try:
                event_id = int(data["event_id"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "event_id must be a valid number"
                }, status=400)

            if event_id <= 0:
                return JsonResponse({
                    "message": "event_id must be greater than 0"
                }, status=400)

            try:
                Event.objects.get(id=event_id)
            except Event.DoesNotExist:
                return JsonResponse({
                    "message": "Event not found"
                }, status=404)

            sponsor.event_id = event_id

        sponsor.save()

        return JsonResponse({
            "message": "Sponsor updated successfully",
            "sponsor": {
                "id": sponsor.id,
                "event_id": sponsor.event_id,
                "name": sponsor.name,
                "company": sponsor.company,
                "amount": float(sponsor.amount)
            }
        })

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        sponsor_id = data.get("id")

        if sponsor_id is None:
            return JsonResponse({
                "message": "Sponsor id is required"
            }, status=400)

        try:
            sponsor_id = int(sponsor_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Sponsor id must be a valid number"
            }, status=400)

        try:
            sponsor = Sponsor.objects.get(id=sponsor_id)
        except Sponsor.DoesNotExist:
            return JsonResponse({
                "message": "Sponsor not found"
            }, status=404)

        sponsor.delete()

        return JsonResponse({
            "message": "Sponsor deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)