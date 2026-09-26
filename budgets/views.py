from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from expenses.views import expenses
from notifications.views import create_notification


budgets = []


@csrf_exempt
def budget_list(request):

    # =========================================================
    # GET - Get all budgets
    # =========================================================

    if request.method == "GET":

        return JsonResponse({
            "message": "Budgets retrieved successfully",
            "budgets": budgets
        })


    # =========================================================
    # POST - Create budget
    # =========================================================

    elif request.method == "POST":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:

            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)


        event_id = data.get("event_id")
        total_budget = data.get("total_budget")


        # Validate event_id

        if event_id is None:

            return JsonResponse({
                "message": "event_id is required"
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


        # Validate budget

        if total_budget is None:

            return JsonResponse({
                "message": "total_budget is required"
            }, status=400)


        try:
            total_budget = float(total_budget)

        except (ValueError, TypeError):

            return JsonResponse({
                "message": "total_budget must be a valid number"
            }, status=400)


        if total_budget <= 0:

            return JsonResponse({
                "message": "total_budget must be greater than 0"
            }, status=400)


        # Check whether budget already exists

        for budget in budgets:

            if budget["event_id"] == event_id:

                return JsonResponse({
                    "message": "Budget already exists for this event"
                }, status=400)


        # Create budget

        budget = {
            "id": len(budgets) + 1,
            "event_id": event_id,
            "total_budget": total_budget
        }


        budgets.append(budget)


        return JsonResponse({
            "message": "Budget created successfully",
            "budget": budget
        }, status=201)


    # =========================================================
    # PUT - Update budget
    # =========================================================

    elif request.method == "PUT":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:

            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)


        budget_id = data.get("id")


        if budget_id is None:

            return JsonResponse({
                "message": "Budget id is required"
            }, status=400)


        try:
            budget_id = int(budget_id)

        except (ValueError, TypeError):

            return JsonResponse({
                "message": "Budget id must be a valid number"
            }, status=400)


        for budget in budgets:

            if budget["id"] == budget_id:

                # Update event_id

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


                    budget["event_id"] = new_event_id


                # Update total budget

                if "total_budget" in data:

                    try:
                        new_budget = float(data["total_budget"])

                    except (ValueError, TypeError):

                        return JsonResponse({
                            "message": "total_budget must be a valid number"
                        }, status=400)


                    if new_budget <= 0:

                        return JsonResponse({
                            "message": "total_budget must be greater than 0"
                        }, status=400)


                    budget["total_budget"] = new_budget


                return JsonResponse({
                    "message": "Budget updated successfully",
                    "budget": budget
                })


        return JsonResponse({
            "message": "Budget not found"
        }, status=404)


    # =========================================================
    # DELETE - Delete budget
    # =========================================================

    elif request.method == "DELETE":

        try:
            data = json.loads(request.body)

        except json.JSONDecodeError:

            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)


        budget_id = data.get("id")


        if budget_id is None:

            return JsonResponse({
                "message": "Budget id is required"
            }, status=400)


        try:
            budget_id = int(budget_id)

        except (ValueError, TypeError):

            return JsonResponse({
                "message": "Budget id must be a valid number"
            }, status=400)


        for budget in budgets:

            if budget["id"] == budget_id:

                budgets.remove(budget)

                return JsonResponse({
                    "message": "Budget deleted successfully"
                })


        return JsonResponse({
            "message": "Budget not found"
        }, status=404)


    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)


# =============================================================
# BUDGET SUMMARY
# =============================================================

def budget_summary(request, event_id):

    # Find budget

    selected_budget = None

    for budget in budgets:

        if budget["event_id"] == event_id:

            selected_budget = budget
            break


    if selected_budget is None:

        return JsonResponse({
            "message": "Budget not found for this event"
        }, status=404)


    total_budget = float(
        selected_budget["total_budget"]
    )


    # Calculate total expenses

    total_expenses = 0


    for expense in expenses:

        if expense["event_id"] == event_id:

            total_expenses += float(
                expense["amount"]
            )


    # Calculate remaining budget

    remaining_budget = total_budget - total_expenses


    # Calculate utilization

    if total_budget > 0:

        utilization = (
            total_expenses / total_budget
        ) * 100

    else:

        utilization = 0


    # =========================================================
    # BUDGET ALERT + AUTOMATIC NOTIFICATION
    # =========================================================

    if total_expenses > total_budget:

        status = "Budget Exceeded"

        create_notification(
            event_id,
            "Budget",
            "Budget exceeded for event "
            + str(event_id)
        )


    elif utilization >= 90:

        status = "Budget Almost Exceeded"

        create_notification(
            event_id,
            "Budget",
            "Budget utilization has reached 90% or more for event "
            + str(event_id)
        )


    else:

        status = "Within Budget"


    # Return summary

    return JsonResponse({

        "event_id": event_id,

        "total_budget": total_budget,

        "total_expenses": total_expenses,

        "remaining_budget": remaining_budget,

        "budget_utilization_percentage": round(
            utilization,
            2
        ),

        "status": status
    })