import csv

from django.http import JsonResponse, HttpResponse

from events.models import Event
from allocations.models import Allocation
from vendors.models import Vendor
from registrations.models import Registration
from budgets.models import Budget
from expenses.models import Expense
from resources.models import Resource
from .models import ConflictRecord


def conflict_report(request):

    if request.method != "GET":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    venue_conflicts = []
    resource_conflicts = []
    vendor_conflicts = []
    registration_conflicts = []
    budget_conflicts = []
    prevented_conflicts = []

    events = list(Event.objects.all())

    # 1. VENUE CONFLICTS
    for i in range(len(events)):
        for j in range(i + 1, len(events)):

            e1 = events[i]
            e2 = events[j]

            if (
                e1.date == e2.date
                and e1.location.strip().lower() == e2.location.strip().lower()
                and e1.start_time
                and e1.end_time
                and e2.start_time
                and e2.end_time
            ):
                if (
                    e1.start_time < e2.end_time
                    and e1.end_time > e2.start_time
                ):
                    venue_conflicts.append({
                        "event_1": e1.id,
                        "event_2": e2.id,
                        "location": e1.location,
                        "message": "Venue time conflict detected"
                    })

    # 2. RESOURCE CONFLICTS
    allocations = Allocation.objects.all()

    checked_resource_pairs = set()

    for allocation in allocations:

        try:
            resource = Resource.objects.get(
                id=allocation.resource_id
            )
            event = Event.objects.get(
                id=allocation.event_id
            )
        except (Resource.DoesNotExist, Event.DoesNotExist):
            continue

        for other in allocations:

            if allocation.id == other.id:
                continue

            if allocation.resource_id != other.resource_id:
                continue

            pair = tuple(sorted([allocation.id, other.id]))

            if pair in checked_resource_pairs:
                continue

            checked_resource_pairs.add(pair)

            try:
                other_event = Event.objects.get(
                    id=other.event_id
                )
            except Event.DoesNotExist:
                continue

            if event.date != other_event.date:
                continue

            if not (
                event.start_time
                and event.end_time
                and other_event.start_time
                and other_event.end_time
            ):
                continue

            if (
                event.start_time < other_event.end_time
                and event.end_time > other_event.start_time
            ):

                total_required = (
                    allocation.quantity + other.quantity
                )

                if total_required > resource.quantity:

                    resource_conflicts.append({
                        "event_id": event.id,
                        "conflicting_event_id": other_event.id,
                        "resource_id": resource.id,
                        "resource": resource.name,
                        "total_required": total_required,
                        "total_available": resource.quantity,
                        "message": "Resource quantity conflict detected"
                    })

    # 3. VENDOR CONFLICTS
    vendors = list(Vendor.objects.all())

    for i in range(len(vendors)):
        for j in range(i + 1, len(vendors)):

            v1 = vendors[i]
            v2 = vendors[j]

            if v1.status == "Cancelled" or v2.status == "Cancelled":
                continue

            if (
                v1.company.strip().lower()
                != v2.company.strip().lower()
            ):
                continue

            try:
                e1 = Event.objects.get(id=v1.event_id)
                e2 = Event.objects.get(id=v2.event_id)
            except Event.DoesNotExist:
                continue

            if e1.date != e2.date:
                continue

            if not (
                e1.start_time
                and e1.end_time
                and e2.start_time
                and e2.end_time
            ):
                continue

            if (
                e1.start_time < e2.end_time
                and e1.end_time > e2.start_time
            ):
                vendor_conflicts.append({
                    "vendor_company": v1.company,
                    "event_1": e1.id,
                    "event_2": e2.id,
                    "message": "Vendor scheduling conflict detected"
                })

    # 4. REGISTRATION / CAPACITY CONFLICTS
    for event in events:

        if event.capacity is None:
            continue

        active_registrations = Registration.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        ).count()

        if active_registrations > event.capacity:

            registration_conflicts.append({
                "event_id": event.id,
                "capacity": event.capacity,
                "registered": active_registrations,
                "message": "Event capacity exceeded"
            })

    # 5. BUDGET CONFLICTS
    budgets = Budget.objects.all()

    for budget in budgets:

        expenses = Expense.objects.filter(
            event_id=budget.event_id
        )

        total_expenses = sum(
            float(expense.amount)
            for expense in expenses
        )

        if total_expenses > float(budget.total_budget):

            budget_conflicts.append({
                "event_id": budget.event_id,
                "budget": float(budget.total_budget),
                "expenses": total_expenses,
                "remaining": (
                    float(budget.total_budget)
                    - total_expenses
                ),
                "message": "Budget exceeded"
            })

    # 6. PREVENTED CONFLICTS
    records = ConflictRecord.objects.all().order_by(
        "-created_at"
    )

    for record in records:

        prevented_conflicts.append({
            "id": record.id,
            "conflict_type": record.conflict_type,
            "event_id": record.event_id,
            "conflicting_event_id": record.conflicting_event_id,
            "resource_id": record.resource_id,
            "description": record.description,
            "status": record.status,
            "created_at": record.created_at
        })

    total_conflicts = (
        len(venue_conflicts)
        + len(resource_conflicts)
        + len(vendor_conflicts)
        + len(registration_conflicts)
        + len(budget_conflicts)
        + len(prevented_conflicts)
    )

    return JsonResponse({
        "message": "Conflict report generated successfully",
        "total_conflicts": total_conflicts,
        "conflicts": {
            "venue": venue_conflicts,
            "resource": resource_conflicts,
            "vendor": vendor_conflicts,
            "registration": registration_conflicts,
            "budget": budget_conflicts,
            "prevented": prevented_conflicts
        }
    })
