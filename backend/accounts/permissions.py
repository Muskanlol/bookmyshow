from rest_framework.permissions import BasePermission

from .models import User


class IsCustomer(BasePermission):
    """Signed-in customers only. Staff stay on the admin API."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and not user.is_staff
            and user.role == User.Role.CUSTOMER
        )
