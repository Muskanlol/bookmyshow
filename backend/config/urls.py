from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/admin/', include('config.api_urls')),
    path('api/v1/', include('config.customer_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = 'BookMyShow admin'
admin.site.site_title = 'BookMyShow admin'
admin.site.index_title = 'Catalog, shows, and bookings'
