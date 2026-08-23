import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forbiddenResponse, unauthorizedResponse, badRequestResponse, notFoundResponse } from "@/lib/api-responses";
import { parsePaginationParams, getPaginationSkipTake, createPaginatedResponse } from "@/lib/pagination";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "document:view")) {
    return forbiddenResponse("Insufficient permissions to view documents", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/documents",
    });
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePaginationParams({
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });
  const { skip, take } = getPaginationSkipTake(page, pageSize);

  const role = session.user.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "PRINCIPAL" || role === "REGISTRAR";
  const where = isAdmin ? {} : { isConfidential: false };

  const [documents, totalCount] = await Promise.all([
    prisma.document.findMany({
      skip,
      take,
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json(createPaginatedResponse(documents, page, pageSize, totalCount));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "document:manage")) {
    return forbiddenResponse("Insufficient permissions to create documents", {
      userId: session.user.id,
      action: "POST",
      resource: "/api/documents",
    });
  }

  const body = await request.json();
  const { title, description, category, referenceNumber, sender, recipient, isConfidential, tags, metadata } = body;

  if (!title || !category) {
    return badRequestResponse("Title and category are required");
  }

  const document = await prisma.document.create({
    data: {
      title,
      description,
      category,
      referenceNumber,
      sender,
      recipient,
      isConfidential: isConfidential || false,
      tags: tags || null,
      metadata: metadata || null,
      uploadedById: session.user.id,
      createdById: session.user.id,
      status: "PENDING_REVIEW",
    },
  });

  await prisma.documentAuditLog.create({
    data: {
      documentId: document.id,
      action: "CREATED",
      performedById: session.user.id,
      details: `Document "${title}" created`,
    },
  });

  return NextResponse.json(document, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "document:manage")) {
    return forbiddenResponse("Insufficient permissions to update documents", {
      userId: session.user.id,
      action: "PATCH",
      resource: "/api/documents",
    });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return badRequestResponse("Document ID is required");
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return notFoundResponse("Document");
  }

  const allowedFields = ["title", "description", "category", "referenceNumber", "sender", "recipient", "tags", "metadata"];
  const filteredUpdates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return badRequestResponse("No valid fields provided for update");
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: filteredUpdates,
  });

  await prisma.documentAuditLog.create({
    data: {
      documentId: document.id,
      action: "UPDATED",
      performedById: session.user.id,
      details: `Document updated: ${Object.keys(filteredUpdates).join(", ")}`,
    },
  });

  return NextResponse.json(updatedDocument);
}