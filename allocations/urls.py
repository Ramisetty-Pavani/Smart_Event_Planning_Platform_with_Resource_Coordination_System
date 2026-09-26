from django.urls import path
from . import views

urlpatterns = [
    path('', views.allocation_list),
]