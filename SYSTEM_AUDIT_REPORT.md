# System Audit Report: MISDMS-BLES
## Management Information System & Document Management System for Batong Lusong Elementary School

**Date:** 2026-08-23  
**System:** Next.js + Prisma + NextAuth with MySQL/MariaDB  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Executive Summary

The system has **8 critical security/logic flaws** and **12 high-priority inconsistencies** that could compromise data integrity, enable unauthorized access, and violate business logic constraints. Most issues stem from incomplete permission checks in API routes, missing role-based validations, and inconsistent authorization logic between middleware and API handlers.

---

## 🔴 CRITICAL ISSUES

### 1. **Missing Permission Checks in ALL API Routes**

**File:** `src/app/api/*/route.ts` (students, faculty, grades, enrollment, sections, documents)

**Issue:** API routes only check authentication (`getServerSession`) but **never validate permissions** or roles. Any authenticated user can:
- Create, update, delete students/faculty
- Modify grades (even TEACHER can update all grades)
- Create enrollments
- Update confidential documents

**Example - Grades Route:**
```typescript
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ❌ NO PERMISSION CHECK - any user can update any grade
  const grade = await prisma.grade.update({ where: { id }, data: { [field]: num } });
}
```

**Impact:** A TEACHER can modify all grades across all sections, not just their own. A NON_TEACHING staff member can create/delete students.

**Fix Required:**
```typescript
import { hasPermission } from "@/lib/permissions";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!hasPermission(session.user.role as Role, "grade:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... rest of logic
}
```

**Affected Routes:**
- `/api/students/route.ts` - POST, PATCH (grade:manage missing)
- `/api/faculty/route.ts` - POST, PATCH (faculty:manage missing)
- `/api/grades/route.ts` - PATCH (grade:manage missing)
- `/api/enrollment/route.ts` - POST (enrollment:manage missing)
- `/api/sections/route.ts` - POST (section:manage missing)
- `/api/documents/route.ts` - POST, PATCH (document:manage missing)

---

### 2. **Middleware Route Matching Logic Mismatch**

**Files:** 
- `src/middleware.ts` line 31-32
- `src/lib/permissions.ts` line 128-130

**Issue:** The middleware and permissions module use different logic for route matching:

**Permissions module** (correct):
```typescript
return config.routes.some(
  (route) => pathname === route || pathname.startsWith(`${route}/`)
);
```

**Middleware** (incorrect):
```typescript
const allowed = roleConfig.routes.some(
  (route) => pathname.startsWith(route) || pathname === "/dashboard"
);
```

**Problem:** Middleware uses `startsWith()` which can match unintended routes:
- User with `/documents` access could access `/documents-private` or `/documentations`
- The hardcoded `|| pathname === "/dashboard"` allows EVERYONE access to dashboard regardless of role config

**Example Exploit:**
```
User role: TEACHER (routes: ["/dashboard", "/grading", ...])
Request: /grading-admin   // ✅ PASSES (startsWith("/grading"))
Request: /dashboard-exploit  // ✅ PASSES (startsWith("/dashboard"))
```

**Fix:**
```typescript
// Use exact matching like permissions.ts
const allowed = roleConfig.routes.some(
  (route) => pathname === route || pathname.startsWith(`${route}/`)
) || pathname === "/dashboard";

// Remove hardcoded dashboard exception - use role config instead
```

---

### 3. **Faculty Route POST Handler Missing Role Validation**

**File:** `src/app/api/faculty/route.ts` line 37-78

**Issue:** The POST handler has no validation that only SUPER_ADMIN can create faculty accounts. The PATCH handler correctly checks `session.user.role !== "SUPER_ADMIN"`, but POST does not.

**Code:**
```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ❌ MISSING ROLE CHECK - only SUPER_ADMIN should create faculty
  const { name, email, password, role, department } = body;
  // ... creates user directly
}
```

**Impact:** Any authenticated user (even a TEACHER) can create new faculty accounts and assign them any role including SUPER_ADMIN.

---

### 4. **Grade Submission Timestamp Always Set to Current User**

**File:** `src/app/api/grades/route.ts` line 94

**Issue:** When grades are updated, `submittedById` is set to `session.user.id` (the person making the request), but there's no validation that this person is the actual subject teacher for that section/enrollment.