def dashboard_summary(request):

    if request.method != "GET":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    events = Event.objects.all().order_by("-id")

    summary = []

    for event in events:

        registrations = Registration.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        registered_count = registrations.count()

        present_count = registrations.filter(
            attendance="Present"
        ).count()

        absent_count = registrations.filter(
            attendance="Absent"
        ).count()

        expected_attendance = registered_count

        if registered_count > 0:
            attendance_rate = round(
                (present_count / registered_count) * 100,
                2
            )
        else:
            attendance_rate = 0

        if event.capacity and event.capacity > 0:
            registration_utilization = round(
                (registered_count / event.capacity) * 100,
                2
            )
        else:
            registration_utilization = 0

        budget_record = Budget.objects.filter(
            event_id=event.id
        ).first()

        if budget_record:
            total_budget = float(
                budget_record.total_budget
            )
        else:
            total_budget = float(event.budget or 0)

        expenses = Expense.objects.filter(
            event_id=event.id
        )

        total_expenses = sum(
            float(expense.amount)
            for expense in expenses
        )

        remaining_budget = (
            total_budget - total_expenses
        )

        if total_budget > 0:
            budget_utilization = round(
                (total_expenses / total_budget) * 100,
                2
            )
        else:
            budget_utilization = 0

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        resource_analysis = []

        for allocation in allocations:

            resource = Resource.objects.filter(
                id=allocation.resource_id
            ).first()

            if not resource:
                continue

            required_quantity = allocation.quantity

            overlapping_quantity = 0

            other_allocations = Allocation.objects.filter(
                resource_id=resource.id
            ).exclude(
                event_id=event.id
            )

            for other in other_allocations:

                other_event = Event.objects.filter(
                    id=other.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    other_event.start_time < event.end_time
                    and other_event.end_time > event.start_time
                ):
                    overlapping_quantity += other.quantity

            available_quantity = max(
                resource.quantity - overlapping_quantity,
                0
            )

            shortage = max(
                required_quantity - available_quantity,
                0
            )

            if shortage > 0:
                status = "Insufficient"
            else:
                status = "Sufficient"

            resource_analysis.append({
                "resource_id": resource.id,
                "resource_name": resource.name,
                "required": required_quantity,
                "available": available_quantity,
                "shortage": shortage,
                "status": status
            })

        vendor_count = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        ).count()

        venue_conflicts = 0
        resource_conflicts = 0
        vendor_conflicts = 0

        other_events = Event.objects.filter(
            date=event.date
        ).exclude(
            id=event.id
        )

        if (
            event.start_time is not None
            and event.end_time is not None
        ):

            for other_event in other_events:

                if (
                    other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                    and event.location.strip().lower()
                    == other_event.location.strip().lower()
                ):
                    venue_conflicts += 1

        resource_conflicts = ConflictRecord.objects.filter(
            conflict_type="Resource"
        ).filter(
            event_id=event.id
        ).count()

        vendor_records = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        for vendor in vendor_records:

            conflicting_vendors = Vendor.objects.filter(
                company__iexact=vendor.company,
                status__in=["Pending", "Confirmed"]
            ).exclude(
                id=vendor.id
            )

            for other_vendor in conflicting_vendors:

                if other_vendor.event_id == event.id:
                    continue

                other_event = Event.objects.filter(
                    id=other_vendor.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                ):
                    vendor_conflicts += 1

        vendor_conflicts = vendor_conflicts // 2

        total_conflicts = (
            venue_conflicts
            + resource_conflicts
            + vendor_conflicts
        )

        summary.append({
            "event_id": event.id,
            "event_name": event.name,
            "date": event.date,
            "start_time": event.start_time,
            "end_time": event.end_time,
            "location": event.location,

            "capacity": event.capacity,

            "registered": registered_count,
            "expected_attendance": expected_attendance,
            "present": present_count,
            "absent": absent_count,

            "attendance_rate": attendance_rate,
            "registration_utilization": registration_utilization,

            "budget": total_budget,
            "expenses": total_expenses,
            "remaining_budget": remaining_budget,
            "budget_utilization": budget_utilization,

            "resources": resource_analysis,

            "vendor_count": vendor_count,

            "venue_conflicts": venue_conflicts,
            "resource_conflicts": resource_conflicts,
            "vendor_conflicts": vendor_conflicts,
            "total_conflicts": total_conflicts
        })

    return JsonResponse({
        "message": "Dashboard summary generated successfully",
        "events": summary
    })
