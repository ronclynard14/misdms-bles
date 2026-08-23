import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse, badRequestResponse, notFoundResponse } from "@/lib/api-responses";

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorizedResponse();

  const { userId } = params;
  const isOwnProfile = session.user.id === userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return notFoundResponse("User");
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorizedResponse();

  const { userId } = params;
  const isOwnProfile = session.user.id === userId;

  if (!isOwnProfile && !hasPermission(session.user.role as Role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, bio, avatar } = body;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(bio && { bio }),
        ...(avatar && { avatar }),
      },
      select: { id: true, name: true, email: true, role: true, phone: true, bio: true, avatar: true },
    });

    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
