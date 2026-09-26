from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

resources = []


@csrf_exempt
def resource_list(request):

    # GET - View all resources
    if request.method == "GET":
        return JsonResponse({
            "message": "Resources retrieved successfully",
            "resources": resources
        })

    # POST - Add resource
    elif request.method == "POST":
        data = json.loads(request.body)

        resource = {
            "id": len(resources) + 1,
            "name": data.get("name"),
            "quantity": data.get("quantity"),
            "available": data.get("quantity")
        }

        resources.append(resource)

        return JsonResponse({
            "message": "Resource added successfully",
            "resource": resource
        }, status=201)

    # PUT - Update resource
    elif request.method == "PUT":
        data = json.loads(request.body)
        resource_id = data.get("id")

        for resource in resources:

            if resource["id"] == resource_id:

                resource["name"] = data.get(
                    "name",
                    resource["name"]
                )

                resource["quantity"] = data.get(
                    "quantity",
                    resource["quantity"]
                )

                resource["available"] = data.get(
                    "available",
                    resource["available"]
                )

                return JsonResponse({
                    "message": "Resource updated successfully",
                    "resource": resource
                })

        return JsonResponse({
            "message": "Resource not found"
        }, status=404)

    # DELETE - Delete resource
    elif request.method == "DELETE":
        data = json.loads(request.body)
        resource_id = data.get("id")

        for resource in resources:

            if resource["id"] == resource_id:

                resources.remove(resource)

                return JsonResponse({
                    "message": "Resource deleted successfully"
                })

        return JsonResponse({
            "message": "Resource not found"
        }, status=404)