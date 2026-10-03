from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User
from .permissions import IsCustomer
from .serializers import UserSerializer


class CustomerTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.is_staff or self.user.role != User.Role.CUSTOMER:
            raise AuthenticationFailed('This sign-in is for customers.')
        data['user'] = UserSerializer(self.user).data
        return data


class CustomerLoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomerTokenObtainPairSerializer


class CustomerRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_email(self, value):
        email = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def validate_phone(self, value):
        phone = (value or '').strip()
        if phone and User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError('An account with this phone already exists.')
        return phone

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            name=serializer.validated_data['name'],
            phone=serializer.validated_data.get('phone', ''),
            role=User.Role.CUSTOMER,
        )
        token = CustomerTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                'access': str(token.access_token),
                'refresh': str(token),
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
