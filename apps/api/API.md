# API

## Authentication

All routes except **POST /api/auth/signup** and **POST /api/auth/login** require a valid JWT.

**Clients must send the token in the request header:**

```http
Authorization: Bearer <token>
```

- **POST /api/auth/signup** — Body: `email`, `password`, optional `name`, `organizationId`, `role` (default: Viewer). Returns `201` with `{ access_token, user }`; client is logged in.
- **POST /api/auth/login** — Body: `email`, `password`. Returns `200` with `{ access_token }`.

Token is obtained from the `access_token` field of the signup or login response.
