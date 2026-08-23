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

  if (!hasPermission(session.user.role as Role, "section:view")) {
    return forbiddenResponse("Insufficient permissions to view sections", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/sections",
    });
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePaginationParams({
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });
  const { skip, take } = getPaginationSkipTake(page, pageSize);

  const [sections, totalCount] = await Promise.all([
    prisma.section.findMany({
      skip,
      take,
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
      include: {
        adviser: { select: { name: true } },
        academicYear: { select: { year: true, isCurrent: true } },
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.section.count(),
  ]);

  return NextResponse.json(createPaginatedResponse(sections, page, pageSize, totalCount));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "section:manage")) {
    return forbiddenResponse("Insufficient permissions to manage sections", {
      userId: session.user.id,
      action: "POST",
      resource: "/api/sections",
    });
  }

  const body = await request.json();
  const { name, gradeLevel, adviserId } = body;

  if (!name || !gradeLevel) {
    return badRequestResponse("Section name and grade level are required");
  }

  if (adviserId) {
    const adviser = await prisma.user.findUnique({ where: { id: adviserId } });
    if (!adviser) {
      return notFoundResponse("Adviser");
    }
    if (!["TEACHER", "ADVISER"].includes(adviser.role)) {
      return badRequestResponse("Adviser must have TEACHER or ADVISER role");
    }
  }

  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!academicYear) {
    return badRequestResponse("No active academic year set");
  }

  const existing = await prisma.section.findFirst({
    where: { name, gradeLevel, academicYearId: academicYear.id },
  });
  if (existing) {
    return conflictResponse("Section already exists for this grade level in the current academic year");
  }

  const section = await prisma.section.create({
    data: {
      name,
      gradeLevel,
      adviserId: adviserId || null,
      academicYearId: academicYear.id,
    },
    include: {
      adviser: { select: { name: true } },
      academicYear: { select: { year: true, isCurrent: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(section, { status: 201 });
}