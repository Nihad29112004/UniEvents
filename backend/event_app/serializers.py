from rest_framework import serializers
from .models import (
    CustomUser, Role, Event, EventImage, EventAgenda, AllowedParticipant, Review
)
from django.contrib.auth.password_validation import validate_password

# --- USER & AUTH SERIALIZERS ---

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'phone', 'password')

    def validate_email(self, value):
        whitelist_emails = ['your_test_email@gmail.com']
        email_lower = value.lower()

        if email_lower in whitelist_emails:
            return value

        try:
            local_part, domain = email_lower.split('@', 1)
        except ValueError:
            raise serializers.ValidationError("Please enter a valid email format.")

        if not (local_part and domain.endswith('.edu.az') and domain != 'edu.az'):
            raise serializers.ValidationError(
                "Registration requires a university email (e.g., name@university.edu.az)."
            )
        return value

    def create(self, validated_data):
        user = CustomUser(
            username=validated_data['username'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            is_active=False,
        )
        user.set_password(validated_data['password'])
        user.save()

        default_role, _ = Role.objects.get_or_create(name='Student')
        user.roles.add(default_role)
        return user

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)

class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(help_text="Enter your refresh token to logout")

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

# --- ROLE & ADMIN SERIALIZERS ---

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class AdminUserRoleSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='roles',
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'roles', 'role_ids', 'is_staff', 'is_superuser']

# --- REVIEW SERIALIZER (Yeni) ---

class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'event', 'user', 'rating', 'comment', 'created_at']
        read_only_fields = ['user', 'created_at']

    def validate(self, data):
       
        user = self.context['request'].user
        event = data.get('event')
        if Review.objects.filter(event=event, user=user).exists():
            raise serializers.ValidationError("You have already reviewed this event.")
        return data

# --- EVENT SERIALIZERS ---

class EventImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImage
        fields = ['id', 'event', 'image', 'uploaded_at']
        read_only_fields = ['uploaded_at']

class EventAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventAgenda
        fields = ['time_slot', 'action'] 

class EventSerializer(serializers.ModelSerializer):
    allowed_roles = RoleSerializer(many=True, read_only=True)
    allowed_roles_ids = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), many=True, write_only=True, source='allowed_roles',
        required=False
    )
    images = EventImageSerializer(many=True, read_only=True)
    agendas = EventAgendaSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True) 
    is_joined = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField() 
    reviews_count = serializers.ReadOnlyField() 

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'desc', 'type', 'visibility', 'created_by',
            'building', 'floor', 'room', 'organizer_side',
            'allowed_roles', 'allowed_roles_ids', 'images', 'agendas', 'reviews',
            'is_joined', 'start_date', 'end_date', 'created_date', 
            'participant_count', 'max_participants', 'average_rating', 'reviews_count'
        ]
        read_only_fields = ['created_by', 'created_date', 'participant_count', 'average_rating', 'reviews_count']

    def get_is_joined(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not request or not user or not user.is_authenticated:
            return False
        return obj.allowed_participants.filter(email=user.email).exists()

class AllowedParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowedParticipant
        fields = ['id', 'event', 'email', 'group_name']
        read_only_fields = ['email']