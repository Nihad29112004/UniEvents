# How To Run

This project has:
- Backend API: Django (folder: backend)
- Frontend app: Vite + React (folder: front)

## Prerequisites

- Python 3.12+
- Node.js 18+ (or newer LTS)
- npm

## 1. Backend Setup (Django)

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### macOS/Linux

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Create backend environment file

Create `backend/.env` and copy only the Backend section values from the root `.env.example`.

Minimum recommended values:

```env
DJANGO_SECRET_KEY=replace-with-a-strong-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8080,http://localhost:8080
```

If you want OTP emails, also set:

```env
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-email-app-password
DEFAULT_FROM_EMAIL=Event System <your-email@example.com>
```

### Run migrations and start backend

```bash
python manage.py migrate
python manage.py runserver 127.0.0.1:9000
```

Note: Running on port 9000 matches the frontend proxy default.

## 2. Frontend Setup (Vite)

```bash
cd front
npm install
```

### Create frontend environment file

Create `front/.env` and copy only the Frontend section values from the root `.env.example`:

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:9000
```

### Start frontend dev server

```bash
npm run dev
```

Open:

- Frontend: http://127.0.0.1:8080

## 3. Useful URLs

- API base: http://127.0.0.1:9000/api/
- Swagger: http://127.0.0.1:9000/swagger/
- ReDoc: http://127.0.0.1:9000/redoc/
- Django Admin: http://127.0.0.1:9000/admin/

## Optional Commands

From `backend`:

```bash
python manage.py createsuperuser
python manage.py seed_demo_data
python manage.py send_event_reminders
```

From `front`:

```bash
npm run test
npm run build
```