**Code:**
```typescript
const result = await prisma.grade.update({
  where: { id },
  data: { 
    finalGrade: final, 
    remarks, 
    submittedById: session.user.id,  // ❌ No validation this is the real teacher
    submittedAt: new Date() 
  },
});
```

**Impact:** 
- A registrar can submit grades and appear as the teacher who submitted them
- A principal can modify grades and falsify audit trail
- Grade submission audit is unreliable

---

### 5. **Student Creation Audit Trail Can Be Spoofed**

**File:** `src/app/api/students/route.ts` line 28

**Issue:** Similar to grades, `createdById` is set to session user without verification of proper role.

**Code:**
```typescript
const student = await prisma.student.create({
  data: {
    // ... student data
    createdById: session.user.id,  // ❌ No role validation
  },
});
```

**Impact:** Any authenticated user appears as the creator in audit logs, falsifying record of who actually created the student record.

---

### 6. **Document Confidentiality Check Is Bypassable**

**File:** `src/app/api/documents/route.ts` line 12-15

**Issue:** The confidentiality filter only applies to GET requests, but there's no permission check preventing PATCH operations on confidential documents.

**Code:**
```typescript
export async function GET() {
  // ... filters confidential based on role
  const where = isAdmin ? {} : { isConfidential: false };
}

export async function PATCH(request: Request) {
  // ❌ NO CONFIDENTIAL CHECK - any user can update any document
  const document = await prisma.document.update({
    where: { id },
    data: updates,
  });
}
```

**Impact:** A non-admin user could:
1. Get list of all documents (GET filters confidential)
2. Update a confidential document PATCH (no confidential check)
3. Modify document status, content, or metadata

---

### 7. **Email Uniqueness Check Is Case-Sensitive Bug**

**File:** `src/app/api/faculty/route.ts` line 58 and `src/lib/auth.ts` line 31

**Issue:** Email comparison is inconsistent:
- **Authentication:** Uses `.toLowerCase()` - `email.toLowerCase()`
- **Faculty creation:** Uses exact case - `findUnique({ where: { email } })`

**Code Comparison:**
```typescript
// auth.ts (correct)
const user = await prisma.user.findUnique({
  where: { email: credentials.email.toLowerCase() },
});

// faculty/route.ts (wrong)
const existing = await prisma.user.findUnique({ 
  where: { email }  // ❌ case-sensitive
});
```

**Impact:** 
- User can login with `Admin@School.com`
- Can create faculty account with `admin@school.com` (passes duplicate check)
- System treats them as different users, creating duplicates

---

### 8. **No Validation That Teachers Grade Only Their Sections**

**File:** `src/app/api/grades/route.ts` (entire route)

**Issue:** No validation that a TEACHER updating grades is actually assigned to teach that subject in that section via TeachingLoad.

**Current Code:**
```typescript
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await request.json();
  const { id, field, value } = body;
  
  // ❌ MISSING: Check if session.user.id is the teacher for this grade's section/subject
  
  const grade = await prisma.grade.findUnique({ where: { id } });
  // ... proceeds to update without checking TeachingLoad
}
```

**Required Logic:**
```typescript
// Must verify teacher has teaching load for this subject/section
const grade = await prisma.grade.findUnique({
  where: { id },
  include: {
    enrollment: { include: { section: true } },
    subject: true,
  },
});

if (session.user.role === "TEACHER") {
  const hasTeachingLoad = await prisma.teachingLoad.findUnique({
    where: {
      teacherId_sectionId_subjectId: {
        teacherId: session.user.id,
        sectionId: grade.enrollment.sectionId,
        subjectId: grade.subjectId,
      },
    },
  });
  
  if (!hasTeachingLoad) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

**Impact:** A teacher can modify grades for students they don't teach, in subjects they're not assigned.

---

## 🟠 HIGH-PRIORITY ISSUES

### 9. **Enrollment POST Missing Capacity Validation**

**File:** `src/app/api/enrollment/route.ts` line 50-56

**Issue:** When enrolling a student in a section, the system doesn't check if the section is at capacity.

```typescript
const enrollment = await prisma.enrollment.create({
  data: {
    studentId,
    sectionId,
    academicYearId: academicYear.id,
    status: "ENROLLED",
    // ❌ No capacity check - section.capacity vs current enrollments count
  },
});
```

**Impact:** Sections can exceed their capacity limit, violating business rules and affecting classroom management.

---

### 10. **Section Adviser Assignment Not Validated**

**File:** `src/app/api/sections/route.ts` line 53

**Issue:** When assigning an adviser to a section, there's no validation that:
- The user actually exists
- The user has the TEACHER or ADVISER role
- The user isn't already advising multiple sections (if that's a constraint)

```typescript
const section = await prisma.section.create({
  data: {
    name,
    gradeLevel,
    adviserId: adviserId || null,  // ❌ No validation of adviserId
    academicYearId: academicYear.id,
  },
});
```

**Impact:** Invalid user IDs can be assigned as advisers, creating orphaned references.

---

### 11. **Student Data Spread Operator Allows Unintended Field Updates**

**File:** `src/app/api/students/route.ts` line 40 (POST)

**Issue:** The POST handler uses spread operator `...rest` without whitelist:

```typescript
const { lrn, firstName, middleName, lastName, extensionName, gender, birthDate, address, ...rest } = body;

