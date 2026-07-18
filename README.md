# Student Management Platform API Documentation

This is a sample nextjs project made to be used as a quick lightweight full stack web app prototype for performing tasks like ci/cd, deployment, containerization, tests etc.

This document outlines the API endpoints available in the application, including the request bodies and authentication requirements.

Authentication is handled by Clerk. When making API requests from an external client, pass the Clerk session token in the authorization header:
`Authorization: Bearer <clerk_session_token>`

---

## 🔐 Auth & Onboarding Endpoints

### 1. Sync User Profile

Checks if the logged-in user exists in Postgres and has a profile. Recreates the profile if missing, or flags that onboarding is required.

- **Method**: `POST`
- **Route**: `/api/v1/auth/sync`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X POST https://localhost:3000/api/v1/auth/sync \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Onboard User

Completes the setup of the user by assigning their role (ADMIN or STUDENT), full name, and department (if a student).

- **Method**: `POST`
- **Route**: `/api/v1/auth/onboard`
- **Headers**: `Authorization: Bearer <session_token>`
- **Body**:

```json
{
  "role": "STUDENT",
  "name": "John Doe",
  "departmentId": "dept_cuid_here"
}
```

- **curl**:

```bash
curl -X POST https://localhost:3000/api/v1/auth/onboard \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "STUDENT",
    "name": "John Doe",
    "departmentId": "dept_cuid_here"
  }'
```

---

## 🏢 Department Endpoints

### 1. List Departments

Returns a list of all academic departments. If the database is empty, it automatically seeds default departments.

- **Method**: `GET`
- **Route**: `/api/v1/departments`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X GET https://localhost:3000/api/v1/departments \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN"
```

---

## 🎓 Student Endpoints (Student Scope)

### 1. Fetch My Profile

Retrieves the profile of the currently logged-in student.

- **Method**: `GET`
- **Route**: `/api/v1/student/me`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X GET https://localhost:3000/api/v1/student/me \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN"
```

---

## 🛡️ Admin Endpoints (Admin Scope Only)

### 1. Create a Student

Creates a student user in Clerk (generating their username, first name, and last name) and creates their corresponding database records inside a safe transaction.

- **Method**: `POST`
- **Route**: `/api/v1/admin/students`
- **Headers**: `Authorization: Bearer <session_token>`
- **Body**:

```json
{
  "email": "student@example.com",
  "password": "studentpassword123",
  "name": "Alice Johnson",
  "departmentId": "dept_cuid_here"
}
```

- **curl**:

```bash
curl -X POST https://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "studentpassword123",
    "name": "Alice Johnson",
    "departmentId": "dept_cuid_here"
  }'
```

### 2. List All Students

Lists all registered students including their email, department, and registration timestamps.

- **Method**: `GET`
- **Route**: `/api/v1/admin/students`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X GET https://localhost:3000/api/v1/admin/students \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN"
```

### 3. Fetch Single Student Profile

Retrieves the details of a specific student by their User ID.

- **Method**: `GET`
- **Route**: `/api/v1/admin/students/:id`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X GET https://localhost:3000/api/v1/admin/students/user_2abc123 \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN"
```

### 4. Update Student Profile

Updates the name or department of a student, and propagates the name update to their Clerk profile.

- **Method**: `PUT`
- **Route**: `/api/v1/admin/students/:id`
- **Headers**: `Authorization: Bearer <session_token>`
- **Body**:

```json
{
  "name": "Alice J. Smith",
  "departmentId": "new_dept_cuid_here"
}
```

- **curl**:

```bash
curl -X PUT https://localhost:3000/api/v1/admin/students/user_2abc123 \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice J. Smith",
    "departmentId": "new_dept_cuid_here"
  }'
```

### 5. Delete Student Profile

Completely deletes the student from Clerk and removes their records from the Postgres database inside a cascade transaction.

- **Method**: `DELETE`
- **Route**: `/api/v1/admin/students/:id`
- **Headers**: `Authorization: Bearer <session_token>`
- **curl**:

```bash
curl -X DELETE https://localhost:3000/api/v1/admin/students/user_2abc123 \
  -H "Authorization: Bearer YOUR_CLERK_SESSION_TOKEN"
```
