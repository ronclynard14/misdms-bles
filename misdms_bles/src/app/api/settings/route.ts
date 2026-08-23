import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission, type Role } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse, badRequestResponse } from "@/lib/api-responses";
import { getAllSettings, getSettingsByCategory, updateSetting, validateSettingValue } from "@/lib/settings";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "settings:view")) {
    return forbiddenResponse("Insufficient permissions to view settings", {
      userId: session.user.id,
      action: "GET",
      resource: "/api/settings",
    });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    let settings;
    if (category && ["school", "academic", "system", "notifications", "grading"].includes(category)) {
      settings = await getSettingsByCategory(category as any);
    } else {
      settings = await getAllSettings();
    }

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    }

    return NextResponse.json({
      settings,
      grouped,
      categories: Object.keys(grouped),
    });
  } catch (err) {
    console.error("Error fetching settings:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!hasPermission(session.user.role as Role, "settings:manage")) {
    return forbiddenResponse("Insufficient permissions to manage settings", {
      userId: session.user.id,
      action: "PATCH",
      resource: "/api/settings",
    });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return badRequestResponse("Setting key and value are required");
  }

  // Validate setting value
  const validation = validateSettingValue(key, value);
  if (!validation.valid) {
    return badRequestResponse(validation.error || "Invalid setting value");
  }

  try {
    const updated = await updateSetting(key, value, session.user.id);
    if (!updated) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating setting:", err);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
