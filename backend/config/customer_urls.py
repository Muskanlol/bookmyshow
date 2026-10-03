from django.urls import path

from accounts.customer_views import CustomerLoginView, CustomerRefreshView, MeView, RegisterView
from bookings.customer_views import (
    BookingDetailView,
    BookingListView,
    CancelBookingView,
    HoldSeatsView,
    PayBookingView,
    QuoteBookingView,
)
from catalog.customer_views import CityListView, MovieDetailView, MovieListView, MovieShowsView, ReviewCreateView
from shows.customer_views import ShowSeatsView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='customer-register'),
    path('auth/login/', CustomerLoginView.as_view(), name='customer-login'),
    path('auth/refresh/', CustomerRefreshView.as_view(), name='customer-refresh'),
    path('auth/me/', MeView.as_view(), name='customer-me'),
    path('cities/', CityListView.as_view(), name='customer-cities'),
    path('movies/', MovieListView.as_view(), name='customer-movies'),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name='customer-movie'),
    path('movies/<int:pk>/shows/', MovieShowsView.as_view(), name='customer-movie-shows'),
    path('movies/<int:pk>/reviews/', ReviewCreateView.as_view(), name='customer-review'),
    path('shows/<int:pk>/seats/', ShowSeatsView.as_view(), name='customer-show-seats'),
    path('bookings/hold/', HoldSeatsView.as_view(), name='customer-hold'),
    path('bookings/', BookingListView.as_view(), name='customer-bookings'),
    path('bookings/<int:pk>/', BookingDetailView.as_view(), name='customer-booking'),
    path('bookings/<int:pk>/quote/', QuoteBookingView.as_view(), name='customer-quote'),
    path('bookings/<int:pk>/pay/', PayBookingView.as_view(), name='customer-pay'),
    path('bookings/<int:pk>/cancel/', CancelBookingView.as_view(), name='customer-cancel'),
]
