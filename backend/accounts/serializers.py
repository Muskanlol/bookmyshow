from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'name',
            'email',
            'phone',
            'role',
            'is_staff',
            'is_active',
            'date_joined',
        )
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('is_active',)

    def validate_is_active(self, value):
        if self.instance.pk == self.context['request'].user.pk and value is False:
            raise serializers.ValidationError('You cannot block your own account.')
        return value
