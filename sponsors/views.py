from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

sponsors = []


@csrf_exempt
def sponsor_list(request):

    # GET - View all sponsors
    if request.method == "GET":

        return JsonResponse({
            "message": "Sponsors retrieved successfully",
            "sponsors": sponsors
        })


    # POST - Add a sponsor
    elif request.method == "POST":

        data = json.loads(request.body)

        sponsor = {
            "id": len(sponsors) + 1,
            "event_id": data.get("event_id"),
            "name": data.get("name"),
            "company": data.get("company"),
            "amount": data.get("amount")
        }

        sponsors.append(sponsor)

        return JsonResponse({
            "message": "Sponsor added successfully",
            "sponsor": sponsor
        }, status=201)


    # PUT - Update a sponsor
    elif request.method == "PUT":

        data = json.loads(request.body)

        sponsor_id = data.get("id")

        for sponsor in sponsors:

            if sponsor["id"] == sponsor_id:

                sponsor["event_id"] = data.get(
                    "event_id",
                    sponsor["event_id"]
                )

                sponsor["name"] = data.get(
                    "name",
                    sponsor["name"]
                )

                sponsor["company"] = data.get(
                    "company",
                    sponsor["company"]
                )

                sponsor["amount"] = data.get(
                    "amount",
                    sponsor["amount"]
                )

                return JsonResponse({
                    "message": "Sponsor updated successfully",
                    "sponsor": sponsor
                })

        return JsonResponse({
            "message": "Sponsor not found"
        }, status=404)


    # DELETE - Delete a sponsor
    elif request.method == "DELETE":

        data = json.loads(request.body)

        sponsor_id = data.get("id")

        for sponsor in sponsors:

            if sponsor["id"] == sponsor_id:

                sponsors.remove(sponsor)

                return JsonResponse({
                    "message": "Sponsor deleted successfully"
                })

        return JsonResponse({
            "message": "Sponsor not found"
        }, status=404)