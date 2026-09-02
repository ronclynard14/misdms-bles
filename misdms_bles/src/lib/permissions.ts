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
      "analytics:view",
      "attendance:view",
      "attendance:manage",
      "reports:view",
      "reports:generate",
      "reports:manage",
      "backup:create",
      "backup:restore",
      "backup:view",
      "backup:download",
      "export:data",
      "file:upload",
      "file:view",
      "file:manage",
      "search:data",
      "notification:send",
      "notification:view",
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
      "analytics:view",
      "attendance:view",
      "attendance:manage",
      "reports:view",
      "reports:generate",
      "export:data",
      "file:view",
      "search:data",
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
      "analytics:view",
      "attendance:view",
      "reports:view",
      "reports:generate",
      "reports:manage",
      "export:data",
      "file:view",
      "search:data",
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
      "analytics:view",
      "settings:view",
      "file:view",
      "file:upload",
      "file:manage",
      "search:data",
      "notification:view",
      "notification:send",
    ],
  },
  TEACHER: {
    label: "Teacher",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports", "/alerts"],
    permissions: ["grade:view", "grade:manage", "attendance:view", "attendance:manage", "document:view", "alerts:view", "reports:view", "reports:generate", "search:data"],
  },
  ADVISER: {
    label: "Adviser",
    routes: ["/dashboard", "/grading", "/attendance", "/documents", "/reports", "/alerts"],
    permissions: ["grade:view", "grade:manage", "attendance:view", "attendance:manage", "document:view", "alerts:view", "reports:view", "reports:generate", "search:data"],
  },
  NON_TEACHING: {
    label: "Non-Teaching Staff",
    routes: ["/dashboard", "/documents", "/inventory"],
    permissions: ["document:view", "inventory:view", "inventory:manage", "file:view", "search:data"],
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
      "analytics:view",
      "reports:view",
      "reports:manage",
      "export:data",
      "file:view",
      "search:data",
    ],
  },
};

export type Role = keyof typeof rolePermissions;

export function hasPermission(role: Role, permission: string): boolean {
  const config = rolePermissions[role];
  if (!config) return false;
  if (role === "SUPER_ADMIN") return true;
  const aliases: Record<string, string> = {
    "report:view": "reports:view",
    "grades:view": "grade:view",
    "grades:manage": "grade:manage",
  };
  return config.permissions.includes(permission) || config.permissions.includes(aliases[permission]);
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