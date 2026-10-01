from registrations.models import Registration
from budgets.models import Budget
from expenses.models import Expense
from vendors.models import Vendor


def events_overlap(event1, event2):
    if not event1.start_time or not event1.end_time:
        return False

    if not event2.start_time or not event2.end_time:
        return False

    return (
        event1.start_time < event2.end_time
        and event1.end_time > event2.start_time
    )


def get_active_registrations(event_id):
    return Registration.objects.filter(
        event_id=event_id
    ).exclude(
        status="Cancelled"
    )


def calculate_budget(event_id, fallback_budget):
    try:
        budget_obj = Budget.objects.get(event_id=event_id)
        budget = float(budget_obj.total_budget)
    except Budget.DoesNotExist:
        budget = float(fallback_budget or 0)

    expenses = sum(
        float(expense.amount)
        for expense in Expense.objects.filter(event_id=event_id)
    )

    remaining = budget - expenses

    if budget > 0:
        utilization = round((expenses / budget) * 100, 2)
    else:
        utilization = 0

    return {
        "budget": budget,
        "expenses": expenses,
        "remaining": remaining,
        "utilization": utilization
    }


def calculate_resource_status(
    event,
    allocation,
    Resource,
    Allocation,
    Event
):
    try:
        resource = Resource.objects.get(
            id=allocation.resource_id
        )
    except Resource.DoesNotExist:
        return None

    overlapping_quantity = 0

    other_allocations = Allocation.objects.filter(
        resource_id=allocation.resource_id
    ).exclude(
        event_id=event.id
    )

    for other in other_allocations:
        try:
            other_event = Event.objects.get(
                id=other.event_id
            )
        except Event.DoesNotExist:
            continue

        if other_event.date != event.date:
            continue

        if events_overlap(event, other_event):
            overlapping_quantity += other.quantity

    available_quantity = max(
        resource.quantity - overlapping_quantity,
        0
    )

    shortage = max(
        allocation.quantity - available_quantity,
        0
    )

    return {
        "resource_id": resource.id,
        "resource_name": resource.name,
        "required": allocation.quantity,
        "available": available_quantity,
        "shortage": shortage,
        "status": (
            "Insufficient"
            if shortage > 0
            else "Sufficient"
        )
    }


def get_vendor_conflicts(event, event_vendors, Vendor, Event):
    conflicts = []

    for vendor in event_vendors:
        other_vendors = Vendor.objects.filter(
            company__iexact=vendor.company
        ).exclude(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        for other_vendor in other_vendors:
            try:
                other_event = Event.objects.get(
                    id=other_vendor.event_id
                )
            except Event.DoesNotExist:
                continue

            if (
                other_event.date == event.date
                and events_overlap(event, other_event)
            ):
                conflicts.append({
                    "vendor_company": vendor.company,
                    "event_id": event.id,
                    "conflicting_event_id": other_event.id
                })

    return conflicts