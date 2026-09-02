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
      "inventory:view",
      "inventory:manage",
      "audit:view",
      "alerts:view",
      "alerts:manage",
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
      "/alerts",
      "/inventory",
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
      "inventory:view",
      "inventory:manage",
      "audit:view",
      "alerts:view",
      "alerts:manage",
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
      "/alerts",
      "/inventory",
    ],
    permissions: [
      "student:manage",
      "enrollment:manage",
      "grade:view",
      "document:manage",
      "document:release",
      "inventory:view",
      "inventory:manage",
      "reports:generate",
      "alerts:view",
      "alerts:manage",
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
      "/alerts",
      "/inventory",
    ],
    permissions: [
      "student:view",
      "faculty:view",
      "section:view",
      "enrollment:view",
      "document:manage",
      "inventory:view",
      "settings:manage",
      "alerts:view",
    ],
  },
  TEACHER: {
    label: "Teacher",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports", "/alerts"],
    permissions: ["grade:manage", "attendance:manage", "document:view", "alerts:view"],
  },
  ADVISER: {
    label: "Adviser",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports", "/alerts"],
    permissions: ["grade:manage", "attendance:manage", "document:view", "alerts:view"],
  },
  NON_TEACHING: {
    label: "Non-Teaching Staff",
    routes: ["/dashboard", "/documents", "/inventory"],
    permissions: ["document:view", "inventory:view", "inventory:manage"],
  },
  ADMIN_OFFICER: {
    label: "Administrative Officer",
    routes: ["/dashboard", "/documents", "/inventory", "/reports", "/alerts"],
    permissions: [
      "document:manage",
      "document:release",
      "inventory:view",
      "inventory:manage",
      "reports:generate",
      "alerts:view",
      "alerts:manage",
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