from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Budget
from expenses.models import Expense
from notifications.views import create_notification


@csrf_exempt
def budget_list(request):

    # =========================
    # GET - View all budgets
    # =========================
    if request.method == "GET":

        budgets = Budget.objects.all()

        budget_data = []

        for budget in budgets:
            budget_data.append({
                "id": budget.id,
                "event_id": budget.event_id,
                "total_budget": float(budget.total_budget)
            })

        return JsonResponse({
            "message": "Budgets retrieved successfully",
            "budgets": budget_data
        })

    # =========================
    # POST - Create budget
    # =========================
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
        existing_budget = Budget.objects.filter(
            event_id=event_id
        ).first()

        if existing_budget:
            return JsonResponse({
                "message": "Budget already exists for this event"
            }, status=400)

        # Create budget
        budget = Budget.objects.create(
            event_id=event_id,
            total_budget=total_budget
        )

        return JsonResponse({
            "message": "Budget created successfully",
            "budget": {
                "id": budget.id,
                "event_id": budget.event_id,
                "total_budget": float(budget.total_budget)
            }
        }, status=201)

    # =========================
    # PUT - Update budget
    # =========================
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

        try:
            budget = Budget.objects.get(
                id=budget_id
            )
        except Budget.DoesNotExist:
            return JsonResponse({
                "message": "Budget not found"
            }, status=404)

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

            budget.event_id = new_event_id

        # Update total budget
        if "total_budget" in data:

            try:
                new_budget = float(
                    data["total_budget"]
                )
            except (ValueError, TypeError):
                return JsonResponse({
                    "message": "total_budget must be a valid number"
                }, status=400)

            if new_budget <= 0:
                return JsonResponse({
                    "message": "total_budget must be greater than 0"
                }, status=400)

            budget.total_budget = new_budget

        budget.save()

        return JsonResponse({
            "message": "Budget updated successfully",
            "budget": {
                "id": budget.id,
                "event_id": budget.event_id,
                "total_budget": float(
                    budget.total_budget
                )
            }
        })

    # =========================
    # DELETE - Delete budget
    # =========================
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

        try:
            budget = Budget.objects.get(
                id=budget_id
            )
        except Budget.DoesNotExist:
            return JsonResponse({
                "message": "Budget not found"
            }, status=404)

        budget.delete()

        return JsonResponse({
            "message": "Budget deleted successfully"
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)


# ============================================================
# BUDGET SUMMARY
# ============================================================

def budget_summary(request, event_id):

    try:
        budget = Budget.objects.get(
            event_id=event_id
        )
    except Budget.DoesNotExist:
        return JsonResponse({
            "message": "Budget not found for this event"
        }, status=404)

    total_budget = float(
        budget.total_budget
    )

    # Get expenses from database
    expenses = Expense.objects.filter(
        event_id=event_id
    )

    total_expenses = 0

    for expense in expenses:
        total_expenses += float(
            expense.amount
        )

    remaining_budget = (
        total_budget - total_expenses
    )

    if total_budget > 0:
        utilization = (
            total_expenses / total_budget
        ) * 100
    else:
        utilization = 0

    # Determine budget status
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