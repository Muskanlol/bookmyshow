from rest_framework import mixins, viewsets
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .filters import UserFilter
from .models import User
from .serializers import UserSerializer, UserUpdateSerializer


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise AuthenticationFailed('Staff access only.')
        data['user'] = UserSerializer(self.user).data
        return data


class AdminLoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = AdminTokenObtainPairSerializer


class AdminRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by('name')
    filterset_class = UserFilter
    search_fields = ('name', 'email', 'phone')
    ordering_fields = ('name', 'email', 'date_joined')
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance).data)
