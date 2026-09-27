from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from events.models import Event


@csrf_exempt
def event_list(request):

    # GET - Retrieve all events
    if request.method == "GET":

        events = Event.objects.all()

        event_data = []

        for event in events:
            event_data.append({
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "location": event.location,
                "budget": float(event.budget)
            })

        return JsonResponse({
            "message": "Events retrieved successfully",
            "events": event_data
        })

    # POST - Create event
    elif request.method == "POST":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        name = data.get("name")
        date = data.get("date")
        location = data.get("location")
        budget = data.get("budget")

        if not name or not name.strip():
            return JsonResponse({
                "message": "Event name is required"
            }, status=400)

        if not date:
            return JsonResponse({
                "message": "Event date is required"
            }, status=400)

        if not location or not location.strip():
            return JsonResponse({
                "message": "Event location is required"
            }, status=400)

        if budget is None:
            return JsonResponse({
                "message": "Event budget is required"
            }, status=400)

        try:
            budget = float(budget)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Budget must be a valid number"
            }, status=400)

        if budget <= 0:
            return JsonResponse({
                "message": "Budget must be greater than 0"
            }, status=400)

        event = Event.objects.create(
            name=name.strip(),
            date=date,
            location=location.strip(),
            budget=budget
        )

        return JsonResponse({
            "message": "Event created successfully",
            "event": {
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "location": event.location,
                "budget": float(event.budget)
            }
        }, status=201)

    # PUT - Update event
    elif request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("id")

        if event_id is None:
            return JsonResponse({
                "message": "Event id is required"
            }, status=400)

        try:
            event_id = int(event_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Event id must be a valid number"
            }, status=400)

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        if "name" in data:

            if not data["name"] or not data["name"].strip():
                return JsonResponse({
                    "message": "Event name cannot be empty"
                }, status=400)

            event.name = data["name"].strip()

        if "date" in data:

            if not data["date"]:
                return JsonResponse({
                    "message": "Event date cannot be empty"
                }, status=400)

            event.date = data["date"]

        if "location" in data:

            if not data["location"] or not data["location"].strip():
                return JsonResponse({
                    "message": "Event location cannot be empty"
                }, status=400)

            event.location = data["location"].strip()

        if "budget" in data:

            try:
                new_budget = float(data["budget"])
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "Budget must be a valid number"
                }, status=400)

            if new_budget <= 0:
                return JsonResponse({
                    "message": "Budget must be greater than 0"
                }, status=400)

            event.budget = new_budget

        event.save()

        return JsonResponse({
            "message": "Event updated successfully",
            "event": {
                "id": event.id,
                "name": event.name,
                "date": str(event.date),
                "location": event.location,
                "budget": float(event.budget)
            }
        })

    # DELETE - Delete event
    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        event_id = data.get("id")

        if event_id is None:
            return JsonResponse({
                "message": "Event id is required"
            }, status=400)

        try:
            event_id = int(event_id)
        except (ValueError, TypeError):
            return JsonResponse({
                "message": "Event id must be a valid number"
            }, status=400)

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return JsonResponse({
                "message": "Event not found"
            }, status=404)

        event.delete()

        return JsonResponse({
            "message": "Event deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)