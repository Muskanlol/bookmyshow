from decimal import Decimal

from rest_framework import serializers

from .models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            'id',
            'code',
            'type',
            'value',
            'valid_from',
            'valid_to',
            'max_uses',
            'used_count',
        )
        read_only_fields = ('id', 'used_count')
        extra_kwargs = {
            'max_uses': {'min_value': 1},
            'value': {'min_value': Decimal('0.01')},
        }

    def validate_code(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError('Code is required.')
        return value

    def validate(self, attrs):
        coupon_type = attrs.get('type', getattr(self.instance, 'type', None))
        value = attrs.get('value', getattr(self.instance, 'value', None))
        valid_from = attrs.get('valid_from', getattr(self.instance, 'valid_from', None))
        valid_to = attrs.get('valid_to', getattr(self.instance, 'valid_to', None))
        if coupon_type == Coupon.Type.PERCENT and value is not None and value > 100:
            raise serializers.ValidationError({'value': 'A percent coupon cannot be more than 100.'})
        if valid_from and valid_to and valid_to <= valid_from:
            raise serializers.ValidationError({'valid_to': 'valid_to must be after valid_from.'})
        return attrs
