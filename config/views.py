from django.http import JsonResponse


def home(request):
    return JsonResponse({
        "message": "Smart Event Planning Platform with Resource Coordination System",
        "status": "Live",
        "apis": {
            "events": "/api/events/",
            "resources": "/api/resources/",
            "allocations": "/api/allocations/",
            "vendors": "/api/vendors/",
            "sponsors": "/api/sponsors/",
            "budgets": "/api/budgets/",
            "registrations": "/api/registrations/",
            "expenses": "/api/expenses/",
            "approvals": "/api/approvals/",
            "notifications": "/api/notifications/",
            "alerts": "/api/alerts/",
            "dashboard": "/api/dashboard/",
            "accounts": "/api/accounts/"
        },
        "admin": "/admin/"
    })