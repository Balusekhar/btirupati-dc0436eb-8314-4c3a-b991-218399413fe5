# API test points

Base URL: `http://localhost:3000/api` (or set `PORT` in `.env.local`).

Use `Authorization: Bearer <access_token>` for all routes except signup and login.

**Task permissions by role:**  
- **Owner:** create, edit, delete any task in their org (and direct child orgs).  
- **Admin:** create, edit, delete tasks in their org.  
- **Viewer:** read tasks only; no create/edit/delete.

---

## 1. Auth — signup

**URL:** `POST /api/auth/signup`

Organisation is optional. **Without** `organizationId`: user signs up as **Owner** with `organizationId: null` (they can then create root organisations). **With** `organizationId`: user joins that org; default role is **Viewer**.

**Send (sign up as Owner, no org — then create organisations):**

```json
{
  "email": "owner@example.com",
  "password": "password123"
}
```
Optional: `name`, `role` (default when no org: `owner`).

**Send (join existing org):**

```json
{
  "email": "member@example.com",
  "password": "password123",
  "organizationId": "<uuid-of-existing-org>",
  "role": "viewer"
```
Default role when joining is `viewer`. `role` can be `owner`, `admin`, `viewer`.

**Expect (201):**

```json
{
  "access_token": "<jwt-string>",
  "user": {
    "id": "<uuid>",
    "email": "owner@example.com",
    "role": "owner",
    "organizationId": null
  }
}
```
When joining an org, `organizationId` will be the provided UUID.

**Expect (400)** — validation (e.g. invalid email, password &lt; 8 chars, extra properties with `forbidNonWhitelisted`).

**Expect (409)** — email already registered.

---

## 2. Organisations (only Owner can create and delete)

**URL:** `POST /api/organisations`  
**Header:** `Authorization: Bearer <token>`  
**Permission:** Owner only (no specific permission constant; role check).

**Send (create root — first org for this user):**

```json
{
  "name": "TechCorp"
}
```
Do not send `parentId`. The user's `organizationId` is set to the new org.

**Send (create sub-organisation / Level 2):**

```json
{
  "name": "Engineering",
  "parentId": "<uuid-of-your-root-org>"
}
```
Caller must be Owner of the root org. `parentId` must be the Owner's root organisation id.

**Expect (201):** Created organisation (`id`, `name`, `parentId`, `createdAt`, `updatedAt`).

**Expect (403)** — Not Owner. **Expect (400)** — e.g. parentId when creating first org; or organisation has users when deleting.

---

**URL:** `GET /api/organisations`  
**Header:** `Authorization: Bearer <token>`  
**Permission:** Any authenticated user.

**Send:** No body.

**Expect (200):** List of organisations the user can see. Owner at root sees root + all direct children; Admin/Viewer see only their org; user with no org sees `[]`.

---

**URL:** `DELETE /api/organisations/:id`  
**Header:** `Authorization: Bearer <token>`  
**Permission:** Owner only (role check).

**Send:** Organisation UUID in path.

**Expect (200):** Organisation deleted. If deleting the user's root org, the user's `organizationId` is set to null. Cannot delete an org that has users.

**Expect (403)** — Not Owner or not your org/child. **Expect (404)** — Organisation not found. **Expect (400)** — Organisation has users.

---

## 3. Auth — login

**URL:** `POST /api/auth/login`

**Send:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expect (200):**

```json
{
  "access_token": "<jwt-string>"
}
```

**Expect (401):** Invalid email or password.

**Expect (400):** Validation error (e.g. missing/invalid email or password).

---

## 4. Tasks — list (GET)

**URL:** `GET /api/tasks`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `task:read` — Owner, Admin, Viewer.

**Send:** No body.

**Expect (200):** Array of tasks in user’s org (and direct child orgs). Each task has `id`, `title`, `description`, `status`, `category`, `organizationId`, `createdById`, `createdAt`, `updatedAt`, and relations if loaded.

**Expect (401):** Missing or invalid token.

**Expect (403):** User role has no `task:read`.

---

## 5. Tasks — get one (GET)

**URL:** `GET /api/tasks/:id`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `task:read` — Owner, Admin, Viewer.

**Send:** Task UUID in path.

**Expect (200):** Single task object (same shape as in list).

**Expect (401):** Missing or invalid token.

**Expect (403):** Task not in user’s org or a direct child org.

**Expect (404):** Task not found.

---

## 6. Tasks — create (POST)

**URL:** `POST /api/tasks`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `task:create` — Owner, Admin only. Viewer cannot create.

**Send:**

```json
{
  "title": "My task",
  "description": "Optional description",
  "status": "open",
  "category": "work",
  "organizationId": "498f247b-7785-48db-8a10-8d63284ee6c0"
}
```

Required: `title`, `status`, `category`, `organizationId`. Optional: `description`. `status`: one of open, in_progress, completed, archived. `category`: work or personal. Task is created in the user’s organization.

**Expect (201):** Created task object (with `id`, `title`, `description`, `status`, `category`, `organizationId`, `createdById`, `createdAt`, `updatedAt`).

