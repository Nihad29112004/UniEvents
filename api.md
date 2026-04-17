The project also exposes auto-generated docs:

- Swagger UI: `GET /swagger/`
- ReDoc: `GET /redoc/`
- OpenAPI JSON/YAML: `GET /swagger.json`, `GET /swagger.yaml`

---

## 1. Authentication & User Flows

### 1.1 Register

- **URL**: `POST /api/register/`
- **Auth**: Public (no token)
- **Description**: Creates a new inactive user and sends a 6‑digit OTP to their email.

**Request body (JSON)**

```json
{
	"username": "student01",
	"email": "name@university.edu.az",
	"phone": "+994501234567",
	"password": "StrongPassword123!"
}
```

Field notes:

- `email`
	- Must be a valid email.
	- Must be either:
		- Whitelisted (e.g. `senin_test_emailin@gmail.com`), or
		- A university email with domain ending in `.edu.az` (but not exactly `edu.az`).
- `password`: validated by Django’s password validators.

**Responses**

- `201 Created`

	```json
	{
		"message": "OTP sent",
		"email": "name@university.edu.az"
	}
	```

- `400 Bad Request` – validation errors (email format, password strength, etc.).

---

### 1.2 Verify OTP (Account Activation)

- **URL**: `POST /api/verify-otp/`
- **Auth**: Public (no token)
- **Description**: Verifies the OTP sent on registration or when needed, activates the user, and returns JWT tokens.

**Request body (JSON)**

```json
{
	"email": "name@university.edu.az",
	"otp": "123456"
}
```

**Responses**

- `200 OK`

	```json
	{
		"tokens": {
			"refresh": "<jwt_refresh_token>",
			"access": "<jwt_access_token>"
		}
	}
	```

- `400 Bad Request`

	```json
	{
		"error": "Invalid OTP"
	}
	```

Notes:

- OTP is valid for ~5 minutes (300 seconds) from `otp_created_at`.
- On success user becomes `is_active = true` and `otp` is cleared.

---

### 1.3 Login

- **URL**: `POST /api/login/`
- **Auth**: Public (no token)
- **Description**: Logs the user in using username *or* email plus password, returns JWT tokens and basic user info.

**Request body (JSON)**

```json
{
	"username": "student01",   // or email, e.g. "name@university.edu.az"
	"password": "StrongPassword123!"
}
```

**Responses**

- `200 OK`

	```json
	{
		"tokens": {
			"refresh": "<jwt_refresh_token>",
			"access": "<jwt_access_token>"
		},
		"user": {
			"username": "student01",
			"is_staff": false,
			"is_superuser": false
		}
	}
	```

- `401 Unauthorized` – invalid credentials or invalid payload.

	```json
	{
		"error": "Invalid credentials"
	}
	```

- `403 Forbidden` – user exists but `is_active` is false (OTP not verified).

	```json
	{
		"error": "Verify OTP"
	}
	```

---

### 1.4 Logout

- **URL**: `POST /api/logout/`
- **Auth**: Required (`Authorization: Bearer <access_token>`)
- **Description**: Blacklists the provided refresh token (logs out the session).

**Request body (JSON)**

```json
{
	"refresh": "<jwt_refresh_token>"
}
```

**Responses**

- `200 OK`

	```json
	{
		"success": "Logged out"
	}
	```

- `400 Bad Request` – invalid or already-used refresh token.

	```json
	{
		"error": "Invalid token"
	}
	```

---

### 1.5 Forgot Password (Request Reset OTP)

- **URL**: `POST /api/forgot-password/`
- **Auth**: Public
- **Description**: Sends a reset OTP to the given email if a user exists.

**Request body (JSON)**

```json
{
	"email": "name@university.edu.az"
}
```

**Responses**

- `200 OK`

	```json
	{
		"message": "OTP sent"
	}
	```

- `404 Not Found`

	```json
	{
		"error": "User not found"
	}
	```

- `400 Bad Request` – email validation errors.

---

### 1.6 Reset Password

- **URL**: `POST /api/reset-password/`
- **Auth**: Public
- **Description**: Resets the password using email + OTP + new password.

**Request body (JSON)**

```json
{
	"email": "name@university.edu.az",
	"otp": "123456",
	"new_password": "NewStrongPassword123!"
}
```

**Responses**

- `200 OK`

	```json
	{
		"message": "Password reset success"
	}
	```

- `400 Bad Request` – invalid email/OTP combination or invalid payload.

	```json
	{
		"error": "Invalid request"
	}
	```

Notes:

- OTP validation rules are the same as in the registration verification flow.

---

## 2. Role Management

All role endpoints are provided via a DRF `ModelViewSet` registered under `roles`.

- **Base path**: `/api/roles/`
- **Auth**: Required – `IsAuthenticated` and custom `IsActiveUser`.
- **Model**: `Role`
	- Fields:
		- `id` (int, read-only)
		- `name` (string, unique)

### 2.1 List Roles

- **URL**: `GET /api/roles/`
- **Auth**: JWT required
- **Response (200)** – standard DRF list of roles.

