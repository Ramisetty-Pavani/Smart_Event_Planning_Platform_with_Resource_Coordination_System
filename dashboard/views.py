from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import csv

from events.models import Event
from registrations.models import Registration
from allocations.models import Allocation
from resources.models import Resource
from vendors.models import Vendor

from .models import ConflictRecord

from .helpers import (
    events_overlap,
    get_active_registrations,
    calculate_budget,
    calculate_resource_status,
    get_vendor_conflicts
)


@csrf_exempt
def conflict_report(request):

    venue_conflicts = []
    resource_conflicts = []
    vendor_conflicts = []
    registration_conflicts = []
    budget_conflicts = []

    events = list(Event.objects.all())

    # -----------------------------
    # Venue conflicts
    # -----------------------------

    for i in range(len(events)):
        for j in range(i + 1, len(events)):

            event1 = events[i]
            event2 = events[j]

            if event1.date != event2.date:
                continue

            if event1.location.lower() != event2.location.lower():
                continue

            if events_overlap(event1, event2):

                venue_conflicts.append({
                    "event_id": event1.id,
                    "conflicting_event_id": event2.id,
                    "location": event1.location,
                    "description": (
                        f"Events {event1.id} and {event2.id} "
                        f"have overlapping schedules at "
                        f"{event1.location}."
                    )
                })

    # -----------------------------
    # Resource conflicts
    # -----------------------------

    allocations = Allocation.objects.all()

    for allocation in allocations:

        try:
            event = Event.objects.get(id=allocation.event_id)
            resource = Resource.objects.get(id=allocation.resource_id)
        except (Event.DoesNotExist, Resource.DoesNotExist):
            continue

        overlapping_quantity = 0

        other_allocations = allocations.filter(
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

        if overlapping_quantity + allocation.quantity > resource.quantity:

            resource_conflicts.append({
                "event_id": event.id,
                "resource_id": resource.id,
                "resource_name": resource.name,
                "required": allocation.quantity,
                "already_required": overlapping_quantity,
                "capacity": resource.quantity,
                "description": (
                    f"Resource {resource.name} is insufficient "
                    f"for Event {event.id}."
                )
            })

    # -----------------------------
    # Vendor conflicts
    # -----------------------------

    for event in events:

        event_vendors = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        conflicts = get_vendor_conflicts(
            event,
            event_vendors,
            Vendor,
            Event
        )

        vendor_conflicts.extend(conflicts)

    # -----------------------------
    # Registration conflicts
    # -----------------------------

    for event in events:

        if event.capacity is None:
            continue

        active_count = get_active_registrations(
            event.id
        ).count()

        if active_count > event.capacity:

            registration_conflicts.append({
                "event_id": event.id,
                "capacity": event.capacity,
                "registered": active_count,
                "description": (
                    f"Event {event.id} has more active "
                    f"registrations than its capacity."
                )
            })

    # -----------------------------
    # Budget conflicts
    # -----------------------------

    for event in events:

        budget_data = calculate_budget(
            event.id,
            event.budget
        )

        if budget_data["expenses"] > budget_data["budget"]:

            budget_conflicts.append({
                "event_id": event.id,
                "budget": budget_data["budget"],
                "expenses": budget_data["expenses"],
                "remaining": budget_data["remaining"],
                "description": (
                    f"Event {event.id} has exceeded its budget."
                )
            })

    # -----------------------------
    # Historical prevented conflicts
    # -----------------------------

    prevented_conflicts = list(
        ConflictRecord.objects.filter(
            status="Prevented"
        ).values(
            "id",
            "conflict_type",
            "event_id",
            "conflicting_event_id",
            "resource_id",
            "description",
            "status",
            "created_at"
        )
    )

    current_conflicts = (
        len(venue_conflicts)
        + len(resource_conflicts)
        + len(vendor_conflicts)
        + len(registration_conflicts)
        + len(budget_conflicts)
    )

    return JsonResponse({
        "current_conflict_count": current_conflicts,

        "venue_conflicts": venue_conflicts,

        "resource_conflicts": resource_conflicts,

        "vendor_conflicts": vendor_conflicts,

        "registration_conflicts": registration_conflicts,

        "budget_conflicts": budget_conflicts,

        "prevented_conflict_count": len(
            prevented_conflicts
        ),

        "prevented_conflicts": prevented_conflicts
    })


@csrf_exempt
def dashboard_summary(request):

    events = Event.objects.all()

    result = []

    for event in events:

        registrations = get_active_registrations(
            event.id
        )

        registered = registrations.count()

        present = registrations.filter(
            attendance="Present"
        ).count()

        absent = registrations.filter(
            attendance="Absent"
        ).count()

        if registered > 0:
            attendance_rate = round(
                (present / registered) * 100,
                2
            )
        else:
            attendance_rate = 0

        budget_data = calculate_budget(
            event.id,
            event.budget
        )

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        resource_analysis = []

        for allocation in allocations:

            resource_status = calculate_resource_status(
                event,
                allocation,
                Resource,
                Allocation,
                Event
            )

            if resource_status:
                resource_analysis.append(
                    resource_status
                )

        vendor_count = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        ).count()

        if event.capacity:
            registration_utilization = round(
                (registered / event.capacity) * 100,
                2
            )
        else:
            registration_utilization = 0

        result.append({
            "event_id": event.id,
            "event_name": event.name,

            "registered": registered,
            "expected_attendance": registered,

            "present": present,
            "absent": absent,

            "attendance_rate": attendance_rate,

            "capacity": event.capacity,
            "registration_utilization": registration_utilization,

            "budget": budget_data["budget"],
            "expenses": budget_data["expenses"],
            "remaining_budget": budget_data["remaining"],
            "budget_utilization": budget_data["utilization"],

            "budget_status": (
                "Exceeded"
                if budget_data["expenses"] > budget_data["budget"]
                else (
                    "Almost Exceeded"
                    if budget_data["budget"] > 0
                    and budget_data["utilization"] >= 90
                    else "Within Budget"
                )
            ),

            "resource_analysis": resource_analysis,

            "vendor_count": vendor_count
        })

    return JsonResponse({
        "events": result
    })


