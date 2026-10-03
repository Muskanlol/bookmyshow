from decimal import Decimal

from rest_framework import serializers

from catalog.models import Movie, Screen, Tier
from config.utils import as_aware

from .models import Show
from .services import create_show, update_show


class TierPriceSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(choices=Tier.choices)
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01'),
    )


def _reject_duplicate_tiers(tier_prices):
    tiers = [item['tier'] for item in tier_prices]
    if len(tiers) != len(set(tiers)):
        raise serializers.ValidationError('Duplicate tier.')


class ShowReadSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    duration_min = serializers.IntegerField(source='movie.duration_min', read_only=True)
    screen_name = serializers.CharField(source='screen.name', read_only=True)
    theatre_id = serializers.IntegerField(source='screen.theatre_id', read_only=True)
    theatre_name = serializers.CharField(source='screen.theatre.name', read_only=True)
    city_name = serializers.CharField(source='screen.theatre.city.name', read_only=True)
    tier_prices = serializers.SerializerMethodField()

    class Meta:
        model = Show
        fields = (
            'id',
            'movie',
            'movie_title',
            'duration_min',
            'screen',
            'screen_name',
            'theatre_id',
            'theatre_name',
            'city_name',
            'start_time',
            'end_time',
            'status',
            'tier_prices',
        )

    def get_tier_prices(self, obj):
        return [
            {'id': price.id, 'tier': price.tier, 'price': price.price}
            for price in obj.tier_prices.all()
        ]


class ShowCreateSerializer(serializers.Serializer):
    movie = serializers.PrimaryKeyRelatedField(queryset=Movie.objects.all())
    screen = serializers.PrimaryKeyRelatedField(queryset=Screen.objects.all())
    start_time = serializers.DateTimeField()
    tier_prices = TierPriceSerializer(many=True, allow_empty=False)

    def validate_start_time(self, value):
        return as_aware(value)

    def validate_tier_prices(self, value):
        _reject_duplicate_tiers(value)
        return value

    def create(self, validated_data):
        return create_show(**validated_data)

    def update(self, instance, validated_data):
        raise NotImplementedError


class ShowUpdateSerializer(serializers.Serializer):
    start_time = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(choices=Show.Status.choices, required=False)
    tier_prices = TierPriceSerializer(many=True, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Provide a field to update.')
        if 'tier_prices' in attrs:
            _reject_duplicate_tiers(attrs['tier_prices'])
        return attrs

    def validate_start_time(self, value):
        return as_aware(value)

    def update(self, instance, validated_data):
        return update_show(
            instance,
            start_time=validated_data.get('start_time'),
            status=validated_data.get('status'),
            tier_prices=validated_data.get('tier_prices'),
            change_start='start_time' in validated_data,
            change_status='status' in validated_data,
            change_prices='tier_prices' in validated_data,
        )

    def create(self, validated_data):
        raise NotImplementedError


class BulkShowSerializer(serializers.Serializer):
    movie = serializers.PrimaryKeyRelatedField(queryset=Movie.objects.all())
    screen_ids = serializers.PrimaryKeyRelatedField(
        queryset=Screen.objects.all(),
        many=True,
        allow_empty=False,
        source='screens',
    )
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    time_slots = serializers.ListField(
        child=serializers.TimeField(),
        allow_empty=False,
    )
    tier_prices = TierPriceSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        if attrs['date_to'] < attrs['date_from']:
            raise serializers.ValidationError({'date_to': 'Must be on or after date_from.'})
        _reject_duplicate_tiers(attrs['tier_prices'])
        return attrs
