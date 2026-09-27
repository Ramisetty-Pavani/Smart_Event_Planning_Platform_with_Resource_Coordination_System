from django.http import JsonResponse

from budgets.models import Budget
from expenses.models import Expense


def budget_alert(request):

    # Only GET is allowed
    if request.method != "GET":
        return JsonResponse({
            "message": "Only GET method is allowed"
        }, status=405)

    # Get event_id from URL
    event_id = request.GET.get("event_id")

    if event_id is None:
        return JsonResponse({
            "message": "event_id is required"
        }, status=400)

    # Validate event_id
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

    # Find budget from database
    try:
        budget = Budget.objects.get(
            event_id=event_id
        )
    except Budget.DoesNotExist:
        return JsonResponse({
            "message": "Budget not found for this event"
        }, status=404)

    # Get total budget
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

    # Calculate remaining budget
    remaining_budget = (
        total_budget - total_expenses
    )

    # Calculate utilization
    if total_budget > 0:
        utilization = (
            total_expenses / total_budget
        ) * 100
    else:
        utilization = 0

    # Determine alert
    if total_expenses > total_budget:

        alert = "Budget Exceeded"
        severity = "Critical"

    elif utilization >= 90:

        alert = "Budget Almost Exceeded"
        severity = "Warning"

    elif utilization >= 75:

        alert = "Budget Usage High"
        severity = "Information"

    else:

        alert = "Budget Within Limit"
        severity = "Normal"

    # Return response
    return JsonResponse({

        "event_id": event_id,

        "total_budget": total_budget,

        "total_expenses": total_expenses,

        "remaining_budget": remaining_budget,

        "budget_utilization_percentage": round(
            utilization,
            2
        ),

        "alert": alert,

        "severity": severity
    })