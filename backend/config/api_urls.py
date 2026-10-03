from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import AdminLoginView, AdminRefreshView, MeView, UserViewSet
from bookings.views import BookingViewSet
from catalog.views import CityViewSet, MovieViewSet, ScreenViewSet, TheatreViewSet
from offers.views import CouponViewSet
from reports.views import (
    CsvExportView,
    OccupancyReportView,
    RevenueReportView,
    SummaryReportView,
)
from shows.views import ShowViewSet

router = DefaultRouter()
router.register('cities', CityViewSet, basename='city')
router.register('movies', MovieViewSet, basename='movie')
router.register('theatres', TheatreViewSet, basename='theatre')
router.register('screens', ScreenViewSet, basename='screen')
router.register('shows', ShowViewSet, basename='show')
router.register('coupons', CouponViewSet, basename='coupon')
router.register('bookings', BookingViewSet, basename='booking')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/refresh/', AdminRefreshView.as_view(), name='admin-refresh'),
    path('auth/me/', MeView.as_view(), name='admin-me'),
    path('reports/summary/', SummaryReportView.as_view(), name='report-summary'),
    path('reports/revenue/', RevenueReportView.as_view(), name='report-revenue'),
    path('reports/occupancy/', OccupancyReportView.as_view(), name='report-occupancy'),
    path('reports/export.csv', CsvExportView.as_view(), name='report-export'),
    path('', include(router.urls)),
]
