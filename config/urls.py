from django.contrib import admin
from django.urls import path, include
from registrations.views import scan_attendance
from .views import home


urlpatterns = [
    path('', home),

    path('admin/', admin.site.urls),

    path('api/events/', include('events.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/sponsors/', include('sponsors.urls')),
    path('api/budgets/', include('budgets.urls')),
    path('api/resources/', include('resources.urls')),
    path('api/allocations/', include('allocations.urls')),
    path('api/registrations/', include('registrations.urls')),
    path('api/vendors/', include('vendors.urls')),
    path('api/approvals/', include('approvals.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/alerts/', include('alerts.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/accounts/', include('accounts.urls')),

    path('api/attendance/', scan_attendance),
]