from rest_framework import viewsets

from config.mixins import ProtectedDestroyMixin

from .models import Coupon
from .serializers import CouponSerializer


class CouponViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    filterset_fields = ('type',)
    search_fields = ('code',)
    ordering_fields = ('code', 'valid_from', 'valid_to')
