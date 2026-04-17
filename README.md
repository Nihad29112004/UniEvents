# Event Management System

A Django REST Framework-based event management system with OTP-based authentication, JWT authorization, role-based access control, and a basic frontend demonstrating the full user flow.

## Project Structure

```
/backend        Django REST API
/frontend       HTML/JS frontend
README.md
```

## Tech Stack

- **Backend:** Django 6.0, Django REST Framework, SimpleJWT
- **Database:** SQLite (development)
- **Authentication:** JWT (access: 60 min, refresh: 1 day)
- **OTP:** Custom 6-digit OTP with 5-minute expiry
- **Email:** Gmail SMTP
- **API Docs:** Swagger / OpenAPI (drf-yasg)
- **Frontend:** Plain HTML/CSS/JavaScript

## How to Run

### Prerequisites

- Python 3.12+

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Create a superuser (for admin panel access)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```
w
The API will be available at http://127.0.0.1:port/

- **Swagger UI:** http://127.0.0.1:port/swagger/
- **ReDoc:** http://127.0.0.1:port/redoc/
- **Admin Panel:** http://127.0.0.1:port/admin/

### Frontend Setup

Open `frontend/index.html` directly in a browser, or serve it with a local server:

```bash
cd frontend
python -m http.server 5500
```

Then open http://127.0.0.1:5500/

> **Note:** The backend must be running at http://127.0.0.1:8000 for the frontend to work.

## Tested End-to-End Scenario

### Flow: Register -> Verify OTP -> Login -> Create Event

1. **Register:** Fill in username, email, phone, and password on the registration form. The API creates an inactive user (`is_active=False`) and sends a 6-digit OTP to the provided email.

2. **Verify OTP:** Enter the OTP received by email. If email delivery is not configured, retrieve the OTP from the Django Admin panel (http://127.0.0.1:8000/admin/ -> Users -> select user -> OTP Info section). On success, the account is activated and JWT tokens are issued.

3. **Login:** Enter username and password to receive fresh JWT tokens (access + refresh).

4. **Create Event:** Fill in event title, description, type (online/offline/hybrid), and date. The form sends an authenticated `POST` request with the JWT access token in the `Authorization: Bearer <token>` header. On success, the created event details are displayed.

## API Endpoints

### Authentication (public)

| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| POST   | `/api/register/`       | Register a new user                |
| POST   | `/api/verify-otp/`     | Verify email with 6-digit OTP      |
| POST   | `/api/login/`          | Login and receive JWT tokens       |
| POST   | `/api/logout/`         | Blacklist refresh token (requires auth) |
| POST   | `/api/forgot-password/`| Send password reset OTP to email   |
| POST   | `/api/reset-password/` | Reset password with OTP            |

### Roles (requires authentication)

| Method | Endpoint            | Description       |
|--------|---------------------|-------------------|
| GET    | `/api/roles/`       | List all roles    |
| POST   | `/api/roles/`       | Create a role     |
| GET    | `/api/roles/{id}/`  | Retrieve a role   |
| PUT    | `/api/roles/{id}/`  | Update a role     |
| DELETE | `/api/roles/{id}/`  | Delete a role     |

### Events (requires authentication)

| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| GET    | `/api/events/`       | List events        |
| POST   | `/api/events/`       | Create an event    |
| GET    | `/api/events/{id}/`  | Retrieve an event  |
| PUT    | `/api/events/{id}/`  | Update an event    |
| DELETE | `/api/events/{id}/`  | Delete an event    |

### Event Images (requires authentication)

| Method | Endpoint                  | Description          |
|--------|---------------------------|----------------------|
| GET    | `/api/event-images/`      | List event images    |
| POST   | `/api/event-images/`      | Upload an image      |
| GET    | `/api/event-images/{id}/` | Retrieve an image    |
| DELETE | `/api/event-images/{id}/` | Delete an image      |

## Data Models

- **CustomUser** - Extended Django user with phone, email, OTP fields, and role assignments
- **Role** - Named roles for access control
- **Event** - Events with title, description, type, agenda, dates, and role-based access
- **EventImage** - Images attached to events

## Security

- All protected endpoints require a valid JWT Bearer token
- Unauthenticated requests return `401 Unauthorized`
- Inactive users (unverified) receive `403 Forbidden`
- Role-based filtering is enforced on events via `allowed_roles`
