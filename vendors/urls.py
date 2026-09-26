from django.urls import path
from . import views

urlpatterns = [
    path('', views.vendor_list),
]