import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('event_app', '0004_customuser_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='visibility',
            field=models.CharField(
                choices=[('public', 'Public'), ('private', 'Private')],
                default='public',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='event',
            name='created_by',
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='created_events',
                to=settings.AUTH_USER_MODEL,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='event',
            name='max_participants',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
