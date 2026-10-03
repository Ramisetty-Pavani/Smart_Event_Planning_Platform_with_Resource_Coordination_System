import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import JsonResponse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt

from .models import UserProfile


def get_user_data(user):
    profile = UserProfile.objects.get(user=user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": profile.full_name,
        "phone": profile.phone,
        "role": profile.role,
    }


@csrf_exempt
def register(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    phone = data.get("phone", "").strip()
    role = data.get("role", "Participant")

    if not full_name:
        return JsonResponse({
            "message": "Full name is required"
        }, status=400)

    if not email:
        return JsonResponse({
            "message": "Email is required"
        }, status=400)

    if not username:
        return JsonResponse({
            "message": "Username is required"
        }, status=400)

    if not password:
        return JsonResponse({
            "message": "Password is required"
        }, status=400)

    if not confirm_password:
        return JsonResponse({
            "message": "Confirm password is required"
        }, status=400)

    if password != confirm_password:
        return JsonResponse({
            "message": "Passwords do not match"
        }, status=400)

    if len(password) < 8:
        return JsonResponse({
            "message": "Password must contain at least 8 characters"
        }, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({
            "message": "Username already exists"
        }, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({
            "message": "Email already exists"
        }, status=400)

    if phone and (
        not phone.isdigit() or len(phone) != 10
    ):
        return JsonResponse({
            "message": "Phone number must contain exactly 10 digits"
        }, status=400)

    valid_roles = [
        "Admin",
        "Organizer",
        "Participant",
        "Staff"
    ]

    if role not in valid_roles:
        return JsonResponse({
            "message": "Invalid role"
        }, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    UserProfile.objects.create(
        user=user,
        full_name=full_name,
        phone=phone,
        role=role
    )

    return JsonResponse({
        "message": "Registration successful",
        "user": get_user_data(user)
    }, status=201)


@csrf_exempt
def user_login(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    username_or_email = data.get(
        "username_or_email",
        ""
    ).strip()

    password = data.get("password", "")

    if not username_or_email:
        return JsonResponse({
            "message": "Username or email is required"
        }, status=400)

    if not password:
        return JsonResponse({
            "message": "Password is required"
        }, status=400)

    user = authenticate(
        request,
        username=username_or_email,
        password=password
    )

    if user is None:
        try:
            matching_user = User.objects.get(
                email__iexact=username_or_email
            )

            user = authenticate(
                request,
                username=matching_user.username,
                password=password
            )

        except User.DoesNotExist:
            user = None

    if user is None:
        return JsonResponse({
            "message": "Invalid username/email or password"
        }, status=401)

    login(request, user)

    return JsonResponse({
        "message": "Login successful",
        "user": get_user_data(user)
    })


def user_logout(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    logout(request)

    return JsonResponse({
        "message": "Logout successful"
    })


def current_user(request):

    if not request.user.is_authenticated:
        return JsonResponse({
            "authenticated": False
        })

    return JsonResponse({
        "authenticated": True,
        "user": get_user_data(request.user)
    })


@csrf_exempt
def profile(request):

    if not request.user.is_authenticated:
        return JsonResponse({
            "message": "Authentication required"
        }, status=401)

    user = request.user
    user_profile = UserProfile.objects.get(user=user)

    if request.method == "GET":

        return JsonResponse({
            "user": get_user_data(user)
        })

    if request.method == "PUT":

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "message": "Invalid JSON data"
            }, status=400)

        full_name = data.get(
            "full_name",
            user_profile.full_name
        ).strip()

        phone = data.get(
            "phone",
            user_profile.phone
        ).strip()

        email = data.get(
            "email",
            user.email
        ).strip().lower()

        if not full_name:
            return JsonResponse({
                "message": "Full name is required"
            }, status=400)

        if phone and (
            not phone.isdigit() or len(phone) != 10
        ):
            return JsonResponse({
                "message": "Phone number must contain exactly 10 digits"
            }, status=400)

        if User.objects.filter(
            email__iexact=email
        ).exclude(
            id=user.id
        ).exists():

            return JsonResponse({
                "message": "Email already exists"
            }, status=400)

        user.email = email
        user.save()

        user_profile.full_name = full_name
        user_profile.phone = phone

        # Role is intentionally NOT updated here.
        user_profile.save()

        return JsonResponse({
            "message": "Profile updated successfully",
            "user": get_user_data(user)
        })

    return JsonResponse({
        "message": "Method not allowed"
    }, status=405)


@csrf_exempt
def change_password(request):

    if not request.user.is_authenticated:
        return JsonResponse({
            "message": "Authentication required"
        }, status=401)

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    current_password = data.get(
        "current_password",
        ""
    )

    new_password = data.get(
        "new_password",
        ""
    )

    confirm_password = data.get(
        "confirm_password",
        ""
    )

    if not current_password:
        return JsonResponse({
            "message": "Current password is required"
        }, status=400)

    if not new_password:
        return JsonResponse({
            "message": "New password is required"
        }, status=400)

    if new_password != confirm_password:
        return JsonResponse({
            "message": "Passwords do not match"
        }, status=400)

    if len(new_password) < 8:
        return JsonResponse({
            "message": "New password must contain at least 8 characters"
        }, status=400)

    if not request.user.check_password(
        current_password
    ):
        return JsonResponse({
            "message": "Current password is incorrect"
        }, status=400)

    if current_password == new_password:
        return JsonResponse({
            "message": "New password must be different from current password"
        }, status=400)

    request.user.set_password(new_password)
    request.user.save()

    update_session_auth_hash(
        request,
        request.user
    )

    return JsonResponse({
        "message": "Password changed successfully"
    })


@csrf_exempt
def forgot_password(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    email = data.get(
        "email",
        ""
    ).strip().lower()

    if not email:
        return JsonResponse({
            "message": "Email is required"
        }, status=400)

    users = User.objects.filter(
        email__iexact=email,
        is_active=True
    )

    # Same response whether email exists or not.
    # This prevents revealing which accounts exist.
    if users.exists():

        for user in users:

            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            token = default_token_generator.make_token(
                user
            )

            reset_link = (
                "http://localhost:5173/reset-password/"
                f"{uid}/{token}/"
            )

            send_mail(
                "Smart Event - Password Reset",
                (
                    "You requested a password reset.\n\n"
                    "Open the following link to reset your password:\n\n"
                    f"{reset_link}\n\n"
                    "If you did not request this, you can ignore this email."
                ),
                None,
                [user.email],
                fail_silently=True,
            )

    return JsonResponse({
        "message": (
            "If an account exists with this email, "
            "a password reset link has been sent."
        )
    })


@csrf_exempt
def reset_password(request):

    if request.method != "POST":
        return JsonResponse({
            "message": "Method not allowed"
        }, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({
            "message": "Invalid JSON data"
        }, status=400)

    uid = data.get("uid", "")
    token = data.get("token", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    if not uid or not token:
        return JsonResponse({
            "message": "Invalid password reset link"
        }, status=400)

    if not new_password:
        return JsonResponse({
            "message": "New password is required"
        }, status=400)

    if new_password != confirm_password:
        return JsonResponse({
            "message": "Passwords do not match"
        }, status=400)

    if len(new_password) < 8:
        return JsonResponse({
            "message": "Password must contain at least 8 characters"
        }, status=400)

    try:
        from django.utils.http import urlsafe_base64_decode

        user_id = urlsafe_base64_decode(
            uid
        ).decode()

        user = User.objects.get(
            pk=user_id
        )

    except Exception:
        return JsonResponse({
            "message": "Invalid password reset link"
        }, status=400)

    if not default_token_generator.check_token(
        user,
        token
    ):
        return JsonResponse({
            "message": "Password reset link is invalid or expired"
        }, status=400)

    user.set_password(new_password)
    user.save()

    return JsonResponse({
        "message": "Password reset successfully"
    })