from django.apps import AppConfig

class EventAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'event_app'

    def ready(self):
        
        from .views import scheduler
        if not scheduler.running:
            scheduler.start()
            print("🚀 Scheduler uğurla işə düşdü və tapşırıqları gözləyir...")