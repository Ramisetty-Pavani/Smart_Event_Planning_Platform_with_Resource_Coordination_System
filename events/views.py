from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

events = []


@csrf_exempt
def event_list(request):

    # GET - View all events
    if request.method == "GET":
        return JsonResponse({
            "message": "Events retrieved successfully",
            "events": events
        })

    # POST - Create a new event
    elif request.method == "POST":
        data = json.loads(request.body)

        event = {
            "id": len(events) + 1,
            "name": data.get("name"),
            "date": data.get("date"),
            "location": data.get("location"),
            "budget": data.get("budget")
        }

        events.append(event)

        return JsonResponse({
            "message": "Event created successfully",
            "event": event
        }, status=201)

    # PUT - Update an event
    elif request.method == "PUT":
        data = json.loads(request.body)

        event_id = data.get("id")

        for event in events:
            if event["id"] == event_id:

                event["name"] = data.get("name", event["name"])
                event["date"] = data.get("date", event["date"])
                event["location"] = data.get("location", event["location"])
                event["budget"] = data.get("budget", event["budget"])

                return JsonResponse({
                    "message": "Event updated successfully",
                    "event": event
                })

        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    # DELETE - Delete an event
    elif request.method == "DELETE":
        data = json.loads(request.body)

        event_id = data.get("id")

        for event in events:
            if event["id"] == event_id:
                events.remove(event)

                return JsonResponse({
                    "message": "Event deleted successfully"
                })

        return JsonResponse({
            "message": "Event not found"
        }, status=404)