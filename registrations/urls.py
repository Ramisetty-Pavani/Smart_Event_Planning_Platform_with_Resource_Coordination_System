from django.urls import path
from . import views

urlpatterns = [
    path('', views.registration_list),
    path('capacity/', views.set_event_capacity),
]