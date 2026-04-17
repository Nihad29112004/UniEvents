from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission, AllowAny
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.db.models import Q, Count
from django.http import HttpResponse
from datetime import timedelta
import random
import logging
import os

# --- CERTIFICATE UTILITIES ---
from .utils import generate_event_certificate, send_certificate_via_email

# --- SCHEDULER SETUP ---
from django_apscheduler.jobstores import DjangoJobStore
from apscheduler.schedulers.background import BackgroundScheduler

from .models import (
    CustomUser, Role, Event, EventImage, EventAgenda, AllowedParticipant, Review
)
from .serializers import (
    RegisterSerializer, VerifyOTPSerializer, LoginSerializer, LogoutSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
    RoleSerializer, AdminUserRoleSerializer, EventSerializer, EventImageSerializer, 
    EventAgendaSerializer, AllowedParticipantSerializer, ReviewSerializer
)

logger = logging.getLogger(__name__)

# Scheduler-i başladırıq
scheduler = BackgroundScheduler()
scheduler.add_jobstore(DjangoJobStore(), "default")
if not scheduler.running:
    scheduler.start()

# --- CERTIFICATE AUTOMATION TASK ---
def send_certificates_to_all_participants(event_id):
    """Event bitəndə bütün iştirakçılara sertifikat hazırlayıb göndərir"""
    try:
        event = Event.objects.get(id=event_id)
        participants = event.allowed_participants.all()
        
        print(f"--- Starting certificate generation for: {event.title} ---")
        
        for participant in participants:
            user = CustomUser.objects.filter(email=participant.email).first()
            if user:
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            else:
                full_name = participant.email.split('@')[0]

            pdf_path = generate_event_certificate(full_name, event.title)
            
            if pdf_path and os.path.exists(pdf_path):
                success = send_certificate_via_email(participant.email, pdf_path, event.title)
                if success:
                    print(f"✅ Sertifikat göndərildi: {participant.email}")
                else:
                    print(f"❌ Email göndərilə bilmədi: {participant.email}")
            else:
                print(f"❌ PDF yaradıla bilmədi və ya şəkil tapılmadı: {full_name}")
                
        logger.info(f"Certificates process completed for event: {event.title}")
    except Exception as e:
        print(f"🔥 Avtomatlaşdırma xətası: {str(e)}")
        logger.error(f"Error in automated certificate task: {str(e)}")

# --- MAILING FUNCTION (Reminders) ---
def send_reminder_email(email, event_title, start_date, building=None, floor=None, room=None, agenda_items=None):
    subject = f"Reminder: {event_title} starts soon!"
    location_parts = []
    if building: location_parts.append(f"Building: {building}")
    if floor: location_parts.append(f"Floor: {floor}")
    if room: location_parts.append(f"Room/Office: {room}")
    
    location_info = "\n📍 Location: " + ", ".join(location_parts) if location_parts else "\n📍 Location: Online / Check event details."

    agenda_text = ""
    if agenda_items:
        agenda_text = "\n\n📅 Event Agenda:\n" + "-"*35 + "\n"
        for item in agenda_items:
            agenda_text += f"• {item['start_time']} - {item['action']}\n"
        agenda_text += "-"*35

    message = (
        f"Dear Participant,\n\n"
        f"This is a reminder that the event '{event_title}' you joined is starting in 30 minutes.\n"
        f"Start Time: {start_date.strftime('%H:%M')}\n"
        f"{location_info}"
        f"{agenda_text}\n\n"
        f"Best regards,\nUniEvents Team"
    )

    try:
        send_mail(subject, message, None, [email], fail_silently=False)
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")

# --- HELPERS & PERMISSIONS ---
def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}

class IsActiveUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)

# --- AUTHENTICATION & USER INFO ---
class UserInfoAPI(GenericAPIView):
    permission_classes = [IsAuthenticated, IsActiveUser]
    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        })

