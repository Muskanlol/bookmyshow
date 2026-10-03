from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response


class ProtectedDestroyMixin:
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {'detail': 'This record is in use and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
