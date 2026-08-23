import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, unauthorizedResponse, badRequestResponse, notFoundResponse, conflictResponse } from "@/lib/api-responses";
import { parsePaginationParams, getPaginationSkipTake, createPaginatedResponse } from "@/lib/pagination";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "enrollment:view")) {
    return forbiddenResponse("Insufficient permissions to view enrollments", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/enrollment",
    });
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePaginationParams({
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });
  const { skip, take } = getPaginationSkipTake(page, pageSize);

  const [enrollments, totalCount] = await Promise.all([
    prisma.enrollment.findMany({
      skip,
      take,
      orderBy: [{ createdAt: "desc" }],
      include: {
        student: { select: { lrn: true, firstName: true, lastName: true } },
        section: { select: { name: true, gradeLevel: true } },
        academicYear: { select: { year: true } },
      },
    }),
    prisma.enrollment.count(),
  ]);

  return NextResponse.json(createPaginatedResponse(enrollments, page, pageSize, totalCount));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "enrollment:manage")) {
    return forbiddenResponse("Insufficient permissions to manage enrollments", {
      userId: session.user.id,
      action: "POST",
      resource: "/api/enrollment",
    });
  }

  const body = await request.json();
  const { studentId, sectionId } = body;

  if (!studentId || !sectionId) {
    return badRequestResponse("Student ID and section ID are required");
  }

  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!academicYear) {
    return badRequestResponse("No active academic year set");
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return notFoundResponse("Student");
  }

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return notFoundResponse("Section");
  }

  const enrollmentCount = await prisma.enrollment.count({
    where: { sectionId, status: "ENROLLED" },
  });

  if (enrollmentCount >= section.capacity) {
    return conflictResponse(`Section is at capacity (${section.capacity} students)`);
  }

  const existing = await prisma.enrollment.findFirst({
    where: { studentId, academicYearId: academicYear.id },
  });
  if (existing) {
    return conflictResponse("Student is already enrolled in this academic year");
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId,
      sectionId,
      academicYearId: academicYear.id,
      status: "ENROLLED",
      createdById: session.user.id,
    },
    include: {
      student: { select: { lrn: true, firstName: true, lastName: true } },
      section: { select: { name: true, gradeLevel: true } },
      academicYear: { select: { year: true } },
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}