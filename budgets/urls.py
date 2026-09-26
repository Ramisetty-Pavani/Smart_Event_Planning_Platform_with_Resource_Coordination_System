from django.urls import path
from . import views

urlpatterns = [
    path('', views.budget_list),
    path('summary/<int:event_id>/', views.budget_summary),
]