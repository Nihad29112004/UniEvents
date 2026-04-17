import os
from datetime import datetime
from django.conf import settings
from django.core.mail import EmailMessage
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4

def generate_event_certificate(user_full_name, event_title):
    """Sertifikat PDF yaradır və yolunu (path) qaytarır."""
    output_dir = os.path.join(settings.MEDIA_ROOT, 'certs')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    file_name = f"Certificate_{user_full_name.replace(' ', '_')}.pdf"
    file_path = os.path.join(output_dir, file_name)

    c = canvas.Canvas(file_path, pagesize=landscape(A4))
    width, height = landscape(A4)

    bg_image_path = os.path.normpath(os.path.join(settings.BASE_DIR, 'media', 'cert_bg.png'))
    
    if os.path.exists(bg_image_path):
        try:
            c.drawImage(bg_image_path, 0, 0, width=width, height=height)
        except Exception as e:
            print(f"Image error: {e}")
    else:
        print(f"⚠️ Arxa fon tapılmadı: {bg_image_path}")

    

   
    c.setFont("Helvetica-Bold", 38)
    c.setFillColorRGB(0.5, 0, 0)
    
    c.drawCentredString(width / 2, height / 2 + 30, user_full_name)

   
    c.setFont("Helvetica-Oblique", 18)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(width / 2, height / 2 - 95, f"For successful participation in {event_title}")

    
    current_date = datetime.now().strftime("%d.%m.%Y")
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
   
    c.drawString(220, 110, current_date)

    
    c.setFont("Times-BoldItalic", 18)
   
    c.drawString(570, 110, "UniEvents Director")

    c.save()
    return file_path

def send_certificate_via_email(user_email, pdf_path, event_title):
    """PDF-i email ilə göndərir."""
    subject = f"Congratulations! Your Certificate for {event_title}"
    body = f"Dear Participant,\n\nThank you for attending the '{event_title}' event. Please find your official certificate attached.\n\nBest regards,\nUniEvents Team"
    
    
    email = EmailMessage(
        subject, 
        body, 
        settings.DEFAULT_FROM_EMAIL, 
        [user_email]
    )
    
    try:
        with open(pdf_path, 'rb') as f:
            email.attach(f"Certificate_{event_title.replace(' ', '_')}.pdf", f.read(), 'application/pdf')
        email.send()
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False