class RegisterAPI(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.otp = str(random.randint(100000, 999999))
            user.otp_created_at = timezone.now()
            user.save()
            try:
                send_mail("OTP Verification", f"Code: {user.otp}", None, [user.email], fail_silently=False)
            except Exception:
                user.delete()
                return Response({"error": "Could not send OTP email."}, status=500)
            return Response({"message": "OTP sent", "email": user.email}, status=201)
        return Response(serializer.errors, status=400)

class VerifyOTPAPI(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = VerifyOTPSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = CustomUser.objects.get(email=serializer.validated_data["email"])
                if user.otp == serializer.validated_data["otp"] and user.otp_is_valid():
                    user.is_active = True
                    user.otp = None
                    user.save()
                    return Response({"tokens": get_tokens(user)}, status=200)
            except: pass
        return Response({"error": "Invalid OTP"}, status=400)

class LoginAPI(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            username_input = serializer.validated_data["username"].strip()
            password_input = serializer.validated_data["password"]
            user = CustomUser.objects.filter(Q(username__iexact=username_input) | Q(email__iexact=username_input)).first()
            if not user or not user.check_password(password_input):
                return Response({"error": "Invalid credentials"}, status=401)
            if not user.is_active:
                return Response({"error": "Verify OTP"}, status=403)
            return Response({"tokens": get_tokens(user), "user": {"username": user.username, "is_staff": user.is_staff}}, status=200)
        return Response({"error": "Invalid credentials"}, status=401)

class LogoutAPI(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                RefreshToken(serializer.validated_data["refresh"]).blacklist()
                return Response({"success": "Logged out"})
            except: pass
        return Response({"error": "Invalid token"}, status=400)

class ForgotPasswordAPI(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = ForgotPasswordSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = CustomUser.objects.get(email=serializer.validated_data["email"])
                user.otp = str(random.randint(100000, 999999))
                user.otp_created_at = timezone.now()
                user.save()
                send_mail("Reset OTP", f"Code: {user.otp}", None, [user.email])
                return Response({"message": "OTP sent"})
            except CustomUser.DoesNotExist:
                return Response({"error": "User not found"}, status=404)
        return Response(serializer.errors, status=400)

class ResetPasswordAPI(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = ResetPasswordSerializer
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = CustomUser.objects.get(email=serializer.validated_data["email"])
                if user.otp == serializer.validated_data["otp"] and user.otp_is_valid():
                    user.set_password(serializer.validated_data["new_password"])
                    user.otp = None
                    user.save()
                    return Response({"message": "Password reset success"})
            except: pass
        return Response({"error": "Invalid request"}, status=400)

# --- VIEWSETS ---

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

class AdminUserRoleViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserRoleSerializer
    permission_classes = [IsAuthenticated, IsActiveUser, permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        queryset = CustomUser.objects.prefetch_related('roles').order_by('username')
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(Q(username__icontains=search) | Q(email__icontains=search))
        return queryset

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsActiveUser(), permissions.IsAdminUser()]
        return [IsAuthenticated(), IsActiveUser()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser: 
            queryset = Event.objects.all()
        else:
            user_role_ids = user.roles.values_list('id', flat=True)
            queryset = Event.objects.filter(
                Q(allowed_roles__isnull=True) | Q(allowed_roles__id__in=user_role_ids)
            ).distinct()

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        day = self.request.query_params.get('day')
        all_events = self.request.query_params.get('all_events')
        event_type = self.request.query_params.get('type')
        search = (self.request.query_params.get('search') or '').strip()

        if all_events == 'true':
            pass 
        elif year and month and day:
            queryset = queryset.filter(start_date__year=year, start_date__month=month, start_date__day=day)
        else:
            target_year = year if year else timezone.now().year
            target_month = month if month else timezone.now().month
            queryset = queryset.filter(start_date__year=target_year, start_date__month=target_month)

        if event_type in {'online', 'offline', 'hybrid'}:
            queryset = queryset.filter(type=event_type)

        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(desc__icontains=search))

        return queryset.order_by(self.request.query_params.get('ordering', '-start_date'))

    def schedule_certificate_task(self, event):
        """Sertifikat tapşırığını planlayır"""
        if event.end_date and event.end_date > timezone.now():
            scheduler.add_job(
                send_certificates_to_all_participants,
                trigger='date',
                run_date=event.end_date,
                args=[event.id],
                id=f"cert_event_{event.id}",
                replace_existing=True
            )
            print(f"--- Certificate schedule set for: {event.end_date} (Event ID: {event.id}) ---")

    def perform_create(self, serializer):
        event = serializer.save(created_by=self.request.user)
        self.schedule_certificate_task(event)

    def perform_update(self, serializer):
        event = serializer.save()
        self.schedule_certificate_task(event)

    @action(detail=True, methods=['get'])
    def group_statistics(self, request, pk=None):
        event = self.get_object()
        stats = event.allowed_participants.values('group_name').annotate(count=Count('id'))
        return Response(stats)

class EventImageViewSet(viewsets.ModelViewSet):
    queryset = EventImage.objects.all()
    serializer_class = EventImageSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

class AllowedParticipantViewSet(viewsets.ModelViewSet):
    queryset = AllowedParticipant.objects.all()
    serializer_class = AllowedParticipantSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

    def perform_create(self, serializer):
        event = serializer.validated_data.get('event')
        user = self.request.user
        if not event: raise ValidationError({"event": "Event is required."})

        if user.is_staff or user.is_superuser:
            email = self.request.data.get('email') or user.email
        else:
            email = user.email
            event_roles = event.allowed_roles.all()
            if event_roles.exists():
                if not user.roles.filter(id__in=event_roles.values_list('id', flat=True)).exists():
                    raise ValidationError({"detail": "Role not authorized."})

        if event.max_participants is not None and event.allowed_participants.count() >= event.max_participants:
            raise ValidationError({"detail": "Event is full."})

        if AllowedParticipant.objects.filter(event=event, email=email).exists():
            raise ValidationError({"detail": "Already registered."})

        instance = serializer.save(email=email)

        # REMINDER LOGIC
        try:
            agenda_qs = event.agendas.all().order_by('time_slot')
            agenda_list = [{'action': i.action, 'start_time': i.time_slot.strftime('%H:%M')} for i in agenda_qs]
            reminder_time = event.start_date - timedelta(minutes=30)
            now = timezone.now()

            if reminder_time > now:
                scheduler.add_job(send_reminder_email, trigger='date', run_date=reminder_time, 
                                  args=[email, event.title, event.start_date, getattr(event, 'building', ""), 
                                        getattr(event, 'floor', ""), getattr(event, 'room', ""), agenda_list],
                                  id=f"reminder_{instance.id}", replace_existing=True)
            else:
                scheduler.add_job(send_reminder_email, trigger='date', run_date=now + timedelta(seconds=10),
                                  args=[email, event.title, event.start_date, getattr(event, 'building', ""), 
                                        getattr(event, 'floor', ""), getattr(event, 'room', ""), agenda_list],
                                  id=f"urgent_{instance.id}")
        except Exception as e:
            logger.error(f"Scheduler failed: {str(e)}")

    @action(detail=False, methods=['post'], url_path='unjoin')
    def unjoin(self, request):
        event_id = request.data.get('event')
        if not event_id: return Response({"error": "Event ID required."}, status=400)
        registration = AllowedParticipant.objects.filter(event_id=event_id, email=request.user.email).first()
        if registration:
            try: scheduler.remove_job(f"reminder_{registration.id}")
            except: pass
            registration.delete()
            return Response({"message": "Successfully unregistered."}, status=200)
        return Response({"error": "Not registered."}, status=404)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

    def perform_create(self, serializer):
        """
        Bütün məhdudiyyətləri qaldırmışıq. 
        Əgər 'Failed' verirsə, bu serializer və ya baza xətasıdır.
        """
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Xətanın tam olaraq nə olduğunu görmək üçün bu metodu override edirik.
        """
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Terminalda xətanı çap et (Məsələn: 'user': 'This field must be unique')
            print(f"❌ Serializer Xətası: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if event_id:
            return Review.objects.filter(event_id=event_id)
        return Review.objects.all()

# --- MANUAL TEST VIEW ---
def test_cert_view(request, event_id):
    """Sertifikatı manual test etmək üçün: http://127.0.0.1:8000/api/test-cert/<id>/"""
    send_certificates_to_all_participants(event_id)
    return HttpResponse("Manual certificate test triggered. Check terminal and email.")