const student = await prisma.student.create({
  data: {
    lrn,
    firstName,
    middleName: middleName || null,
    lastName,
    extensionName: extensionName || null,
    gender,
    birthDate: new Date(birthDate),
    address,
    ...rest,  // ❌ DANGEROUS - allows setting any field via ...rest
    createdById: session.user.id,
  },
});
```

**Attack Example:**
```json
{
  "lrn": "123456789012",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "MALE",
  "birthDate": "2010-01-01",
  "address": "123 Main St",
  "status": "GRADUATED",
  "is4PsBeneficiary": true,
  "isLWD": true
}
```

A user could set any field defined in the Student model, including status flags they shouldn't control.

**Also appears in:** `src/app/api/students/route.ts` line 45 (PATCH) - even worse with spread operator.

---

### 12. **Enrollment PATCH Has Same Spread Operator Issue**

**File:** `src/app/api/students/route.ts` line 45

**Issue:** The PATCH handler uses dangerous spread operator:

```typescript
const body = await request.json();
const { id, ...data } = body;

const student = await prisma.student.update({
  where: { id },
  data: { ...data, updatedById: session.user.id },  // ❌ Allows updating ANY field
});
```

**Impact:** Users could update sensitive fields like `is4PsBeneficiary`, `isLWD`, `isCCT` status, family information, etc.

---

### 13. **No Validation That Academic Year Exists Before Enrollment**

**File:** `src/app/api/enrollment/route.ts` line 38-41

**Issue:** While the code checks for active academic year, if one doesn't exist, users get a generic error. More critically, students can only be enrolled in the current academic year—no historical data entry.

```typescript
const academicYear = await prisma.academicYear.findFirst({ 
  where: { isCurrent: true } 
});
if (!academicYear) {
  return NextResponse.json({ error: "No active academic year set" }, { status: 400 });
}
```

**Impact:** Cannot correct historical records or handle late enrollments.

---

### 14. **Document PATCH Missing Audit Log Permission Check**

**File:** `src/app/api/documents/route.ts` line 72-100

**Issue:** While PATCH creates an audit log, there's no validation of what fields can be updated or who can update them. Anyone could change document status to APPROVED or RELEASED without proper permissions.

```typescript
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await request.json();
  const { id, ...updates } = body;
  
  // ❌ CRITICAL: No permission check for document:approve or document:release
  // ❌ CRITICAL: No field-level authorization (status changes need special permission)
  
  const document = await prisma.document.update({
    where: { id },
    data: updates,  // Could be { status: "APPROVED", releasedById: "..." }
  });
}
```

---

### 15. **Role Permission Configuration Missing Consistency Checks**

**File:** `src/lib/permissions.ts` lines 7-113

**Issue:** The role definitions have inconsistencies:

1. **SUPER_ADMIN routes array is empty** (line 10):
   ```typescript
   SUPER_ADMIN: {
     label: "Super Admin",
     routes: [],  // ❌ Routes not used for SUPER_ADMIN (special case)
     permissions: [...]
   }
   ```
   This works because middleware has `if (role === "SUPER_ADMIN") return true`, but it's confusing and error-prone.

2. **Inconsistent permission naming:**
   - `document:manage` used but also `document:approve`, `document:release`
   - `grade:view` exists but no `grade:manage`
   - `attendance:manage` permission defined but no API for it

3. **REGISTRAR has `grade:view` but should have `grade:manage`** for recording grades.

---

### 16. **No Transaction Safety for Grade Calculations**

**File:** `src/app/api/grades/route.ts` line 58-95

**Issue:** Grade submission does multiple database updates without transaction:

```typescript
// Update specific field
const updated = await prisma.grade.update({ where: { id }, data: { [field]: num } });

