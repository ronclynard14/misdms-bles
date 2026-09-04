import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import { join, basename } from "path";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFoundResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-responses";

const UPLOAD_DIR = join(process.cwd(), "storage", "uploads");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorizedResponse();
  if (!hasPermission(session.user.role as Role, "file:view")) {
    return forbiddenResponse("Insufficient permissions to view files", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/upload",
    });
  }

  const { fileName: requestedFileName } = await params;
  const fileName = basename(requestedFileName);
  const file = await prisma.uploadedFile.findUnique({ where: { fileName } });
  if (!file) return notFoundResponse("File");

  try {
    const content = await readFile(join(UPLOAD_DIR, fileName));
    return new NextResponse(content, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.originalName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return notFoundResponse("File");
  }
}