from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_overview),
    path('conflicts/', views.conflict_report),
    path('summary/', views.dashboard_summary),
    path('export/', views.dashboard_export),
]