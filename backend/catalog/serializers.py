import json

from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from shows.models import Show

from .models import CastMember, City, Movie, Screen, SeatTemplate, Theatre, Tier

IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_uploaded_image(upload, label):
    if upload is None:
        return upload
    size = getattr(upload, 'size', 0) or 0
    if size < 1:
        raise serializers.ValidationError(f'{label} is empty.')
    if size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError(f'{label} must be 5 MB or smaller.')
    content_type = getattr(upload, 'content_type', '') or ''
    if content_type and content_type not in IMAGE_TYPES:
        raise serializers.ValidationError(f'{label} must be a JPG, PNG, or WebP image.')
    try:
        image = Image.open(upload)
        image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise serializers.ValidationError(f'{label} is not a valid image.') from exc
    upload.seek(0)
    return upload


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ('id', 'name', 'state')

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_state(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('State is required.')
        return value

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        state = attrs.get('state', getattr(self.instance, 'state', None))
        existing = City.objects.filter(name__iexact=name, state__iexact=state)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if name and state and existing.exists():
            raise serializers.ValidationError('A city with this name and state already exists.')
        return attrs


class CastMemberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    clear_photo = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta:
        model = CastMember
        fields = ('id', 'name', 'role', 'photo', 'clear_photo')

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_role(self, value):
        value = (value or '').strip() or 'Actor'
        if len(value) > 50:
            raise serializers.ValidationError('Role must be 50 characters or fewer.')
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('clear_photo', None)
        request = self.context.get('request')
        if instance.photo:
            url = instance.photo.url
            data['photo'] = request.build_absolute_uri(url) if request else url
        else:
            data['photo'] = None
        return data


class MovieSerializer(serializers.ModelSerializer):
    cast = CastMemberSerializer(source='cast_members', many=True, required=False)
    clear_poster = serializers.BooleanField(required=False, default=False, write_only=True)

    class Meta:
        model = Movie
        fields = (
            'id',
            'title',
            'description',
            'duration_min',
            'language',
            'genre',
            'certificate',
            'release_date',
            'poster',
            'clear_poster',
            'trailer_url',
            'status',
            'avg_rating',
            'cast',
        )
        read_only_fields = ('id', 'avg_rating')

    def to_internal_value(self, data):
        cast = data.get('cast') if hasattr(data, 'get') else None
        if isinstance(cast, str):
            try:
                parsed = json.loads(cast)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({'cast': 'Cast must be a JSON list.'}) from exc
            plain = {key: data.get(key) for key in data}
            plain['cast'] = parsed
            data = plain
        return super().to_internal_value(data)

    def validate_poster(self, value):
        return validate_uploaded_image(value, 'Poster')

    def validate(self, attrs):
        duration = attrs.get('duration_min', getattr(self.instance, 'duration_min', None))
        if duration is not None and duration < 1:
            raise serializers.ValidationError({'duration_min': 'Duration must be at least 1 minute.'})
        cast = attrs.get('cast_members')
        if cast is not None:
            if len(cast) > 20:
                raise serializers.ValidationError({'cast': 'Add at most 20 cast members.'})
            seen = set()
            for item in cast:
                member_id = item.get('id')
                if member_id is None:
                    continue
                if member_id in seen:
                    raise serializers.ValidationError({'cast': 'Duplicate cast member.'})
                seen.add(member_id)
                if self.instance is None or not self.instance.cast_members.filter(pk=member_id).exists():
                    raise serializers.ValidationError({'cast': 'That cast member is not on this movie.'})
        if (
            self.instance is not None
            and 'duration_min' in attrs
            and attrs['duration_min'] != self.instance.duration_min
            and self.instance.shows.filter(
                status=Show.Status.SCHEDULED,
                end_time__gt=timezone.now(),
            ).exists()
        ):
            raise serializers.ValidationError({
                'duration_min': (
                    'This movie has upcoming shows. Show end times are calculated from the '
                    'duration, so leave the duration as it is or cancel those shows first.'
                ),
            })
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('clear_poster', None)
        if instance.poster:
            request = self.context.get('request')
            url = instance.poster.url
            data['poster'] = request.build_absolute_uri(url) if request else url
        else:
            data['poster'] = None
        return data

    def create(self, validated_data):
        cast_data = validated_data.pop('cast_members', [])
        validated_data.pop('clear_poster', None)
        movie = Movie.objects.create(**validated_data)
        self._replace_cast(movie, cast_data)
        return movie

    def update(self, instance, validated_data):
        cast_data = validated_data.pop('cast_members', None)
        clear_poster = validated_data.pop('clear_poster', False)
        new_poster = validated_data.get('poster')
        if new_poster and instance.poster:
            instance.poster.delete(save=False)
        if clear_poster and 'poster' not in validated_data and instance.poster:
            instance.poster.delete(save=False)
            instance.poster = None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if cast_data is not None:
            self._replace_cast(instance, cast_data)
        return instance

    def _replace_cast(self, movie, cast_data):
        request = self.context.get('request')
        files = request.FILES if request is not None else {}
        kept = []
        for index, item in enumerate(cast_data):
            upload = files.get(f'cast_photo_{index}')
            if upload is not None:
                try:
                    validate_uploaded_image(upload, 'Cast photo')
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({'cast': exc.detail}) from exc
            member = None
            member_id = item.get('id')
            if member_id:
                member = movie.cast_members.filter(pk=member_id).first()
            if member is None:
                member = CastMember(movie=movie, name=item['name'], role=item['role'])
            else:
                member.name = item['name']
                member.role = item['role']
            if upload is not None:
                if member.photo:
                    member.photo.delete(save=False)
                member.photo = upload
            elif item.get('clear_photo') and member.photo:
                member.photo.delete(save=False)
                member.photo = None
            member.save()
            kept.append(member.pk)
        for member in movie.cast_members.exclude(pk__in=kept):
            if member.photo:
                member.photo.delete(save=False)
            member.delete()


class ScreenBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Screen
        fields = ('id', 'name', 'total_rows', 'total_cols')


class TheatreSerializer(serializers.ModelSerializer):
    screens = ScreenBriefSerializer(many=True, read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = Theatre
        fields = (
            'id',
            'city',
            'city_name',
            'name',
            'address',
            'amenities',
            'is_active',
            'screens',
        )

    def validate(self, attrs):
        city = attrs.get('city', getattr(self.instance, 'city', None))
        name = attrs.get('name', getattr(self.instance, 'name', None))
        if city and name:
            existing = Theatre.objects.filter(city=city, name__iexact=name.strip())
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError({
                    'name': 'This city already has a theatre with that name.',
                })
        if isinstance(name, str):
            attrs['name'] = name.strip()
        return attrs


class SeatSerializer(serializers.ModelSerializer):
    label = serializers.CharField(read_only=True)

    class Meta:
        model = SeatTemplate
        fields = (
            'id',
            'row_index',
            'col_index',
            'row_label',
            'number',
            'tier',
            'is_blocked',
            'is_aisle',
            'label',
        )


class ScreenSerializer(serializers.ModelSerializer):
    seats = SeatSerializer(many=True, read_only=True)
    theatre_name = serializers.CharField(source='theatre.name', read_only=True)
    city_name = serializers.CharField(source='theatre.city.name', read_only=True)

    class Meta:
        model = Screen
        fields = (
            'id',
            'theatre',
            'theatre_name',
            'city_name',
            'name',
            'total_rows',
            'total_cols',
            'seats',
        )
        read_only_fields = ('id', 'total_rows', 'total_cols')

    def validate(self, attrs):
        theatre = attrs.get('theatre', getattr(self.instance, 'theatre', None))
        name = attrs.get('name', getattr(self.instance, 'name', None))
        if theatre and name:
            existing = Screen.objects.filter(theatre=theatre, name__iexact=name.strip())
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError({
                    'name': 'This theatre already has a screen with that name.',
                })
        if isinstance(name, str):
            attrs['name'] = name.strip()
        return attrs


class ScreenListSerializer(serializers.ModelSerializer):
    theatre_name = serializers.CharField(source='theatre.name', read_only=True)
    city_name = serializers.CharField(source='theatre.city.name', read_only=True)
    seat_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Screen
        fields = (
            'id',
            'theatre',
            'theatre_name',
            'city_name',
            'name',
            'total_rows',
            'total_cols',
            'seat_count',
        )


class RowTierSerializer(serializers.Serializer):
    from_row = serializers.IntegerField(min_value=1)
    to_row = serializers.IntegerField(min_value=1)
    tier = serializers.ChoiceField(choices=Tier.choices)


class GenerateSeatsSerializer(serializers.Serializer):
    rows = serializers.IntegerField(min_value=1, max_value=30)
    cols = serializers.IntegerField(min_value=1, max_value=40)
    row_tiers = RowTierSerializer(many=True)
    aisle_columns = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )

    def validate_aisle_columns(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate aisle column.')
        return value


class SeatUpdateItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    tier = serializers.ChoiceField(choices=Tier.choices, required=False)
    is_blocked = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if 'tier' not in attrs and 'is_blocked' not in attrs:
            raise serializers.ValidationError('Provide a tier or a blocked flag.')
        return attrs


class SeatPatchSerializer(serializers.Serializer):
    seats = SeatUpdateItemSerializer(many=True, allow_empty=False)