@csrf_exempt
def dashboard_export(request):

    response = HttpResponse(
        content_type="text/csv"
    )

    response["Content-Disposition"] = (
        'attachment; filename="event_dashboard_report.csv"'
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
        "Resource Details",
        "Vendor Count"
    ])

    events = Event.objects.all()

    for event in events:

        registrations = get_active_registrations(
            event.id
        )

        registered = registrations.count()

        present = registrations.filter(
            attendance="Present"
        ).count()

        absent = registrations.filter(
            attendance="Absent"
        ).count()

        if registered > 0:
            attendance_rate = round(
                (present / registered) * 100,
                2
            )
        else:
            attendance_rate = 0

        if event.capacity:
            registration_utilization = round(
                (registered / event.capacity) * 100,
                2
            )
        else:
            registration_utilization = 0

        budget_data = calculate_budget(
            event.id,
            event.budget
        )

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        resource_details = []

        for allocation in allocations:

            status = calculate_resource_status(
                event,
                allocation,
                Resource,
                Allocation,
                Event
            )

            if status:

                resource_details.append(
                    f"{status['resource_name']}: "
                    f"Required={status['required']}, "
                    f"Available={status['available']}, "
                    f"Shortage={status['shortage']}"
                )

        resource_text = " | ".join(
            resource_details
        )

        vendor_count = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        ).count()

        writer.writerow([
            event.id,
            event.name,
            event.date,
            event.start_time,
            event.end_time,
            event.location,
            event.capacity,
            registered,
            registered,
            present,
            absent,
            attendance_rate,
            registration_utilization,
            budget_data["budget"],
            budget_data["expenses"],
            budget_data["remaining"],
            budget_data["utilization"],
            resource_text,
            vendor_count
        ])

    return response


@csrf_exempt
def dashboard_overview(request):

    events = Event.objects.all()

    total_events = events.count()

    total_registered = 0
    total_expected = 0
    total_present = 0

    total_budget = 0
    total_expenses = 0

    total_current_conflicts = 0
    total_resource_shortages = 0

    event_details = []

    for event in events:

        registrations = get_active_registrations(
            event.id
        )

        registered = registrations.count()

        expected = registered

        present = registrations.filter(
            attendance="Present"
        ).count()

        total_registered += registered
        total_expected += expected
        total_present += present

        if registered > 0:
            attendance_rate = round(
                (present / registered) * 100,
                2
            )
        else:
            attendance_rate = 0

        budget_data = calculate_budget(
            event.id,
            event.budget
        )

        total_budget += budget_data["budget"]
        total_expenses += budget_data["expenses"]

        budget_conflict = (
            budget_data["expenses"]
            > budget_data["budget"]
        )

        venue_conflicts = 0

        for other_event in events:

            if other_event.id == event.id:
                continue

            if other_event.date != event.date:
                continue

            if (
                other_event.location.lower()
                != event.location.lower()
            ):
                continue

            if events_overlap(event, other_event):
                venue_conflicts += 1

        resource_conflicts = 0
        resource_shortage = 0

        allocations = Allocation.objects.filter(
            event_id=event.id
        )

        for allocation in allocations:

            status = calculate_resource_status(
                event,
                allocation,
                Resource,
                Allocation,
                Event
            )

            if status:

                if status["shortage"] > 0:
                    resource_shortage += status["shortage"]
                    resource_conflicts += 1

        event_vendors = Vendor.objects.filter(
            event_id=event.id
        ).exclude(
            status="Cancelled"
        )

        vendor_conflicts = len(
            get_vendor_conflicts(
                event,
                event_vendors,
                Vendor,
                Event
            )
        )

        event_conflicts = (
            venue_conflicts
            + resource_conflicts
            + vendor_conflicts
            + (1 if budget_conflict else 0)
        )

        total_current_conflicts += event_conflicts
        total_resource_shortages += resource_shortage

        event_details.append({
            "event_id": event.id,
            "event_name": event.name,

            "registered": registered,
            "expected": expected,
            "present": present,

            "attendance_rate": attendance_rate,

            "budget": budget_data["budget"],
            "expenses": budget_data["expenses"],
            "remaining_budget": budget_data["remaining"],
            "budget_utilization": budget_data["utilization"],

            "budget_conflict": budget_conflict,

            "venue_conflicts": venue_conflicts,
            "resource_conflicts": resource_conflicts,
            "vendor_conflicts": vendor_conflicts,

            "total_conflicts": event_conflicts,

            "resource_shortage": resource_shortage
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

    system_status = (
        "Issues Detected"
        if (
            total_current_conflicts > 0
            or total_resource_shortages > 0
        )
        else "Ready"
    )

    return JsonResponse({
        "total_events": total_events,

        "total_registered": total_registered,
        "total_expected": total_expected,
        "total_present": total_present,

        "overall_attendance_rate": overall_attendance_rate,

        "total_budget": total_budget,
        "total_expenses": total_expenses,
        "remaining_budget": total_budget - total_expenses,
        "budget_utilization": budget_utilization,

        "total_conflicts": total_current_conflicts,

        "resource_shortages": total_resource_shortages,

        "system_status": system_status,

        "events": event_details
    })