def dashboard_export(request):

    if request.method != "GET":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    response = HttpResponse(
        content_type="text/csv"
    )

    response["Content-Disposition"] = (
        'attachment; filename="smart_event_report.csv"'
    )

    writer = csv.writer(response)

    writer.writerow([
        "Event ID",
        "Event Name",
        "Date",
        "Start Time",
        "End Time",
        "Location",
        "Capacity",
        "Registered",
        "Expected Attendance",
        "Present",
        "Absent",
        "Attendance Rate",
        "Registration Utilization",
        "Budget",
        "Expenses",
        "Remaining Budget",
        "Budget Utilization",
        "Resources Required",
        "Resources Available",
        "Resource Shortage",
        "Vendor Count",
        "Venue Conflicts",
        "Resource Conflicts",
        "Vendor Conflicts",
        "Total Conflicts"
    ])

    events = Event.objects.all().order_by("-id")

    for event in events:

        registrations = Registration.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        registered_count = registrations.count()

        present_count = registrations.filter(
            attendance="Present"
        ).count()

        absent_count = registrations.filter(
            attendance="Absent"
        ).count()

        expected_attendance = registered_count

        if registered_count > 0:
            attendance_rate = round(
                (present_count / registered_count) * 100,
                2
            )
        else:
            attendance_rate = 0

        if event.capacity and event.capacity > 0:
            registration_utilization = round(
                (registered_count / event.capacity) * 100,
                2
            )
        else:
            registration_utilization = 0

        budget_record = Budget.objects.filter(
            event_id=event.id
        ).first()

        if budget_record:
            total_budget = float(
                budget_record.total_budget
            )
        else:
            total_budget = float(event.budget or 0)

        expenses = Expense.objects.filter(
            event_id=event.id
        )

        total_expenses = sum(
            float(expense.amount)
            for expense in expenses
        )

        remaining_budget = (
            total_budget - total_expenses
        )

        if total_budget > 0:
            budget_utilization = round(
                (total_expenses / total_budget) * 100,
                2
            )
        else:
            budget_utilization = 0

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        resources_required = 0
        resources_available = 0
        resource_shortage = 0

        processed_resources = set()

        for allocation in allocations:

            resource = Resource.objects.filter(
                id=allocation.resource_id
            ).first()

            if not resource:
                continue

            if resource.id in processed_resources:
                continue

            processed_resources.add(resource.id)

            required = Allocation.objects.filter(
                event_id=event.id,
                resource_id=resource.id
            )

            required_quantity = sum(
                item.quantity
                for item in required
            )

            overlapping_quantity = 0

            other_allocations = Allocation.objects.filter(
                resource_id=resource.id
            ).exclude(
                event_id=event.id
            )

            for other in other_allocations:

                other_event = Event.objects.filter(
                    id=other.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    other_event.start_time < event.end_time
                    and other_event.end_time > event.start_time
                ):
                    overlapping_quantity += other.quantity

            available_quantity = max(
                resource.quantity - overlapping_quantity,
                0
            )

            shortage = max(
                required_quantity - available_quantity,
                0
            )

            resources_required += required_quantity
            resources_available += available_quantity
            resource_shortage += shortage

        vendor_count = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        ).count()

        venue_conflicts = 0

        other_events = Event.objects.filter(
            date=event.date
        ).exclude(
            id=event.id
        )

        if (
            event.start_time is not None
            and event.end_time is not None
        ):

            for other_event in other_events:

                if (
                    other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                    and event.location.strip().lower()
                    == other_event.location.strip().lower()
                ):
                    venue_conflicts += 1

        resource_conflicts = ConflictRecord.objects.filter(
            conflict_type="Resource",
            event_id=event.id
        ).count()

        vendor_conflicts = 0

        vendor_records = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        for vendor in vendor_records:

            conflicting_vendors = Vendor.objects.filter(
                company__iexact=vendor.company,
                status__in=["Pending", "Confirmed"]
            ).exclude(
                id=vendor.id
            )

            for other_vendor in conflicting_vendors:

                if other_vendor.event_id == event.id:
                    continue

                other_event = Event.objects.filter(
                    id=other_vendor.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                ):
                    vendor_conflicts += 1

        vendor_conflicts = vendor_conflicts // 2

        total_conflicts = (
            venue_conflicts
            + resource_conflicts
            + vendor_conflicts
        )

        writer.writerow([
            event.id,
            event.name,
            event.date,
            event.start_time,
            event.end_time,
            event.location,
            event.capacity,
            registered_count,
            expected_attendance,
            present_count,
            absent_count,
            attendance_rate,
            registration_utilization,
            total_budget,
            total_expenses,
            remaining_budget,
            budget_utilization,
            resources_required,
            resources_available,
            resource_shortage,
            vendor_count,
            venue_conflicts,
            resource_conflicts,
            vendor_conflicts,
            total_conflicts
        ])

    return response
