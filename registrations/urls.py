from django.urls import path

from . import views

urlpatterns = [
    path('', views.registration_list),
    path('capacity/', views.set_event_capacity),
    path('scan-attendance/', views.scan_attendance),
    path('<int:registration_id>/qr/', views.generate_qr),
]