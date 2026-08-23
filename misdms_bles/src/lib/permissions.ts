export interface RolePermissionConfig {
  label: string;
  routes: string[];
  permissions: string[];
}

export const rolePermissions: Record<string, RolePermissionConfig> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    routes: [],
    permissions: [
      "student:manage",
      "faculty:manage",
      "section:manage",
      "enrollment:manage",
      "grade:manage",
      "document:manage",
      "document:approve",
      "document:release",
      "audit:view",
      "settings:manage",
    ],
  },
  PRINCIPAL: {
    label: "Principal",
    routes: [
      "/dashboard",
      "/students",
      "/faculty",
      "/sections",
      "/enrollment",
      "/grading",
      "/documents",
      "/reports",
      "/audit-logs",
    ],
    permissions: [
      "student:view",
      "faculty:view",
      "section:view",
      "enrollment:view",
      "grade:view",
      "document:manage",
      "document:approve",
      "document:release",
      "audit:view",
    ],
  },
  REGISTRAR: {
    label: "School Registrar",
    routes: [
      "/dashboard",
      "/students",
      "/enrollment",
      "/grading",
      "/documents",
      "/reports",
      "/sections",
    ],
    permissions: [
      "student:manage",
      "enrollment:manage",
      "grade:view",
      "document:manage",
      "document:release",
      "reports:generate",
    ],
  },
  ICT_COORDINATOR: {
    label: "ICT Coordinator",
    routes: [
      "/dashboard",
      "/students",
      "/faculty",
      "/sections",
      "/enrollment",
      "/documents",
    ],
    permissions: [
      "student:view",
      "faculty:view",
      "section:view",
      "enrollment:view",
      "document:manage",
      "settings:manage",
    ],
  },
  TEACHER: {
    label: "Teacher",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports"],
    permissions: ["grade:manage", "attendance:manage", "document:view"],
  },
  ADVISER: {
    label: "Adviser",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports"],
    permissions: ["grade:manage", "attendance:manage", "document:view"],
  },
  NON_TEACHING: {
    label: "Non-Teaching Staff",
    routes: ["/dashboard", "/documents", "/inventory"],
    permissions: ["document:view", "inventory:manage"],
  },
  ADMIN_OFFICER: {
    label: "Administrative Officer",
    routes: ["/dashboard", "/documents", "/inventory", "/reports"],
    permissions: [
      "document:manage",
      "document:release",
      "inventory:manage",
      "reports:generate",
    ],
  },
};

export type Role = keyof typeof rolePermissions;

export function hasPermission(role: Role, permission: string): boolean {
  const config = rolePermissions[role];
  if (!config) return false;
  if (role === "SUPER_ADMIN") return true;
  return config.permissions.includes(permission);
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  if (role === "SUPER_ADMIN") return true;
  const config = rolePermissions[role];
  if (!config) return false;
  return config.routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function requirePermission(role: Role | undefined, permission: string): boolean {
  if (!role) return false;
  return hasPermission(role as Role, permission);
}