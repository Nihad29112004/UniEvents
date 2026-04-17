from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterAPI, VerifyOTPAPI, LoginAPI, LogoutAPI,
    ForgotPasswordAPI, ResetPasswordAPI,
    UserInfoAPI,  
    RoleViewSet, AdminUserRoleViewSet, EventViewSet, EventImageViewSet,
    AllowedParticipantViewSet, ReviewViewSet  
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'admin-users', AdminUserRoleViewSet, basename='admin-users')
router.register(r'events', EventViewSet, basename='events')
router.register(r'event-images', EventImageViewSet, basename='event-images')
router.register(r'allowed-participants', AllowedParticipantViewSet, basename='allowed-participants') 
router.register(r'reviews', ReviewViewSet, basename='reviews') 

urlpatterns = [
    path('api/register/', RegisterAPI.as_view(), name='api_register'),
    path('api/verify-otp/', VerifyOTPAPI.as_view(), name='api_verify_otp'),
    path('api/login/', LoginAPI.as_view(), name='api_login'),
    path('api/logout/', LogoutAPI.as_view(), name='api_logout'),
    path('api/forgot-password/', ForgotPasswordAPI.as_view(), name='api_forgot_password'),
    path('api/reset-password/', ResetPasswordAPI.as_view(), name='api_reset_password'),
    
    path('api/profile/', UserInfoAPI.as_view(), name='api_profile'),
    
    path('api/', include(router.urls)),
]