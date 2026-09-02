import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, forbiddenResponse, badRequestResponse } from "@/lib/api-responses";
import { validateFileUpload, saveUploadedFile, getFileCategory, formatFileSize } from "@/lib/file-upload";
import { join } from "path";
import { unlink } from "fs/promises";

const UPLOAD_DIR = join(process.cwd(), "storage", "uploads");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "file:upload")) {
    return forbiddenResponse("Insufficient permissions to upload files", {
      userId: session.user.id,
      action: "POST",
      resource: "/api/upload",
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const isPublic = false;
    const metadata = formData.get("metadata");

    if (!file) {
      return badRequestResponse("No file provided");
    }

    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type;

    // Auto-detect category
    const category = getFileCategory(mimeType);

    // Validate file
    const validation = validateFileUpload(fileName, fileSize, mimeType, category);
    if (!validation.valid) {
      return badRequestResponse(validation.error || "File validation failed");
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file
    const savedFileName = await saveUploadedFile(buffer, fileName, UPLOAD_DIR);

    // Store in database
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        originalName: fileName,
        fileName: savedFileName,
        filePath: `/api/upload/${savedFileName}`,
        fileSize,
        mimeType,
        category,
        uploadedById: session.user.id,
        isPublic,
        metadata: metadata ? JSON.parse(metadata as string) : undefined,
      },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: uploadedFile.id,
      originalName: uploadedFile.originalName,
      fileName: uploadedFile.fileName,
      filePath: uploadedFile.filePath,
      fileSize: uploadedFile.fileSize,
      fileSizeFormatted: formatFileSize(uploadedFile.fileSize),
      mimeType: uploadedFile.mimeType,
      category: uploadedFile.category,
      uploadedAt: uploadedFile.uploadedAt,
      uploadedBy: uploadedFile.uploadedBy?.name,
    });
  } catch (err: any) {
    console.error("Error uploading file:", err);
    return NextResponse.json({ error: err.message || "Failed to upload file" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "file:view")) {
    return forbiddenResponse("Insufficient permissions to view files", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/upload",
    });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
  const skip = (page - 1) * pageSize;

  try {
    const [files, total] = await Promise.all([
      prisma.uploadedFile.findMany({
        skip,
        take: pageSize,
        orderBy: { uploadedAt: "desc" },
        include: {
          uploadedBy: { select: { name: true } },
        },
      }),
      prisma.uploadedFile.count(),
    ]);

    const formattedFiles = files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      fileName: f.fileName,
      filePath: f.filePath,
      fileSize: f.fileSize,
      fileSizeFormatted: formatFileSize(f.fileSize),
      mimeType: f.mimeType,
      category: f.category,
      uploadedAt: f.uploadedAt,
      uploadedBy: f.uploadedBy?.name,
      isPublic: f.isPublic,
    }));

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("Error fetching files:", err);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "file:manage")) {
    return forbiddenResponse("Insufficient permissions to delete files", {
      userId: session.user.id,
      action: "DELETE",
      resource: "/api/upload",
    });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return badRequestResponse("File ID is required");
  }

  try {
    const file = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Remove the stored object before deleting its database record.
    await unlink(join(UPLOAD_DIR, file.fileName)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") throw err;
    });

    await prisma.uploadedFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