// Recompute quarter grade (separate update)
const refreshed = await prisma.grade.update({ where: { id }, data: { [`${q}Grade`]: qGrade } });

// Recompute final grade (third update!)
const result = await prisma.grade.update({
  where: { id },
  data: { finalGrade: final, remarks, submittedById: session.user.id, submittedAt: new Date() },
});
```

**Impact:** If a failure occurs between updates, grade data is in inconsistent state (e.g., q1Grade updated but finalGrade not recalculated).

**Fix:** Use Prisma transaction:
```typescript
const result = await prisma.$transaction(async (tx) => {
  const updated = await tx.grade.update({ where: { id }, data: { [field]: num } });
  // ... other updates
  return result;
});
```

---

### 17. **Insufficient Input Validation on Password Creation**

**File:** `src/app/api/faculty/route.ts` line 54-56

**Issue:** Password validation is too weak:

```typescript
if (password.length < 6) {
  return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
}
```

**Problems:**
- No complexity requirements (no uppercase, lowercase, numbers, symbols)
- 6 characters is below OWASP recommendations (minimum 12)
- No check for common passwords

---

### 18. **Date Parsing Could Fail Silently**

**File:** `src/app/api/students/route.ts` line 25

**Issue:** Direct date parsing without error handling:

```typescript
birthDate: new Date(birthDate),  // ❌ Could be invalid
```

**Impact:** Invalid date strings create Invalid Date objects, causing downstream errors or silent failures.

**Fix:**
```typescript
birthDate: (() => {
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid birth date");
  }
  return d;
})(),
```

---

### 19. **Missing Request Body Size Limits**

**All POST/PATCH routes**

**Issue:** No specified request size limits in API routes. Large file uploads or malicious payloads could cause:
- Memory exhaustion
- DoS attacks
- Multipart upload abuse

---

### 20. **No Logging of Permission Denials**

**File:** `src/middleware.ts` and all API routes

**Issue:** When authorization fails, no audit log is created. Security incidents (unauthorized access attempts) are invisible.

**Current:** Just returns 403/redirect with no logging of WHO attempted access or WHEN.

---

## 🟡 MEDIUM-PRIORITY ISSUES

### 21. **Sections Not Scoped to Academic Year in GET**

**File:** `src/app/api/sections/route.ts` line 12-22

**Issue:** GET returns all sections from all academic years. Should filter to current year only.

```typescript
const sections = await prisma.section.findMany({
  orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
  // ❌ Missing filter: where: { academicYear: { isCurrent: true } }
});
```

---

### 22. **Grades Query Hardcoded to 60 Records**

**File:** `src/app/api/grades/route.ts` line 13

**Issue:**
```typescript
const grades = await prisma.grade.findMany({
  take: 60,  // ❌ Hardcoded limit - no pagination
});
```

**Problems:**
- No pagination support for large datasets
- Users see inconsistent results
- Performance issue with thousands of grades

---

### 23. **Students Query Has No Limit**

**File:** `src/app/api/students/route.ts` line 57

**Issue:**
```typescript
const students = await prisma.student.findMany({
  orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  // ❌ NO LIMIT - could retrieve thousands of records
});
```

---

### 24. **Missing Error Messages for Generic Cases**

**File:** All API routes

**Issue:** Generic "Unauthorized" responses don't indicate if auth failed or permissions failed.

```typescript
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// vs later...
if (!hasPermission(...)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

Both return same message, preventing proper error handling.

---

### 25. **Enrollment Unique Constraint Only by Year**

**File:** `prisma/schema.prisma` line 339

**Issue:**
```prisma
@@unique([studentId, academicYearId])
```

This allows a student to be enrolled in multiple sections in the same academic year, which might be invalid depending on business rules. Should be `@@unique([studentId, academicYearId, sectionId])` if rule is one section per student per year.

---

### 26. **Missing Validation of Adviser Role**

**File:** `src/app/api/sections/route.ts` line 53

**Issue:** When assigning an adviser, no validation that user has appropriate role.

---

### 27. **No Rate Limiting on API Routes**

**Issue:** No protection against brute force or scraping attacks. Anyone can repeatedly call POST/PATCH endpoints without throttling.

---

### 28. **Missing Soft Deletes**

**Issue:** The system has DELETE capabilities (implied by permissions `document:delete`) but no routes implement them. No audit trail of deleted records. Schema has no `deletedAt` field.

---

### 29. **Session/Token Management Vulnerabilities**

**File:** `src/lib/auth.ts` line 12

**Issue:**
```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60,  // 30 days
}
```

30-day session is too long. No refresh token rotation. User status changes (suspension) don't invalidate existing tokens.

**Fix:** Reduce to 1 day, implement token refresh strategy.

---

### 30. **CSRF Protection Not Verified**

**Issue:** NextAuth should provide CSRF protection, but it's not explicitly configured or documented in the codebase.

---

## 🟢 LOW-PRIORITY ISSUES

### 31. **Missing API Documentation**

No OpenAPI/Swagger documentation for API endpoints.

---

### 32. **Hardcoded Grade Calculation Weights**

**File:** `src/app/api/grades/route.ts` line 71

```typescript
qGrade = Math.round((ww * 0.3 + pt * 0.5 + pe * 0.2) * 100) / 100;
```

Weights are hardcoded. Should be configurable per school year or subject.

---

### 33. **No Optimistic Concurrency Control**

Multiple users can simultaneously update the same grade without conflict detection.

---

### 34. **Missing Indexes on Foreign Keys**

Some foreign key relationships lack indexes for query performance.

---

## Summary Table

| Issue # | Severity | Category | Status |
|---------|----------|----------|--------|
| 1 | 🔴 Critical | Missing Permission Checks | Unfixed |
| 2 | 🔴 Critical | Middleware Route Logic Bug | Unfixed |
| 3 | 🔴 Critical | Faculty Role Validation | Unfixed |
| 4 | 🔴 Critical | Grade Audit Trail | Unfixed |
| 5 | 🔴 Critical | Student Audit Trail | Unfixed |
| 6 | 🔴 Critical | Document Confidentiality | Unfixed |
| 7 | 🔴 Critical | Email Case-Sensitivity | Unfixed |
| 8 | 🔴 Critical | Teacher Grading Scope | Unfixed |
| 9 | 🟠 High | Section Capacity | Unfixed |
| 10 | 🟠 High | Section Adviser | Unfixed |
| 11 | 🟠 High | Student Data Injection | Unfixed |
| 12 | 🟠 High | Enrollment Data Injection | Unfixed |
| 13 | 🟠 High | Academic Year Scope | Unfixed |
| 14 | 🟠 High | Document Permission | Unfixed |
| 15 | 🟠 High | Permission Config | Unfixed |
| 16 | 🟠 High | Grade Transaction | Unfixed |
| 17 | 🟠 High | Password Validation | Unfixed |
| 18 | 🟠 High | Date Parsing | Unfixed |
| 19 | 🟠 High | Request Size Limits | Unfixed |
| 20 | 🟠 High | Permission Audit Log | Unfixed |

---

## Recommended Priority Order for Fixes

### Phase 1 - CRITICAL (Before production use):
1. Add permission checks to ALL API routes
2. Fix middleware route matching logic
3. Add teacher scope validation to grades
4. Fix email case-sensitivity
5. Remove dangerous spread operators
6. Add role validation to faculty POST

### Phase 2 - HIGH (Before first deployment):
7. Add capacity validation to enrollments
8. Add transaction safety to grades
9. Improve password requirements
10. Add audit logging for denied permissions
11. Add date validation

### Phase 3 - MEDIUM (Sprint next):
12. Add pagination support
13. Implement rate limiting
14. Improve error messages
15. Add soft delete support

---

## Testing Recommendations

```bash
# Security tests needed:
1. Attempt to modify grades as TEACHER across sections
2. Attempt to create student as NON_TEACHING user
3. Attempt to access /grading-admin with TEACHER role
4. Create faculty with duplicate email (different case)
5. Update section adviser to invalid user ID
6. PATCH student with is4PsBeneficiary flag via spread operator
7. Verify middleware path matching with similar-named routes
```

---

## References

- **OWASP Top 10:** Broken Access Control (#1), Injection (#3)
- **DepEd Requirements:** Proper audit trails, role-based access
- **NextAuth Docs:** Session configuration, permission middleware
- **Prisma Docs:** Transactions, unique constraints, indexing

