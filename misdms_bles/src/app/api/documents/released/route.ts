import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.documentReleaseLog.findMany({
    orderBy: { dateReleased: "desc" },
    take: 50,
    include: { document: { select: { title: true, referenceNumber: true } } },
  });

  return NextResponse.json(logs);
}