def dashboard_overview(request):

    if request.method != "GET":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    events = Event.objects.all()

    total_events = events.count()
    total_registered = 0
    total_expected = 0
    total_present = 0
    total_budget = 0
    total_expenses = 0
    total_conflicts = 0
    resource_shortages = 0

    event_summary = []

    for event in events:

        registrations = Registration.objects.filter(
            event_id=event.id
        ).exclude(status="Cancelled")

        registered = registrations.count()
        expected = registered

        present = registrations.filter(
            attendance="Present"
        ).count()

        attendance_rate = 0

        if registered > 0:
            attendance_rate = round(
                (present / registered) * 100,
                2
            )

        budget_record = Budget.objects.filter(
            event_id=event.id
        ).first()

        if budget_record:
            budget = float(budget_record.total_budget)
        else:
            budget = float(event.budget or 0)

        expenses = Expense.objects.filter(
            event_id=event.id
        )

        expense_total = sum(
            float(expense.amount)
            for expense in expenses
        )

        venue_conflicts = 0

        other_events = Event.objects.filter(
            date=event.date
        ).exclude(id=event.id)

        if (
            event.start_time is not None
            and event.end_time is not None
        ):

            for other_event in other_events:

                if (
                    other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                    and event.location.strip().lower()
                    == other_event.location.strip().lower()
                ):
                    venue_conflicts += 1

        resource_conflicts = ConflictRecord.objects.filter(
            conflict_type="Resource",
            event_id=event.id
        ).count()

        vendor_conflicts = 0

        vendors = Vendor.objects.filter(
            event_id=event.id
        ).exclude(status="Cancelled")

        for vendor in vendors:

            other_vendors = Vendor.objects.filter(
                company__iexact=vendor.company,
                status__in=["Pending", "Confirmed"]
            ).exclude(id=vendor.id)

            for other_vendor in other_vendors:

                if other_vendor.event_id == event.id:
                    continue

                other_event = Event.objects.filter(
                    id=other_vendor.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    event.start_time < other_event.end_time
                    and event.end_time > other_event.start_time
                ):
                    vendor_conflicts += 1

        vendor_conflicts = vendor_conflicts // 2

        event_conflicts = (
            venue_conflicts
            + resource_conflicts
            + vendor_conflicts
        )

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        shortage_for_event = 0

        for allocation in allocations:

            resource = Resource.objects.filter(
                id=allocation.resource_id
            ).first()

            if not resource:
                continue

            overlapping_quantity = 0

            other_allocations = Allocation.objects.filter(
                resource_id=resource.id
            ).exclude(event_id=event.id)

            for other in other_allocations:

                other_event = Event.objects.filter(
                    id=other.event_id
                ).first()

                if not other_event:
                    continue

                if other_event.date != event.date:
                    continue

                if (
                    event.start_time is None
                    or event.end_time is None
                    or other_event.start_time is None
                    or other_event.end_time is None
                ):
                    continue

                if (
                    other_event.start_time < event.end_time
                    and other_event.end_time > event.start_time
                ):
                    overlapping_quantity += other.quantity

            available = max(
                resource.quantity - overlapping_quantity,
                0
            )

            shortage = max(
                allocation.quantity - available,
                0
            )

            shortage_for_event += shortage

        total_registered += registered
        total_expected += expected
        total_present += present
        total_budget += budget
        total_expenses += expense_total
        total_conflicts += event_conflicts
        resource_shortages += shortage_for_event

        event_summary.append({
            "event_id": event.id,
            "event_name": event.name,
            "registered": registered,
            "expected_attendance": expected,
            "present": present,
            "attendance_rate": attendance_rate,
            "budget": budget,
            "expenses": expense_total,
            "remaining_budget": budget - expense_total,
            "venue_conflicts": venue_conflicts,
            "resource_conflicts": resource_conflicts,
            "vendor_conflicts": vendor_conflicts,
            "total_conflicts": event_conflicts
        })

    if total_registered > 0:
        overall_attendance_rate = round(
            (total_present / total_registered) * 100,
            2
        )
    else:
        overall_attendance_rate = 0

    if total_budget > 0:
        budget_utilization = round(
            (total_expenses / total_budget) * 100,
            2
        )
    else:
        budget_utilization = 0

    if total_conflicts == 0 and resource_shortages == 0:
        system_status = "Ready"
    else:
        system_status = "Issues Detected"

    return JsonResponse({
        "message": "Final dashboard generated successfully",

        "overview": {
            "total_events": total_events,
            "total_registered": total_registered,
            "total_expected_attendance": total_expected,
            "total_present": total_present,
            "overall_attendance_rate": overall_attendance_rate,
            "total_budget": total_budget,
            "total_expenses": total_expenses,
            "remaining_budget": total_budget - total_expenses,
            "budget_utilization": budget_utilization,
            "total_conflicts": total_conflicts,
            "resource_shortages": resource_shortages,
            "system_status": system_status
        },

        "events": event_summary
    })