```json
[
	{ "id": 1, "name": "Student" },
	{ "id": 2, "name": "Teacher" }
]
```

### 2.2 Create Role

- **URL**: `POST /api/roles/`
- **Auth**: JWT required (no extra staff-only restriction in code)

**Request body (JSON)**

```json
{
	"name": "Organizer"
}
```

**Response (201)** – created role object.

### 2.3 Retrieve / Update / Delete Role

- **Retrieve**: `GET /api/roles/{id}/`
- **Update**: `PUT /api/roles/{id}/`
- **Partial update**: `PATCH /api/roles/{id}/`
- **Delete**: `DELETE /api/roles/{id}/`

All require authentication and an active user.

---

## 3. Events

Events are exposed via a DRF `ModelViewSet` registered as `events`.

- **Base path**: `/api/events/`
- **Auth**: JWT required
	- Read operations: `IsAuthenticated` + `IsActiveUser`.
	- Write operations (create/update/partial_update/destroy): additionally require `IsAdminUser` (staff or superuser).

### 3.1 Event Data Model (API Representation)

Serializer: `EventSerializer`

Fields:

- `id` (int, read-only)
- `title` (string, required)
- `desc` (string, required)
- `type` (string, required)
	- Choices: `"online"`, `"offline"`, `"hybrid"`.
- `visibility` (string)
	- Choices: `"public"`, `"private"`.
- `building` (string, nullable) – e.g. "Əsas korpus"
- `floor` (integer, nullable)
- `room` (string, nullable) – e.g. "302" or "Akt zalı"
- `organizer_side` (string, nullable) – organizer name
- `created_by` (user id or object, **read-only**, set automatically)
- `allowed_roles` (array of embedded `Role` objects, **read-only**)
- `allowed_roles_ids` (array of integers, write-only)
	- When creating/updating events, you can assign allowed roles by their IDs.
- `images` (array of `EventImage` objects, read-only)
	- Each image: `{ "id", "event", "image", "uploaded_at" }`
- `agendas` (array of `EventAgenda` objects, read-only)
	- Each agenda item: `{ "time_slot", "action" }`
- `is_joined` (boolean, read-only)
	- `true` if the authenticated user has joined the event (`AllowedParticipant` with their email exists).
- `start_date` (datetime, required)
- `end_date` (datetime, nullable)
- `created_date` (datetime, read-only)
- `participant_count` (int, read-only)
	- Count of related `AllowedParticipant` entries.
- `max_participants` (int, nullable)
	- Maximum allowed participants. `null` means unlimited.

### 3.2 Permissions & Visibility Logic

- **Listing / retrieving**:
	- Admins (staff or superuser) see all events.
	- Regular users see only events where:
		- `allowed_roles` is empty (no role restriction), **or**
		- Their roles intersect with `allowed_roles` of the event.
- **Joining** an event is controlled via `AllowedParticipant` (see section 5).

### 3.3 List Events

- **URL**: `GET /api/events/`
- **Auth**: JWT required
- **Response (200)** – list of events visible to the user (see filtering above).

```json
[
	{
		"id": 1,
		"title": "Tech Talk",
		"desc": "...",
		"type": "offline",
		"visibility": "public",
		"building": "Main",
		"floor": 3,
		"room": "302",
		"organizer_side": "CS Department",
		"allowed_roles": [
			{ "id": 1, "name": "Student" }
		],
		"images": [],
		"agendas": [],
		"is_joined": false,
		"start_date": "2026-04-10T10:00:00Z",
		"end_date": "2026-04-10T12:00:00Z",
		"created_date": "2026-03-30T09:00:00Z",
		"participant_count": 0,
		"max_participants": 100
	}
]
```

### 3.4 Create Event (Admin Only)

- **URL**: `POST /api/events/`
- **Auth**: JWT + staff/superuser

**Request body (JSON)** – example

```json
{
	"title": "New Event",
	"desc": "Description of the event",
	"type": "online",
	"visibility": "public",
	"building": "Online",
	"floor": null,
	"room": null,
	"organizer_side": "IT Club",
	"allowed_roles_ids": [1, 2],
	"start_date": "2026-04-15T10:00:00Z",
	"end_date": "2026-04-15T12:00:00Z",
	"max_participants": 50
}
```

Notes:

- `created_by` is automatically set to the authenticated admin user.
- `created_date` and `participant_count` are read-only and ignored if sent.

**Response (201)** – full event representation.

### 3.5 Retrieve / Update / Delete Event

- **Retrieve**: `GET /api/events/{id}/` – visible to any authenticated active user if they have access.
- **Update**: `PUT /api/events/{id}/` – admin only.
- **Partial update**: `PATCH /api/events/{id}/` – admin only.
- **Delete**: `DELETE /api/events/{id}/` – admin only.

### 3.6 Event Group Statistics

- **URL**: `GET /api/events/{id}/group_statistics/`
- **Auth**: JWT required (user must have access to the event via the same visibility rules as list/retrieve).
- **Description**: Returns participant counts grouped by `group_name` from `AllowedParticipant`.

