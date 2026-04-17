from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    phone = models.CharField(max_length=15)
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)

    roles = models.ManyToManyField(Role, blank=True, related_name='users')

    def otp_is_valid(self):
        if self.otp_created_at:
            return (timezone.now() - self.otp_created_at).seconds < 300
        return False
    
    REQUIRED_FIELDS = ['email', 'phone']


class Event(models.Model):
    EVENT_TYPES = (
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('hybrid', 'Hybrid'),
    )

    VISIBILITY = (
        ('public', 'Public'),
        ('private', 'Private'),
    )

    title = models.CharField(max_length=255)
    desc = models.TextField()
    
    building = models.CharField(max_length=100, blank=True, null=True, help_text="Məsələn: Əsas korpus")
    floor = models.IntegerField(blank=True, null=True)
    room = models.CharField(max_length=50, blank=True, null=True, help_text="Məsələn: 302 və ya Akt zalı")
    organizer_side = models.CharField(max_length=255, blank=True, null=True, help_text="Tədbiri keçirən tərəf")

    type = models.CharField(max_length=20, choices=EVENT_TYPES)
    visibility = models.CharField(max_length=10, choices=VISIBILITY, default='public')

    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_events')
    allowed_roles = models.ManyToManyField(Role, related_name='events', blank=True)

    start_date = models.DateTimeField() 
    end_date = models.DateTimeField(blank=True, null=True) 
    created_date = models.DateTimeField(auto_now_add=True)
    
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    
    @property
    def average_rating(self):
        
        avg = self.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0

    @property
    def reviews_count(self):
        return self.reviews.count()

    @property
    def participant_count(self):
        return self.allowed_participants.count()

    def is_expired(self):
        return self.end_date and timezone.now() > self.end_date

    def __str__(self):
        return self.title


class Review(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='event_reviews')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1-5 arası ulduz"
    )
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
      
        unique_together = ('event', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.rating}★)"


class EventAgenda(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='agendas')
    time_slot = models.TimeField(help_text="Fəaliyyətin başlama saatı")
    action = models.CharField(max_length=255, help_text="Məsələn: Açılış nitqi və ya Coffee Break")

    class Meta:
        ordering = ['time_slot']

    def __str__(self):
        return f"{self.time_slot} - {self.action}"


class AllowedParticipant(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='allowed_participants')
    email = models.EmailField()
    group_name = models.CharField(max_length=100, blank=True, null=True, help_text="Könüllü: Qrup adı (məsələn, 601.21)")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'email')

    def __str__(self):
        return f"{self.email} -> {self.event.title}"


class EventImage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='events/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.event.title}"