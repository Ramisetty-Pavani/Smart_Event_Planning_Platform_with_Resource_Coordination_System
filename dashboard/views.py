from django.http import JsonResponse

from events.models import Event
from expenses.models import Expense
from budgets.models import Budget
from sponsors.models import Sponsor
from resources.models import Resource
from allocations.models import Allocation
from registrations.models import Registration
from vendors.models import Vendor
from approvals.models import Approval
from notifications.models import Notification


def dashboard(request):

    if request.method != "GET":
        return JsonResponse({
            "message": "Only GET method is allowed"
        }, status=405)

    event_id = request.GET.get("event_id")

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

    # -------------------------------------------------
    # EVENT
    # -------------------------------------------------

    try:
        event = Event.objects.get(
            id=event_id
        )
    except Event.DoesNotExist:
        return JsonResponse({
            "message": "Event not found"
        }, status=404)

    # -------------------------------------------------
    # BUDGET
    # -------------------------------------------------

    try:
        budget = Budget.objects.get(
            event_id=event_id
        )

        total_budget = float(
            budget.total_budget
        )

    except Budget.DoesNotExist:

        total_budget = 0

    # -------------------------------------------------
    # EXPENSES
    # -------------------------------------------------

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

    # -------------------------------------------------
    # SPONSORS
    # -------------------------------------------------

    total_sponsors = Sponsor.objects.filter(
        event_id=event_id
    ).count()

    sponsor_amount = 0

    sponsors = Sponsor.objects.filter(
        event_id=event_id
    )

    for sponsor in sponsors:
        sponsor_amount += float(
            sponsor.amount
        )

    # -------------------------------------------------
    # RESOURCES
    # -------------------------------------------------

    total_resources = Resource.objects.count()

    # -------------------------------------------------
    # ALLOCATIONS
    # -------------------------------------------------

    total_allocations = Allocation.objects.filter(
        event_id=event_id
    ).count()

    # -------------------------------------------------
    # REGISTRATIONS
    # -------------------------------------------------

    total_registrations = Registration.objects.filter(
        event_id=event_id
    ).exclude(
        status="Cancelled"
    ).count()

    present_count = Registration.objects.filter(
        event_id=event_id,
        attendance="Present"
    ).count()

    absent_count = Registration.objects.filter(
        event_id=event_id,
        attendance="Absent"
    ).count()

    # -------------------------------------------------
    # VENDORS
    # -------------------------------------------------

    total_vendors = Vendor.objects.filter(
        event_id=event_id
    ).count()

    # -------------------------------------------------
    # APPROVALS
    # -------------------------------------------------

    total_approvals = Approval.objects.filter(
        event_id=event_id
    ).count()

    pending_approvals = Approval.objects.filter(
        event_id=event_id,
        status="Pending"
    ).count()

    approved_approvals = Approval.objects.filter(
        event_id=event_id,
        status="Approved"
    ).count()

    rejected_approvals = Approval.objects.filter(
        event_id=event_id,
        status="Rejected"
    ).count()

    # -------------------------------------------------
    # NOTIFICATIONS
    # -------------------------------------------------

    total_notifications = Notification.objects.filter(
        event_id=event_id
    ).count()

    unread_notifications = Notification.objects.filter(
        event_id=event_id,
        status="Unread"
    ).count()

    # -------------------------------------------------
    # BUDGET UTILIZATION
    # -------------------------------------------------

    if total_budget > 0:

        budget_utilization = (
            total_expenses / total_budget
        ) * 100

    else:

        budget_utilization = 0

    # -------------------------------------------------
    # FINAL DASHBOARD
    # -------------------------------------------------

    return JsonResponse({

        "message": "Dashboard retrieved successfully",

        "event": {
            "id": event.id,
            "name": event.name,
            "date": str(event.date),
            "location": event.location,
            "budget": float(event.budget),
            "capacity": event.capacity
        },

        "budget": {
            "total_budget": total_budget,
            "total_expenses": total_expenses,
            "remaining_budget": remaining_budget,
            "budget_utilization_percentage": round(
                budget_utilization,
                2
            )
        },

        "sponsors": {
            "total_sponsors": total_sponsors,
            "total_sponsor_amount": sponsor_amount
        },

        "resources": {
            "total_resources": total_resources
        },

        "allocations": {
            "total_allocations": total_allocations
        },

        "registrations": {
            "total_registrations": total_registrations,
            "present": present_count,
            "absent": absent_count
        },

        "vendors": {
            "total_vendors": total_vendors
        },

        "approvals": {
            "total_approvals": total_approvals,
            "pending": pending_approvals,
            "approved": approved_approvals,
            "rejected": rejected_approvals
        },

        "notifications": {
            "total_notifications": total_notifications,
            "unread": unread_notifications
        }
    })