import csv
from datetime import datetime
from io import StringIO

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import export_rows, occupancy, revenue, summary

EXPORT_FIELDS = (
    'booking_id',
    'paid_at',
    'movie',
    'theatre',
    'city',
    'customer',
    'amount',
    'status',
)


def query_date(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    try:
        return datetime.strptime(raw, '%Y-%m-%d').date()
    except ValueError as exc:
        raise serializers.ValidationError({name: 'Use YYYY-MM-DD.'}) from exc


class SummaryReportView(APIView):
    def get(self, request):
        day = query_date(request, 'date') or timezone.localdate()
        return Response(summary(day))


class RevenueReportView(APIView):
    def get(self, request):
        group_by = request.query_params.get('group_by', 'movie')
        if group_by not in ('movie', 'theatre', 'date'):
            raise serializers.ValidationError({
                'group_by': 'Choose movie, theatre, or date.',
            })
        return Response({
            'group_by': group_by,
            'results': revenue(
                group_by,
                query_date(request, 'date_from'),
                query_date(request, 'date_to'),
            ),
        })


class OccupancyReportView(APIView):
    def get(self, request):
        day = query_date(request, 'date') or timezone.localdate()
        theatre = request.query_params.get('theatre')
        theatre_id = None
        if theatre:
            if not str(theatre).isdigit():
                raise serializers.ValidationError({'theatre': 'Theatre must be an id.'})
            theatre_id = int(theatre)
        payload = occupancy(day, theatre_id=theatre_id)
        payload['date'] = day
        return Response(payload)


class CsvExportView(APIView):
    def get(self, request):
        rows = export_rows(query_date(request, 'date_from'), query_date(request, 'date_to'))
        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=EXPORT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="revenue.csv"'
        return response
