from django.urls import path

from .views import (
    register,
    user_login,
    user_logout,
    current_user,
    profile,
    change_password,
    forgot_password,
    reset_password,
)


urlpatterns = [

    path(
        "register/",
        register,
        name="register"
    ),

    path(
        "login/",
        user_login,
        name="login"
    ),

    path(
        "logout/",
        user_logout,
        name="logout"
    ),

    path(
        "me/",
        current_user,
        name="current_user"
    ),

    path(
        "profile/",
        profile,
        name="profile"
    ),

    path(
        "change-password/",
        change_password,
        name="change_password"
    ),

    path(
        "forgot-password/",
        forgot_password,
        name="forgot_password"
    ),

    path(
        "reset-password/",
        reset_password,
        name="reset_password"
    ),
]