# TaskFlow — API Documentation

> Base URL: `http://localhost:3000/api`
>
> All endpoints (except those marked **Public**) require a valid JWT Bearer token in the `Authorization` header.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Response Format](#error-response-format)
3. [Endpoints](#endpoints)
   - [Auth](#auth-endpoints)
   - [Tasks](#task-endpoints)
   - [Organisations](#organisation-endpoints)
   - [Audit Logs](#audit-log-endpoints)

---

## Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

The `access_token` is a signed JWT containing:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "owner | admin | viewer",
  "organizationId": "org-uuid | null",
  "iat": 1700000000,
  "exp": 1700003600
}
```

Obtain a token via the [Login](#post-apiauthlogin) or [Signup](#post-apiauthsignup) endpoints.

---

## Error Response Format

All errors follow a consistent JSON envelope:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "path": "/api/auth/login",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | `number` | HTTP status code |
| `error` | `string` | Short error name (e.g., "Not Found", "Forbidden") |
| `message` | `string \| string[]` | Human-readable error message(s). Validation errors return an array. |
| `path` | `string` | Request URL path |
| `timestamp` | `string` | ISO 8601 timestamp of the error |

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK — request succeeded |
| `201` | Created — resource created successfully |
| `400` | Bad Request — validation error or invalid input |
| `401` | Unauthorized — missing or invalid JWT token |
| `403` | Forbidden — insufficient role or permission |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g., email already registered) |
| `500` | Internal Server Error — unexpected server failure |

---

## Endpoints

---

### Auth Endpoints

#### `GET /api/auth/signup/organisations`

**Public** — No authentication required.

Returns a list of organisations available for user signup, optionally filtered by role. Admins and Viewers can only sign up to child organisations (Level 2).

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `string` | No | Filter by role: `owner`, `admin`, or `viewer`. If `admin` or `viewer`, only child orgs (with `parentId`) are returned. |

**Sample Request:**

```http
GET /api/auth/signup/organisations?role=admin
```

**Sample Response** (`200 OK`):

```json
[
  {
    "id": "b2f3c4d5-6789-4abc-def0-123456789012",
    "name": "Engineering Team",
    "parentId": "a1b2c3d4-5678-4abc-def0-123456789012"
  },
  {
    "id": "c3d4e5f6-7890-4abc-def0-123456789012",
    "name": "Marketing Team",
    "parentId": "a1b2c3d4-5678-4abc-def0-123456789012"
  }
]
```

**Sample Response for Owner** (`200 OK` — includes root orgs):

```http
GET /api/auth/signup/organisations?role=owner
```

```json
[
  {
    "id": "a1b2c3d4-5678-4abc-def0-123456789012",
    "name": "Acme Corp",
    "parentId": null
  },
  {
    "id": "b2f3c4d5-6789-4abc-def0-123456789012",
    "name": "Engineering Team",
    "parentId": "a1b2c3d4-5678-4abc-def0-123456789012"
  }
]
```

---

#### `POST /api/auth/signup`

**Public** — No authentication required.

Creates a new user account and returns an access token (the user is automatically logged in).

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Valid email format | User's email address |
| `password` | `string` | Yes | Min 8 characters | User's password |
| `name` | `string` | No | — | User's display name |
| `organizationId` | `string` | Yes | Valid UUID | ID of the organization to join |
| `role` | `string` | No | One of: `owner`, `admin`, `viewer` | Defaults to `viewer` |

**Sample Request:**

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "securepassword123",
  "name": "Alice",
  "organizationId": "b2f3c4d5-6789-4abc-def0-123456789012",
  "role": "admin"
}
```

**Sample Response** (`201 Created`):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "d4e5f6a7-8901-4abc-def0-123456789012",
    "email": "alice@example.com",
    "role": "admin",
    "organizationId": "b2f3c4d5-6789-4abc-def0-123456789012"
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `400` | Organization not found | `"Organization not found"` |
| `400` | Admin signing up to root org | `"Admin must belong to a child organization..."` |
| `400` | Validation errors | Array of validation messages (e.g., `["email must be an email", "password must be longer than or equal to 8 characters"]`) |
| `409` | Email already registered | `"Email already registered"` |

---

#### `POST /api/auth/login`

**Public** — No authentication required.

Authenticates a user and returns an access token.

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `email` | `string` | Yes | Valid email format | User's email address |
| `password` | `string` | Yes | Min 8 characters | User's password |

**Sample Request:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Sample Response** (`200 OK`):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `400` | Validation errors | Array of validation messages |
| `401` | Invalid credentials | `"Invalid email or password"` |

---

### Task Endpoints

> All task endpoints require authentication and the `task:read`, `task:create`, `task:update`, or `task:delete` permission based on the action.

#### `GET /api/tasks`

**Permission:** `task:read` (Owner, Admin, Viewer)

Returns all tasks accessible to the authenticated user (scoped by organization hierarchy).

**Sample Request:**

```http
GET /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK`):

```json
[
  {
    "id": "e5f6a7b8-9012-4abc-def0-123456789012",
    "title": "Implement user dashboard",
    "description": "Build the main dashboard page with task overview",
    "status": "in_progress",
    "category": "work",
    "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
    "createdById": "d4e5f6a7-8901-4abc-def0-123456789012",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updateAt": "2026-02-05T14:30:00.000Z",
    "organization": {
      "id": "a1b2c3d4-5678-4abc-def0-123456789012",
      "name": "Acme Corp",
      "parentId": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updateAt": "2026-01-01T00:00:00.000Z"
    },
    "createdBy": {
      "id": "d4e5f6a7-8901-4abc-def0-123456789012",
      "email": "alice@example.com",
      "role": "owner",
      "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updateAt": "2026-01-01T00:00:00.000Z"
    }
  },
  {
    "id": "f6a7b8c9-0123-4abc-def0-123456789012",
    "title": "Write unit tests",
    "description": null,
    "status": "open",
    "category": "work",
    "organizationId": "b2f3c4d5-6789-4abc-def0-123456789012",
    "createdById": "d4e5f6a7-8901-4abc-def0-123456789012",
    "createdAt": "2026-02-08T09:00:00.000Z",
    "updateAt": "2026-02-08T09:00:00.000Z",
    "organization": {
      "id": "b2f3c4d5-6789-4abc-def0-123456789012",
      "name": "Engineering Team",
      "parentId": "a1b2c3d4-5678-4abc-def0-123456789012",
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updateAt": "2026-01-15T00:00:00.000Z"
    },
    "createdBy": {
      "id": "d4e5f6a7-8901-4abc-def0-123456789012",
      "email": "alice@example.com",
      "role": "owner",
      "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updateAt": "2026-01-01T00:00:00.000Z"
    }
  }
]
```

**Note:** Tasks are returned in descending order by `createdAt`. Includes `organization` and `createdBy` relations.

---

#### `GET /api/tasks/:id`

**Permission:** `task:read` (Owner, Admin, Viewer)

Returns a single task by ID. The user must have organizational access to the task.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Task ID |

**Sample Request:**

```http
GET /api/tasks/e5f6a7b8-9012-4abc-def0-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK`):

```json
{
  "id": "e5f6a7b8-9012-4abc-def0-123456789012",
  "title": "Implement user dashboard",
  "description": "Build the main dashboard page with task overview",
  "status": "in_progress",
  "category": "work",
  "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
  "createdById": "d4e5f6a7-8901-4abc-def0-123456789012",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updateAt": "2026-02-05T14:30:00.000Z",
  "organization": {
    "id": "a1b2c3d4-5678-4abc-def0-123456789012",
    "name": "Acme Corp",
    "parentId": null
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `403` | User has no organization | `"No organization assigned"` |
| `403` | User cannot access task's org | `"Forbidden"` |
| `404` | Task not found | `"Task not found"` |

---

#### `POST /api/tasks`

**Permission:** `task:create` (Owner, Admin)

Creates a new task in the specified organization.

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `title` | `string` | Yes | Non-empty string | Task title |
| `description` | `string` | No | — | Task description |
| `status` | `string` | Yes | One of: `open`, `in_progress`, `completed`, `archived` | Initial task status |
| `category` | `string` | Yes | One of: `work`, `personal` | Task category |
| `organizationId` | `string` | Yes | Valid UUID | Organization to create the task in |

**Sample Request:**

```http
POST /api/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "Design landing page",
  "description": "Create mockups for the new landing page",
  "status": "open",
  "category": "work",
  "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012"
}
```

**Sample Response** (`201 Created`):

```json
{
  "id": "a7b8c9d0-1234-4abc-def0-123456789012",
  "title": "Design landing page",
  "description": "Create mockups for the new landing page",
  "status": "open",
  "category": "work",
  "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
  "createdById": "d4e5f6a7-8901-4abc-def0-123456789012",
  "createdAt": "2026-02-10T12:00:00.000Z",
  "updateAt": "2026-02-10T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `400` | Validation errors | Array of validation messages |
| `403` | User has no organization | `"No organization assigned. Create or join an organization first."` |
| `403` | Org not in accessible list | `"You cannot create tasks in this organization."` |

---

#### `PUT /api/tasks/:id`

**Permission:** `task:update` (Owner, Admin)

Updates an existing task. Only provided fields are updated; omitted fields remain unchanged.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Task ID |

**Request Body** (all fields optional):

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `title` | `string` | — | Updated title |
| `description` | `string` | — | Updated description |
| `status` | `string` | One of: `open`, `in_progress`, `completed`, `archived` | Updated status |
| `dueAt` | `string` | ISO 8601 date string | Due date |

**Sample Request:**

```http
PUT /api/tasks/e5f6a7b8-9012-4abc-def0-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "status": "completed",
  "title": "Implement user dashboard (done)"
}
```

**Sample Response** (`200 OK`):

```json
{
  "id": "e5f6a7b8-9012-4abc-def0-123456789012",
  "title": "Implement user dashboard (done)",
  "description": "Build the main dashboard page with task overview",
  "status": "completed",
  "category": "work",
  "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
  "createdById": "d4e5f6a7-8901-4abc-def0-123456789012",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updateAt": "2026-02-10T12:05:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `403` | User cannot access task's org | `"Forbidden"` |
| `404` | Task not found | `"Task not found"` |

---

#### `DELETE /api/tasks/:id`

**Permission:** `task:delete` (Owner, Admin)

Permanently deletes a task.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Task ID |

**Sample Request:**

```http
DELETE /api/tasks/e5f6a7b8-9012-4abc-def0-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK`):

No response body.

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `403` | User cannot access task's org | `"Forbidden"` |
| `404` | Task not found | `"Task not found"` |

---

### Organisation Endpoints

> All organisation endpoints require authentication. Create and delete operations require the `Owner` role.

#### `GET /api/organisations`

**Required Role:** Any authenticated user

Returns organizations accessible to the authenticated user.

- **Owner of a root org**: Returns the root org + all direct children.
- **Admin/Viewer of a child org**: Returns only their own organization.
- **User with no org**: Returns an empty array.

**Sample Request:**

```http
GET /api/organisations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK` — Owner of root org):

```json
[
  {
    "id": "a1b2c3d4-5678-4abc-def0-123456789012",
    "name": "Acme Corp",
    "parentId": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updateAt": "2026-01-01T00:00:00.000Z",
    "children": [
      {
        "id": "b2f3c4d5-6789-4abc-def0-123456789012",
        "name": "Engineering Team",
        "parentId": "a1b2c3d4-5678-4abc-def0-123456789012",
        "createdAt": "2026-01-15T00:00:00.000Z",
        "updateAt": "2026-01-15T00:00:00.000Z"
      }
    ]
  },
  {
    "id": "b2f3c4d5-6789-4abc-def0-123456789012",
    "name": "Engineering Team",
    "parentId": "a1b2c3d4-5678-4abc-def0-123456789012",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updateAt": "2026-01-15T00:00:00.000Z"
  }
]
```

**Sample Response** (`200 OK` — Admin of child org):

```json
[
  {
    "id": "b2f3c4d5-6789-4abc-def0-123456789012",
    "name": "Engineering Team",
    "parentId": "a1b2c3d4-5678-4abc-def0-123456789012",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updateAt": "2026-01-15T00:00:00.000Z",
    "children": []
  }
]
```

---

#### `POST /api/organisations`

**Required Role:** `Owner`

Creates a new organization. Behavior depends on the user's current state:

- **Owner with no org**: Creates a root organization (Level 1) and assigns the user to it.
- **Owner with a root org**: Creates a child organization (Level 2) under their root org.

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | `string` | Yes | Max 255 characters | Organization display name |
| `parentId` | `string` | No | Valid UUID | Parent org ID (must be user's root org when creating child) |

**Sample Request — Create Root Org** (Owner with no org):

```http
POST /api/organisations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Acme Corp"
}
```

**Sample Response** (`201 Created`):

```json
{
  "id": "a1b2c3d4-5678-4abc-def0-123456789012",
  "name": "Acme Corp",
  "parentId": null,
  "createdAt": "2026-02-10T12:00:00.000Z",
  "updateAt": "2026-02-10T12:00:00.000Z"
}
```

**Sample Request — Create Child Org** (Owner with root org):

```http
POST /api/organisations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Engineering Team",
  "parentId": "a1b2c3d4-5678-4abc-def0-123456789012"
}
```

**Sample Response** (`201 Created`):

```json
{
  "id": "b2f3c4d5-6789-4abc-def0-123456789012",
  "name": "Engineering Team",
  "parentId": "a1b2c3d4-5678-4abc-def0-123456789012",
  "createdAt": "2026-02-10T12:00:00.000Z",
  "updateAt": "2026-02-10T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `400` | `parentId` set for first org | `"Cannot set parentId when creating your first (root) organisation"` |
| `400` | `parentId` doesn't match user's root org | `"parentId must be your root organisation id"` |
| `403` | Non-owner user | `"Only Owner can create organisations"` |
| `403` | Owner belongs to child org | `"Only Owner of a root (Level 1) organisation can create sub-organisations"` |
| `404` | User's org not found | `"Your organisation not found"` |

---

#### `DELETE /api/organisations/:id`

**Required Role:** `Owner`

Deletes an organization. The organization must have no users assigned to it.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Organization ID |

**Sample Request:**

```http
DELETE /api/organisations/b2f3c4d5-6789-4abc-def0-123456789012
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK`):

No response body.

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `400` | Org has users | `"Cannot delete organisation that has users. Reassign or remove users first."` |
| `403` | Non-owner user | `"Only Owner can delete organisations"` |
| `403` | Not user's root or child org | `"You can only delete your root organisation or its direct children"` |
| `404` | Org not found | `"Organisation not found"` |

---

### Audit Log Endpoints

> Audit logs are read-only and restricted to `Owner` and `Admin` roles.

#### `GET /api/audit-log`

**Required Role:** `Owner` or `Admin`

Returns the most recent 100 audit log entries for the user's accessible organizations.

**Sample Request:**

```http
GET /api/audit-log
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Sample Response** (`200 OK`):

```json
[
  {
    "id": "f1a2b3c4-5678-4abc-def0-123456789012",
    "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
    "userId": "d4e5f6a7-8901-4abc-def0-123456789012",
    "action": "task:create",
    "resource": "task",
    "resourceId": "e5f6a7b8-9012-4abc-def0-123456789012",
    "details": {
      "title": "Implement user dashboard"
    },
    "timestamp": "2026-02-10T12:00:00.000Z",
    "user": {
      "id": "d4e5f6a7-8901-4abc-def0-123456789012",
      "email": "alice@example.com",
      "role": "owner",
      "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updateAt": "2026-01-01T00:00:00.000Z"
    }
  },
  {
    "id": "g2b3c4d5-6789-4abc-def0-123456789012",
    "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
    "userId": "d4e5f6a7-8901-4abc-def0-123456789012",
    "action": "user:login",
    "resource": "user",
    "resourceId": "d4e5f6a7-8901-4abc-def0-123456789012",
    "details": {
      "email": "alice@example.com"
    },
    "timestamp": "2026-02-10T11:55:00.000Z",
    "user": {
      "id": "d4e5f6a7-8901-4abc-def0-123456789012",
      "email": "alice@example.com",
      "role": "owner",
      "organizationId": "a1b2c3d4-5678-4abc-def0-123456789012",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updateAt": "2026-01-01T00:00:00.000Z"
    }
  }
]
```

**Audit Actions:**

| Action | Resource | When |
|--------|----------|------|
| `user:signup` | `user` | A new user signs up |
| `user:login` | `user` | A user logs in |
| `task:create` | `task` | A task is created |
| `task:update` | `task` | A task is updated |
| `task:delete` | `task` | A task is deleted |
| `organization:create` | `organization` | An organization is created |
| `organization:delete` | `organization` | An organization is deleted |

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| `403` | Viewer role | `"Requires one of roles: owner, admin"` |

---

## Endpoint Summary Table

| Method | Endpoint | Auth | Role/Permission | Description |
|--------|----------|------|----------------|-------------|
| `GET` | `/api/auth/signup/organisations` | Public | — | List orgs available for signup |
| `POST` | `/api/auth/signup` | Public | — | Create account and get token |
| `POST` | `/api/auth/login` | Public | — | Authenticate and get token |
| `GET` | `/api/tasks` | JWT | `task:read` | List all accessible tasks |
| `GET` | `/api/tasks/:id` | JWT | `task:read` | Get a single task |
| `POST` | `/api/tasks` | JWT | `task:create` | Create a new task |
| `PUT` | `/api/tasks/:id` | JWT | `task:update` | Update an existing task |
| `DELETE` | `/api/tasks/:id` | JWT | `task:delete` | Delete a task |
| `GET` | `/api/organisations` | JWT | Any | List accessible organisations |
| `POST` | `/api/organisations` | JWT | `Owner` role | Create an organisation |
| `DELETE` | `/api/organisations/:id` | JWT | `Owner` role | Delete an organisation |
| `GET` | `/api/audit-log` | JWT | `Owner` or `Admin` | List audit log entries |
