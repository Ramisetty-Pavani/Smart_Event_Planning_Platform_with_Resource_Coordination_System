from django.http import JsonResponse

from events.views import events
from expenses.views import expenses
from budgets.views import budgets
from sponsors.views import sponsors
from resources.views import resources
from allocations.views import allocations
from registrations.views import registrations
from vendors.views import vendors
from approvals.views import approvals
from notifications.views import notifications


def dashboard(request):

    # Only GET is allowed
    if request.method != "GET":
        return JsonResponse({
            "message": "Only GET method is allowed"
        }, status=405)

    # Get event_id from query parameter
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

    # ------------------------------------------------
    # EVENT
    # ------------------------------------------------

    selected_event = None

    for event in events:
        if event["id"] == event_id:
            selected_event = event
            break

    if selected_event is None:
        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    # ------------------------------------------------
    # BUDGET
    # ------------------------------------------------

    total_budget = 0

    for budget in budgets:
        if budget["event_id"] == event_id:
            total_budget = float(budget["total_budget"])
            break

    # ------------------------------------------------
    # EXPENSES
    # ------------------------------------------------

    total_expenses = 0

    for expense in expenses:
        if expense["event_id"] == event_id:
            total_expenses += float(expense["amount"])

    remaining_budget = total_budget - total_expenses

    if total_budget > 0:
        budget_utilization = (total_expenses / total_budget) * 100
    else:
        budget_utilization = 0

    # ------------------------------------------------
    # BUDGET ALERT
    # ------------------------------------------------

    if total_expenses > total_budget:
        budget_alert = "Budget Exceeded"
        severity = "Critical"

    elif budget_utilization >= 90:
        budget_alert = "Budget Almost Exceeded"
        severity = "Warning"

    elif budget_utilization >= 75:
        budget_alert = "Budget Usage High"
        severity = "Information"

    else:
        budget_alert = "Budget Within Limit"
        severity = "Normal"

    # ------------------------------------------------
    # REGISTRATIONS
    # ------------------------------------------------

    registration_count = 0

    for registration in registrations:
        if registration["event_id"] == event_id:
            registration_count += 1

    # ------------------------------------------------
    # VENDORS
    # ------------------------------------------------

    vendor_count = 0

    for vendor in vendors:
        if vendor["event_id"] == event_id:
            vendor_count += 1

    # ------------------------------------------------
    # SPONSORS
    # ------------------------------------------------

    sponsor_count = 0

    for sponsor in sponsors:
        if sponsor["event_id"] == event_id:
            sponsor_count += 1

    # ------------------------------------------------
    # ALLOCATIONS
    # ------------------------------------------------

    allocation_count = 0

    for allocation in allocations:
        if allocation["event_id"] == event_id:
            allocation_count += 1

    # ------------------------------------------------
    # APPROVALS
    # ------------------------------------------------

    pending_approvals = 0

    for approval in approvals:
        if approval["event_id"] == event_id:
            if approval["status"] == "Pending":
                pending_approvals += 1

    # ------------------------------------------------
    # NOTIFICATIONS
    # ------------------------------------------------

    unread_notifications = 0

    for notification in notifications:
        if notification["event_id"] == event_id:
            if notification["status"] == "Unread":
                unread_notifications += 1

    # ------------------------------------------------
    # FINAL DASHBOARD
    # ------------------------------------------------

    return JsonResponse({
        "event": selected_event,

        "financial_summary": {
            "total_budget": total_budget,
            "total_expenses": total_expenses,
            "remaining_budget": remaining_budget,
            "budget_utilization_percentage": round(
                budget_utilization, 2
            )
        },

        "budget_alert": {
            "alert": budget_alert,
            "severity": severity
        },

        "statistics": {
            "registrations": registration_count,
            "vendors": vendor_count,
            "sponsors": sponsor_count,
            "allocations": allocation_count,
            "pending_approvals": pending_approvals,
            "unread_notifications": unread_notifications
        }
    })