**Response (200)** – example

```json
[
	{ "group_name": "601.21", "count": 10 },
	{ "group_name": "602.21", "count": 5 }
]
```

---

## 4. Event Images

Images are handled via a DRF `ModelViewSet` registered as `event-images`.

- **Base path**: `/api/event-images/`
- **Auth**: JWT required (`IsAuthenticated` + `IsActiveUser`)
- **Model**: `EventImage`

Fields (serializer `EventImageSerializer`):

- `id` (int, read-only)
- `event` (int – event id, required)
- `image` (file, required)
- `uploaded_at` (datetime, read-only)

### 4.1 List Images

- **URL**: `GET /api/event-images/`
- **Auth**: JWT required

Returns all event images (no per-user filtering defined in code).

### 4.2 Create Image

- **URL**: `POST /api/event-images/`
- **Auth**: JWT required
- **Content-Type**: typically `multipart/form-data` (to upload image files).

Example form fields:

- `event`: event id (e.g. `1`)
- `image`: uploaded file (e.g. JPEG/PNG)

**Response (201)** – created image object.

### 4.3 Retrieve / Update / Delete Image

- `GET /api/event-images/{id}/`
- `PUT /api/event-images/{id}/`
- `PATCH /api/event-images/{id}/`
- `DELETE /api/event-images/{id}/`

All require an authenticated, active user.

---

## 5. Allowed Participants (Event Joining)

Joining events and managing participants uses the `AllowedParticipant` model via a DRF `ModelViewSet` registered as `allowed-participants`.

- **Base path**: `/api/allowed-participants/`
- **Auth**: JWT required (`IsAuthenticated` + `IsActiveUser`)

Serializer: `AllowedParticipantSerializer`

Fields:

- `id` (int, read-only)
- `event` (int – event id, required)
- `email` (string, read-only from API perspective – set in view logic)
- `group_name` (string, optional)

Model-level constraints and behavior:

- Unique per (`event`, `email`) – a user cannot join the same event twice.
- `added_at` (datetime, auto, not exposed by the serializer).

### 5.1 List Participants

- **URL**: `GET /api/allowed-participants/`
- **Auth**: JWT required

Returns all participants (no additional filtering by default in the viewset).

### 5.2 Join Event / Create Participant

- **URL**: `POST /api/allowed-participants/`
- **Auth**: JWT required
- **Description**: Registers an email as a participant in an event, with role and capacity checks.

Behavior differs for **staff** vs **non-staff** users:

1. **Shared validation**
	 - `event` is required; if missing:
		 - Response: `400 Bad Request` with `{ "event": "Event is required." }`.
	 - If `max_participants` is set on the event and `participant_count >= max_participants`:
		 - Response: `400 Bad Request` with `{ "detail": "Bu tədbir üçün maksimum iştirakçı sayı dolub." }`.
	 - If a participant with the same `event` and `email` already exists:
		 - Response: `400 Bad Request` with `{ "detail": "Artıq bu tədbirə qoşulmusan." }`.

2. **Staff users (`is_staff = true`)**
	 - Must explicitly provide `email` in the request body.
	 - If missing:
		 - Response: `400 Bad Request` with `{ "email": "Email daxil etmək tələb olunur." }`.

3. **Non-staff users**
	 - `email` is automatically taken from `request.user.email`.
	 - Additionally, if the event has any `allowed_roles` defined:
		 - The user must have at least one of those roles; otherwise:
			 - Response: `400 Bad Request` with `{ "detail": "Bu tədbir üçün uyğun rolunuz yoxdur." }`.

**Request body examples**

- **Non-staff (student) joining**

	```json
	{
		"event": 1,
		"group_name": "601.21"
	}
	```

- **Staff adding a participant**

	```json
	{
		"event": 1,
		"email": "student01@university.edu.az",
		"group_name": "601.21"
	}
	```

**Response (201)** – created participant object

```json
{
	"id": 5,
	"event": 1,
	"email": "student01@university.edu.az",
	"group_name": "601.21"
}
```

### 5.3 Retrieve / Update / Delete Participant

- `GET /api/allowed-participants/{id}/`
- `PUT /api/allowed-participants/{id}/`
- `PATCH /api/allowed-participants/{id}/`
- `DELETE /api/allowed-participants/{id}/`

All operations require an authenticated active user.

> Note: There is no additional ownership check coded; access control is only via `IsAuthenticated` + `IsActiveUser`.

---

## 6. Additional Notes

- **User model**
	- Custom user (`CustomUser`) extends Django’s `AbstractUser` and adds:
		- `phone`, `email` (unique), `roles` (many-to-many with `Role`),
		- `otp` and `otp_created_at` for verification/reset.
- **Event agendas**
	- `EventAgenda` is read-only via nested serialization and ordered by `time_slot`.
- **Tokens**
	- Tokens are generated via `rest_framework_simplejwt.RefreshToken.for_user`.
	- All non-auth endpoints that require a user (roles, events, images, participants) must be called with the `access` token.

