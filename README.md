# TaskFlow — Project Documentation

> A full-stack task management platform built with an Nx monorepo, Angular 21 frontend, NestJS 11 backend, and PostgreSQL (Neon).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Model Explanation](#data-model-explanation)
3. [Access Control Implementation](#access-control-implementation)
4. [Future Considerations](#future-considerations)
5. [Setup Instructions](#setup-instructions)
6. [Test Points](#test-points)

---

## Architecture Overview

### Nx Monorepo Layout and Rationale

The project is organized as an **Nx monorepo** (v22.4) using npm workspaces. This structure enables:

- **Shared code** between frontend and backend without publishing packages.
- **Consistent tooling** — ESLint, Prettier, Vitest, and Playwright configured once.
- **Dependency graph** — Nx tracks project relationships automatically.

```
├── apps/
│   ├── api/                    # NestJS 11 backend (REST API)
│   ├── api-e2e/                # API end-to-end tests (Jest + Axios)
│   ├── dashboard/              # Angular 21 frontend (SPA)
│   └── dashboard-e2e/          # Frontend E2E tests (Playwright)
├── data/                       # Shared library: DTOs, enums, and models
├── libs/
│   └── auth/                   # Shared library: RBAC guards, decorators, and helpers
├── packages/                   # Reserved for future publishable packages
├── nx.json                     # Nx workspace configuration
├── tsconfig.base.json          # Root TypeScript config (project references)
├── package.json                # Root dependencies and npm workspaces
└── .env.local                  # Environment variables (JWT secret, DB URL)
```

#### Project Dependency Graph

```
dashboard ──────► @org/data    ◄────── api
    │                                    │
    │                                    ▼
    │                              @org/auth
    │                                    │
    └──────────────────────────────►─────┘
                 (shared enums/types)
```

### Applications

| Project | Technology | Purpose |
|---------|-----------|---------|
| `api` | NestJS 11, TypeORM, PostgreSQL | REST API server with JWT auth, RBAC, audit logging |
| `dashboard` | Angular 21, Tailwind CSS, Primer CSS | Single-page application for task management |
| `api-e2e` | Jest, Axios | End-to-end API integration tests |
| `dashboard-e2e` | Playwright | End-to-end browser tests |

### Shared Libraries and Modules

#### `data` — Shared DTOs, Enums, and Models

Located at `/data/src/`, this library is the **single source of truth** for types shared between the frontend and backend.

| File | Contents |
|------|----------|
| `enums.ts` | `Role` (Owner, Admin, Viewer), `Permission` (task:create, task:read, task:update, task:delete, audit:read), `TaskStatus` (Open, InProgress, Completed, Archived), `TaskCategory` (Work, Personal) |
| `models.ts` | TypeScript interfaces: `User`, `Organization`, `Task`, `AuditLog`, `AuditAction` |
| `dtos/create-task.dto.ts` | `CreateTaskDto` — validated DTO for task creation |
| `dtos/update-task.dto.ts` | `UpdateTaskDto` — partial update DTO for tasks |
| `dtos/login.dto.ts` | `LoginDto` — email + password for authentication |
| `dtos/signup.dto.ts` | `SignupDto` — base signup fields (extended by API) |

#### `libs/auth` — RBAC Guards, Decorators, and Helpers

Located at `/libs/auth/src/lib/`, this library contains all role-based access control logic consumed by the backend.

| File | Purpose |
|------|---------|
| `jwt-auth.guard.ts` | Global JWT guard — validates Bearer tokens, skips `@Public()` routes |
| `roles.guard.ts` | Checks `@Roles(...)` decorator — ensures user has one of the required roles |
| `permissions.guard.ts` | Checks `@RequirePermission(...)` decorator — ensures role grants the specified permission |
| `role-permissions.ts` | Maps each `Role` to its allowed `Permission[]` |
| `rbac.helpers.ts` | Utility functions: `canAccessTaskOrg()`, `getAccessibleOrgIds()`, `canAccessOrganization()` |
| `public.decorator.ts` | `@Public()` — marks routes that skip JWT authentication |
| `roles.decorator.ts` | `@Roles(...)` — sets required roles metadata on routes |
| `require-permission.decorator.ts` | `@RequirePermission(...)` — sets required permission metadata |
| `request-user.ts` | `RequestUser` and `RequestWithUser` interfaces |

---

## Data Model Explanation

### Schema Description

The application uses **four core entities** stored in PostgreSQL via TypeORM with `synchronize: true` in development.

#### Users (`users` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt-hashed password |
| `role` | VARCHAR(50) | NOT NULL | One of: `owner`, `admin`, `viewer` |
| `organization_id` | UUID | FK → organizations.id, NULLABLE | Organization membership |
| `created_at` | TIMESTAMPTZ | Auto-generated | Account creation time |
| `updated_at` | TIMESTAMPTZ | Auto-updated | Last modification time |

#### Organizations (`organizations` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `parentId` | UUID | FK → organizations.id, NULLABLE | `NULL` = root org (Level 1); set = child org (Level 2) |
| `created_at` | TIMESTAMPTZ | Auto-generated | Creation time |
| `update_at` | TIMESTAMPTZ | Auto-updated | Last modification time |

**Hierarchy**: Exactly two levels — root organizations (`parentId = NULL`) and child organizations (`parentId` set to a root org's ID). No deeper nesting is allowed (enforced in service logic).

#### Tasks (`tasks` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `title` | VARCHAR(500) | NOT NULL | Task title |
| `description` | TEXT | NULLABLE | Detailed description |
| `status` | VARCHAR(50) | NOT NULL, default `'open'` | One of: `open`, `in_progress`, `completed`, `archived` |
| `category` | VARCHAR(50) | NOT NULL, default `'work'` | One of: `work`, `personal` |
| `organization_id` | UUID | FK → organizations.id, NOT NULL | Owning organization |
| `created_by_id` | UUID | FK → users.id, NOT NULL | User who created the task |
| `created_at` | TIMESTAMPTZ | Auto-generated | Creation time |
| `update_at` | TIMESTAMPTZ | Auto-updated | Last modification time |

#### Audit Logs (`audit_logs` table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `organization_id` | UUID | NULLABLE | Associated organization |
| `user_id` | UUID | FK → users.id, NULLABLE | Actor who triggered the action |
| `action` | VARCHAR(100) | NOT NULL | Action name (e.g., `task:create`, `user:login`) |
| `resource` | VARCHAR(100) | NOT NULL | Resource type (e.g., `task`, `user`, `organization`) |
| `resource_id` | VARCHAR(255) | NOT NULL | ID of the affected resource |
| `details` | JSONB | NULLABLE | Additional context (e.g., `{ title: "..." }`) |
| `timestamp` | TIMESTAMPTZ | Default `CURRENT_TIMESTAMP` | When the action occurred |

### Entity Relationship Diagram (ERD)

```
┌──────────────────────┐         ┌──────────────────────────┐
│    organizations     │         │          users           │
├──────────────────────┤         ├──────────────────────────┤
│ id          UUID  PK │◄──┐     │ id              UUID  PK │
│ name     VARCHAR(255)│   │     │ email        VARCHAR(255)│
│ parentId    UUID  FK │───┘     │ password_hash VARCHAR    │
│ created_at TIMESTAMP │    ┌───►│ role          VARCHAR(50)│
│ update_at  TIMESTAMP │    │    │ organization_id UUID  FK │──┐
└─────┬────────────────┘    │    │ created_at    TIMESTAMP  │  │
      │                     │    │ updated_at    TIMESTAMP  │  │
      │  1:N                │    └──────────┬───────────────┘  │
      │                     │               │                  │
      ▼                     │               │ 1:N              │
┌──────────────────────┐    │               ▼                  │
│        tasks         │    │    ┌──────────────────────────┐  │
├──────────────────────┤    │    │       audit_logs         │  │
│ id          UUID  PK │    │    ├──────────────────────────┤  │
│ title    VARCHAR(500)│    │    │ id              UUID  PK │  │
│ description    TEXT   │    │    │ organization_id UUID     │◄─┘
│ status   VARCHAR(50) │    │    │ user_id         UUID  FK │──┐
│ category VARCHAR(50) │    │    │ action       VARCHAR(100)│  │
│ organization_id UUID │────┘    │ resource     VARCHAR(100)│  │
│ created_by_id  UUID  │─────────│ resource_id  VARCHAR(255)│  │
│ created_at TIMESTAMP │         │ details         JSONB    │  │
│ update_at  TIMESTAMP │         │ timestamp    TIMESTAMPTZ │  │
└──────────────────────┘         └──────────────────────────┘  │
                                          ▲                    │
                                          └────────────────────┘
```

**Relationships:**

- `Organization` → `Organization` (self-referential, parent/children — 2-level max)
- `Organization` → `User[]` (one-to-many)
- `Organization` → `Task[]` (one-to-many)
- `User` → `Task[]` (one-to-many, via `createdById`)
- `User` → `AuditLog[]` (one-to-many)

---

## Access Control Implementation

### Role, Permission, and Organization Hierarchy

The system implements a **two-dimensional access control** model combining **RBAC (Role-Based Access Control)** with **organizational scoping**.

#### Roles

| Role | Description |
|------|-------------|
| **Owner** | Full access. Can create/manage organizations and all tasks within their org tree. |
| **Admin** | Task CRUD + audit read. Must belong to a child (Level 2) organization. |
| **Viewer** | Read-only access to tasks in their organization. |

#### Permission Matrix

| Permission | Owner | Admin | Viewer |
|-----------|-------|-------|--------|
| `task:create` | Yes | Yes | No |
| `task:read` | Yes | Yes | Yes |
| `task:update` | Yes | Yes | No |
| `task:delete` | Yes | Yes | No |
| `audit:read` | Yes | Yes | No |

#### Organization Hierarchy (2-Level)

```
Root Organization (Level 1)        ← Owner belongs here
├── Child Organization A (Level 2) ← Admin / Viewer belong here
├── Child Organization B (Level 2) ← Admin / Viewer belong here
└── Child Organization C (Level 2)
```

**Scoping Rules:**
- An **Owner** at a root org can see/manage tasks in the root org **and all its direct children**.
- An **Admin/Viewer** at a child org can only see tasks within **their own organization**.
- The `getAccessibleOrgIds()` helper returns `[userOrgId, ...childOrgIds]`.
- The `canAccessTaskOrg()` helper checks if a user's org matches the task's org, or if the user's org is the parent of the task's org.

#### Guard Execution Order

```
Request
  │
  ▼
JwtAuthGuard (global)          → Validates JWT Bearer token
  │                               Skips if @Public()
  ▼
RolesGuard (per-controller)    → Checks @Roles(...) metadata
  │                               e.g., @Roles(Role.Owner)
  ▼
PermissionsGuard (per-route)   → Checks @RequirePermission(...) metadata
  │                               e.g., @RequirePermission(Permission.TaskCreate)
  ▼
Service layer                  → Organizational scoping
                                  canAccessTaskOrg(), getAccessibleOrgIds()
```

### How JWT Authentication Integrates with Access Control

1. **Login/Signup** — The `AuthService` validates credentials, then signs a JWT containing:
   ```json
   {
     "sub": "user-uuid",
     "email": "user@example.com",
     "role": "owner",
     "organizationId": "org-uuid"
   }
   ```
   The JWT is signed with the `JWT_SECRET` and expires per `JWT_EXPIRES_IN` (default: `1h`).

2. **Token Transport** — The frontend stores the JWT in `localStorage` via `TokenStorageService` and attaches it as `Authorization: Bearer <token>` on every API request through an Axios interceptor in `ApiClientService`.

3. **Token Validation** — The `JwtStrategy` (Passport.js) extracts the token from the `Authorization` header, verifies the signature, checks expiration, then looks up the user in the database to ensure they still exist.

4. **User Attachment** — The validated user object `{ id, email, role, organizationId }` is attached to `request.user` for downstream guards and services.

5. **Guard Chain** — `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard` → Service-level org scoping.

6. **Frontend Auth Flow**:
   - `authGuard` (Angular route guard) checks `TokenStorageService.getAccessToken()` before allowing navigation to `/tasks`.
   - If no token exists, the user is redirected to `/login` with a `returnUrl` query param.
   - On successful login/signup, the token is stored and the user navigates to `/tasks`.
   - `TokenStorageService` exposes reactive signals (`isAuthenticated`, `jwtPayload`) for UI binding.

---

## Future Considerations

### 1. Advanced Role Delegation

**Current state**: Roles are fixed at signup and stored in the `users` table. Only three roles exist (Owner, Admin, Viewer).

**Future enhancements**:
- **Custom roles** — Allow Owners to define custom roles with fine-grained permission sets via a `roles` table with a many-to-many `role_permissions` join table.
- **Role delegation** — Enable Owners to promote/demote users (e.g., Admin → Owner for a sub-org), with audit logging for all role changes.
- **Invitation system** — Owners/Admins invite users to their organization with a pre-assigned role, rather than users self-selecting during signup.
- **Scoped admin delegation** — Allow an Owner to grant a user "Admin of sub-org X" without giving them full Admin access.

### 2. Implementing Light/Dark Mode

**Approach**: Leverage Tailwind CSS's built-in dark mode support with `class` strategy.

**Implementation steps**:
1. Update `tailwind.config.js` to add `darkMode: 'class'`.
2. Create a `ThemeService` (Angular injectable) that:
   - Reads the user's preference from `localStorage` (key: `theme`).
   - Falls back to `prefers-color-scheme` media query.
   - Toggles the `dark` class on the `<html>` element.
   - Exposes a `theme` signal for reactive UI binding.
3. Add a theme toggle button in `AppHeader`.
4. Update CSS:
   - Replace hard-coded colors with `dark:` variants (e.g., `bg-white dark:bg-gray-900`).
   - Update `styles.css` form control styles with dark variants.
   - Ensure Primer CSS components respect the dark class or add overrides.
5. Persist the preference in `localStorage` so it survives page reloads.

### 3. Add Drag and Drop

**Approach**: Use Angular CDK's `DragDropModule` for reordering tasks and changing status via Kanban columns.

**Implementation steps**:
1. Install `@angular/cdk` (already in dependencies).
2. Create a `KanbanBoardView` component with columns for each `TaskStatus`.
3. Use `cdkDropList` and `cdkDrag` directives for drag-and-drop between columns.
4. On drop, call `TasksStore.updateTask()` with the new status.
5. Add a `position` or `sortOrder` field to the `Task` entity to support manual reordering within a column.
6. Add a view toggle (List / Kanban) in `TasksPage`.
7. Consider optimistic UI updates — update the local state immediately, then sync with the server.

### 4. Implement Refresh Token Strategy

**Current state**: Only a single short-lived access token is issued. When it expires, the user must log in again.

**Implementation steps**:
1. **Backend changes**:
   - Add a `refresh_tokens` table: `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`.
   - On login/signup, issue both an `access_token` (short-lived, e.g., 15m) and a `refresh_token` (long-lived, e.g., 7d).
   - Add a `POST /api/auth/refresh` endpoint that:
     - Validates the refresh token (not expired, not revoked).
     - Issues a new access token and optionally rotates the refresh token.
   - Add a `POST /api/auth/logout` endpoint that revokes the refresh token.
2. **Frontend changes**:
   - Store the refresh token in an `httpOnly` cookie (or secure `localStorage` with XSS mitigations).
   - Add an Axios response interceptor in `ApiClientService` that:
     - Detects 401 responses.
     - Attempts to refresh the token via `/auth/refresh`.
     - Retries the original request with the new token.
     - If refresh fails, redirect to `/login`.
   - Queue concurrent requests during token refresh to avoid race conditions.

### 5. Add Charts and Analytics

**Approach**: Use a charting library (e.g., `chart.js` with `ng2-charts` or `ngx-echarts`) to visualize task data.

**Potential charts**:
- **Tasks by status** — Pie/doughnut chart showing the distribution of Open, In Progress, Completed, Archived tasks.
- **Tasks created over time** — Line chart showing task creation rate.
- **Task completion trend** — Area chart showing completed vs. created over time.
- **Category breakdown** — Bar chart of Work vs. Personal tasks.
- **Audit activity timeline** — Timeline view of recent actions.

**Implementation steps**:
1. Add `chart.js` and `ng2-charts` (or similar) as dependencies.
2. Create a `DashboardAnalytics` component with computed signals that aggregate `tasks()` data.
3. Add the analytics component to the tasks page or as a new `/analytics` route.
4. Backend: Consider adding aggregate API endpoints (e.g., `GET /api/tasks/stats`) for server-side computation if the task count is large.

### 6. Keyboard Shortcuts

**Approach**: Add global and contextual keyboard shortcuts for power users.

**Suggested shortcuts**:

| Shortcut | Action |
|----------|--------|
| `N` | Open "New task" dialog |
| `R` | Refresh task list |
| `/` | Focus search/filter |
| `Escape` | Close any open dialog |
| `J` / `K` | Navigate down/up in task list |
| `E` | Edit selected task |
| `Delete` / `Backspace` | Delete selected task (with confirmation) |
| `1`–`4` | Filter by status (Open, In Progress, Completed, Archived) |
| `0` | Reset all filters |

**Implementation steps**:
1. Create a `KeyboardShortcutsService` that listens to `document` keydown events.
2. Use `@HostListener` or a global directive to capture shortcuts.
3. Ensure shortcuts are disabled when an input/textarea is focused.
4. Add a `?` shortcut to display a help overlay showing all available shortcuts.
5. Make shortcuts configurable in user settings (future).

---

## Setup Instructions

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** database (or a Neon serverless PostgreSQL instance)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the **project root** with the following variables:

```env
# JWT Configuration
JWT_SECRET=<your-secret-key>          # A strong random string (UUID recommended)
JWT_EXPIRES_IN=1h                     # Access token expiration (e.g., 1h, 15m, 7d)

# Database Configuration
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require

# API Base URL (used by frontend in production builds)
API_BASE_URL=http://localhost:3000
```

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWTs. Must be a strong random value. | `7f0e5d9b-4a63-4c07-84ec-7dfdcc83e823` |
| `JWT_EXPIRES_IN` | Token expiration duration. | `1h`, `15m`, `7d` |
| `DATABASE_URL` | Full PostgreSQL connection string with SSL. | `postgresql://user:pass@host/db?sslmode=require` |
| `API_BASE_URL` | Base URL for the API server. | `http://localhost:3000` |

> **Note**: The backend (`AppModule`) looks for `.env.local` at both the workspace root and `apps/api/../../` (which resolves to the same root). Both paths are configured for flexibility.

### 4. Run the Backend (API)

```bash
npx nx serve api
```

This starts the NestJS server at `http://localhost:3000/api`. TypeORM will auto-synchronize the database schema in development mode.

### 5. Run the Frontend (Dashboard)

```bash
npx nx serve dashboard
```

This starts the Angular dev server at `http://localhost:4200`. API requests are proxied to `http://localhost:3000` via `proxy.conf.json`.

### 6. Run Both Together

Open two terminal windows and run each serve command, or use:

```bash
npx nx run-many -t serve -p api dashboard
```

### 7. Run Tests

```bash
# All unit tests
npx nx run-many -t test

# Specific project tests
npx nx test api
npx nx test dashboard

# E2E tests (requires running servers)
npx nx e2e api-e2e
npx nx e2e dashboard-e2e
```

### 8. Lint and Type Check

```bash
npx nx run-many -t lint
npx nx run-many -t typecheck
```

### 9. Build for Production

```bash
npx nx build api
npx nx build dashboard
```

---

## Test Points

The project includes comprehensive unit tests using **Vitest** (backend and frontend) and **Playwright** (E2E). Below is a summary of all test suites and what they verify.

### Backend Unit Tests (`apps/api/`)

#### Auth Controller (`auth.controller.spec.ts`)
- [x] `signup` — delegates to `AuthService.signup` and returns `{ access_token, user }`
- [x] `login` — returns `{ access_token }` for valid credentials
- [x] `login` — throws `UnauthorizedException` for invalid credentials
- [x] `getOrganisationsForSignup` — delegates to `AuthService` with role filter
- [x] `getOrganisationsForSignup` — passes `undefined` when role is not provided

#### Auth Service (`auth.service.spec.ts`)
- [x] `signup` — creates user, hashes password, returns `access_token` + user info
- [x] `signup` — throws `ConflictException` when email already exists
- [x] `signup` — throws `BadRequestException` when organization not found
- [x] `signup` — throws `BadRequestException` when Admin signs up to root org
- [x] `signup` — defaults role to `Viewer` when not provided
- [x] `validateUser` — returns user for valid credentials
- [x] `validateUser` — returns `null` for wrong password
- [x] `validateUser` — returns `null` when user doesn't exist
- [x] `login` — returns a signed JWT access token with correct payload
- [x] `login` — logs a `user:login` audit entry
- [x] `getOrganisationsForSignup` — returns all orgs for Owner role
- [x] `getOrganisationsForSignup` — filters to child orgs for Admin role
- [x] `getOrganisationsForSignup` — filters to child orgs for Viewer role
- [x] `findById` — returns user when found
- [x] `findById` — returns `null` when user not found

#### Tasks Controller (`tasks.controller.spec.ts`)
- [x] `findAll` — delegates to `TasksService.findAll` with `req.user`
- [x] `findOne` — delegates to `TasksService.findOne` with id and `req.user`
- [x] `create` — delegates to `TasksService.create` with DTO and `req.user`
- [x] `update` — delegates to `TasksService.update` with id, DTO, and `req.user`
- [x] `remove` — delegates to `TasksService.remove` with id and `req.user`

#### Tasks Service (`tasks.service.spec.ts`)
- [x] `findAll` — returns tasks for accessible organizations (user's org + children)
- [x] `findAll` — returns empty array when user has no organization
- [x] `findAll` — includes child org tasks
- [x] `findOne` — returns task when found and user has access
- [x] `findOne` — throws `NotFoundException` when task doesn't exist
- [x] `findOne` — throws `ForbiddenException` when user has no organization
- [x] `findOne` — throws `ForbiddenException` when user can't access task org
- [x] `create` — creates task in allowed organization with audit log
- [x] `create` — throws `ForbiddenException` when user has no organization
- [x] `create` — throws `ForbiddenException` when org not in accessible list
- [x] `update` — updates task fields and logs audit
- [x] `update` — does not overwrite fields not in the DTO
- [x] `remove` — deletes task and logs audit

#### Audit Controller (`audit.controller.spec.ts`)
- [x] `findAll` — delegates to `AuditService.findAll` with `req.user`
- [x] `findAll` — returns empty array when service returns empty

#### Audit Service (`audit.service.spec.ts`)
- [x] `log` — creates and persists an audit log entry
- [x] `log` — handles null `userId` and `organizationId`
- [x] `log` — defaults `resourceId` to empty string when not provided
- [x] `findAll` — returns audit logs for accessible organizations
- [x] `findAll` — returns empty array when user has no organization
- [x] `findAll` — includes child org logs

#### Organisations Controller (`organisations.controller.spec.ts`)
- [x] `create` — delegates to service with name, parentId, and user
- [x] `findAll` — delegates to service with `req.user`
- [x] `remove` — delegates to service with id and `req.user`

#### Organisations Service (`organisations.service.spec.ts`)
- [x] `create` — creates root organization for owner without existing org
- [x] `create` — creates child org for owner with root org
- [x] `create` — throws `ForbiddenException` for non-owner
- [x] `create` — throws `BadRequestException` when parentId set for first org
- [x] `create` — throws `ForbiddenException` when owner belongs to a child org
- [x] `findAll` — returns root org + children for owner of root org
- [x] `findAll` — returns only own org for non-owner user
- [x] `findAll` — returns empty array when user has no organization
- [x] `remove` — removes child organization with no users
- [x] `remove` — throws `ForbiddenException` for non-owner
- [x] `remove` — throws `NotFoundException` when org doesn't exist
- [x] `remove` — throws `BadRequestException` when org has users
- [x] `remove` — clears user `organizationId` when removing own root org

### Shared Library Tests (`libs/auth/`)

#### JWT Auth Guard (`jwt-auth.guard.spec.ts`)
- [x] Guard is defined and instantiable

#### Permissions Guard (`permissions.guard.spec.ts`)
- [x] Guard is defined and instantiable

#### Roles Guard (`roles.guard.spec.ts`)
- [x] Guard is defined and instantiable

### Frontend Unit Tests (`apps/dashboard/`)

#### Login Page (`login-page.spec.ts`)
- [x] Component creates successfully
- [x] Has email and password form controls
- [x] Form starts invalid with empty values
- [x] Form is valid with proper email and password
- [x] Shows validation error for invalid email
- [x] Shows validation error for short password
- [x] Sets error message when form is invalid on submit
- [x] Calls `auth.login` with form values on valid submit
- [x] Navigates to `/tasks` after successful login
- [x] Sets error message on login failure
- [x] Resets `isSubmitting` after login attempt

#### Signup Page (`signup-page.spec.ts`)
- [x] Component creates successfully
- [x] Has email, password, role, and organizationId form controls
- [x] Defaults role to Owner
- [x] Loads organizations on initialization
- [x] Auto-selects first organization
- [x] `onRoleChange` — updates role and reloads organizations
- [x] `onRoleChange` — clears organizationId before loading new orgs
- [x] Sets error message when form is invalid on submit
- [x] Calls `auth.signup` with form values on valid submit
- [x] Navigates to `/tasks` after successful signup
- [x] Sets error message on signup failure
- [x] Resets `isSubmitting` after attempt

#### Tasks Page (`tasks-page.spec.ts`)
- [x] Component creates successfully
- [x] Loads tasks on init
- [x] Loads organizations on init
- [x] Defaults to showing all tasks (status/category filter = `'all'`)
- [x] Resets filters and sort to defaults
- [x] Computes `visibleTasks` with status filter
- [x] Computes `visibleTasks` with category filter
- [x] Opens create dialog
- [x] Closes create dialog
- [x] Sets delete target on `confirmRemove`
- [x] Clears delete target on `cancelDelete`
- [x] Truncates long text
- [x] Returns original text if short
- [x] Returns empty string for null/undefined

#### Tasks Store (`tasks-store.spec.ts`)
- [x] `loadTasks` — sets tasks from API response
- [x] `loadTasks` — sets error message on failure
- [x] `loadTasks` — shows generic message for non-Error throws
- [x] `createTask` — adds created task to front of list
- [x] `createTask` — returns null and sets error on failure
- [x] `updateTask` — replaces task in list with updated version
- [x] `updateTask` — returns null and sets error on failure
- [x] `deleteTask` — removes task from list
- [x] `deleteTask` — returns false and sets error on failure
- [x] `taskCount` — reflects the number of tasks
- [x] `clearError` — clears the error message

#### Tasks API (`tasks-api.spec.ts`)
- [x] `list` — calls `GET /tasks`
- [x] `getById` — calls `GET /tasks/:id`
- [x] `create` — calls `POST /tasks` with DTO
- [x] `update` — calls `PUT /tasks/:id` with DTO
- [x] `remove` — calls `DELETE /tasks/:id`

#### App Header (`app-header.spec.ts`)
- [x] Component creates successfully
- [x] Reflects authenticated state from `TokenStorageService`
- [x] Calls `auth.logout` when logout is invoked

### End-to-End Tests

#### API E2E (`api-e2e/src/api/api.spec.ts`)
- [x] `GET /api` — returns 200 with a message

#### Dashboard E2E (`dashboard-e2e/src/example.spec.ts`)
- [x] Landing page has `h1` containing "Welcome"

### Running Tests

```bash
# Run all unit tests across the workspace
npx nx run-many -t test

# Run tests for a specific project
npx nx test api
npx nx test dashboard

# Run tests in watch mode
npx nx test api --watch
npx nx test dashboard --watch

# Run E2E tests (servers must be running)
npx nx e2e api-e2e
npx nx e2e dashboard-e2e

# Run all lint checks
npx nx run-many -t lint

# Run type checking
npx nx run-many -t typecheck
```