**Expect (401):** Missing or invalid token.

**Expect (403):** User does not have `task:create` (e.g. Viewer), no organisation assigned, or `organizationId` is not in your org / direct child org.

**Expect (400):** Validation error (e.g. missing required fields, invalid status/category/organizationId).

---

## 7. Tasks — update (PUT)

**URL:** `PUT /api/tasks/:id`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `task:update` — Owner, Admin only. Viewer cannot update.

**Send (all optional):**

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "dueAt": "2025-12-31T23:59:59.000Z"
}
```

`status` must be one of: `open`, `in_progress`, `completed`, `archived`.

**Expect (200):** Updated task object.

**Expect (401):** Missing or invalid token.

**Expect (403):** User does not have `task:update`, or task is not in user’s org / direct child org.

**Expect (404):** Task not found.

**Expect (400):** Validation error.

---

## 8. Tasks — delete (DELETE)

**URL:** `DELETE /api/tasks/:id`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `task:delete` — Owner, Admin only. Viewer cannot delete.

**Send:** Task UUID in path only.

**Expect (200):** Empty or success response (task removed).

**Expect (401):** Missing or invalid token.

**Expect (403):** User does not have `task:delete`, or task not in allowed org scope.

**Expect (404):** Task not found.

---

## 9. Audit log — list (GET)

**URL:** `GET /api/audit-log`  
**Header:** `Authorization: Bearer <access_token>`  
**Permission:** `audit:read` — Owner, Admin only. Viewer cannot read audit log.

**Send:** No body.

**Expect (200):** Array of up to 100 latest audit log entries (user’s org and direct child orgs). Each entry has `id`, `userId`, `organizationId`, `action`, `resource`, `resourceId`, `details`, `timestamp`, and optional `user` relation.

**Expect (401):** Missing or invalid token.

**Expect (403):** User is not Owner or Admin (e.g. Viewer).

---

## Quick checklist

| #   | Method | URL                | Auth   | Permission                    | Send                                                   | Expect                   |
| --- | ------ | ------------------ | ------ | ----------------------------- | ------------------------------------------------------ | ------------------------ |
| 1   | POST   | `/api/auth/signup` | No     | —                             | email, password (+ optional name, organizationId, role) | 201 + access_token, user |
| 2   | POST   | `/api/auth/login`  | No     | —                             | email, password                                        | 200 + access_token       |
| 3   | GET    | `/api/organisations` | Bearer | Any auth                      | —                                                      | 200 + org[]              |
| 4   | POST   | `/api/organisations` | Bearer | Owner only                    | name, optional parentId                                | 201 + org                |
| 5   | DELETE | `/api/organisations/:id` | Bearer | Owner only                    | —                                                      | 200                      |
| 6   | GET    | `/api/tasks`       | Bearer | `task:read` (Owner, Admin, Viewer) | —                                                      | 200 + task[]             |
| 7   | GET    | `/api/tasks/:id`   | Bearer | `task:read` (Owner, Admin, Viewer) | —                                                      | 200 + task               |
| 8   | POST   | `/api/tasks`       | Bearer | `task:create` (Owner, Admin)  | title, status, category, organizationId (+ optional description) | 201 + task               |
| 9   | PUT    | `/api/tasks/:id`   | Bearer | `task:update` (Owner, Admin)  | optional title, description, status, dueAt            | 200 + task               |
| 10  | DELETE | `/api/tasks/:id`   | Bearer | `task:delete` (Owner, Admin) | —                                                      | 200                      |
| 11  | GET    | `/api/audit-log`   | Bearer | `audit:read` (Owner, Admin)  | —                                                      | 200 + audit[]            |

---

## Example flow (Owner → organisations → tasks)

1. **Signup as Owner (no org):** `POST /api/auth/signup` with `{"email":"owner@example.com","password":"password123"}` → 201, `user.organizationId` is `null`, `user.role` is `owner`. Save `access_token`.
2. **Create root org (Level 1):** `POST /api/organisations` with `Authorization: Bearer <token>` and `{"name":"TechCorp"}` → 201. User is now assigned to that org.
3. **Create sub-org (Level 2):** `POST /api/organisations` with same header and `{"name":"Engineering","parentId":"<TechCorp-uuid>"}` → 201.
4. **List organisations:** `GET /api/organisations` → root + children (e.g. TechCorp, Engineering).
5. **Signup member into org:** `POST /api/auth/signup` with `{"email":"dev@example.com","password":"password123","organizationId":"<Engineering-uuid>","role":"admin"}` → 201.
6. **Create task (as Owner):** `POST /api/tasks` with Owner token and `{"title":"First task","status":"open","category":"work","organizationId":"<TechCorp-uuid>"}` → 201 (task in TechCorp).
7. **Audit:** `GET /api/audit-log` with Owner token → entries for signup, org create, task create, etc.
8. **Delete org (optional):** `DELETE /api/organisations/<id>` (Owner only; org must have no users).
