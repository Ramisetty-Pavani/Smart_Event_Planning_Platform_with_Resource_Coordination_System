from django.urls import path
from . import views

urlpatterns = [
    path('', views.allocation_list),
    path('<int:id>/', views.allocation_list),
]