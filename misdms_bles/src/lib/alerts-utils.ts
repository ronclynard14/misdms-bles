import { prisma } from "./prisma";

export type AlertType =
  | "ATTENDANCE_WARNING"
  | "LOW_GRADE_ALERT"
  | "ENROLLMENT_INCOMPLETE"
  | "SYSTEM_ERROR"
  | "MAINTENANCE"
  | "GRADE_POSTED"
  | "DOCUMENT_SHARED"
  | "USER_ACTION_REQUIRED";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  targetRole?: string;
  targetUser?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  threshold?: number;
  recipients: string[];
  createdAt: Date;
}

const ALERT_CONFIG: Record<AlertType, { severity: AlertSeverity; template: string }> = {
  ATTENDANCE_WARNING: {
    severity: "WARNING",
    template: "Student {studentName} has attendance below {threshold}%",
  },
  LOW_GRADE_ALERT: {
    severity: "WARNING",
    template: "Student {studentName} has grades below passing ({gradeValue})",
  },
  ENROLLMENT_INCOMPLETE: {
    severity: "WARNING",
    template: "Section {sectionName} has incomplete enrollment",
  },
  SYSTEM_ERROR: {
    severity: "CRITICAL",
    template: "System error: {errorMessage}",
  },
  MAINTENANCE: {
    severity: "INFO",
    template: "Scheduled maintenance: {maintenanceDetails}",
  },
  GRADE_POSTED: {
    severity: "INFO",
    template: "Grades posted for {subjectName} - {quarter}",
  },
  DOCUMENT_SHARED: {
    severity: "INFO",
    template: "Document {documentName} has been shared with you",
  },
  USER_ACTION_REQUIRED: {
    severity: "WARNING",
    template: "Action required: {actionDescription}",
  },
};

export async function createAlert(
  type: AlertType,
  title: string,
  message: string,
  options?: {
    targetRole?: string;
    targetUser?: string;
    metadata?: Record<string, any>;
    severity?: AlertSeverity;
  }
): Promise<Alert> {
  const severity = options?.severity || ALERT_CONFIG[type].severity;

  const alert = {
    id: `alert_${Date.now()}`,
    type,
    severity,
    title,
    message,
    targetRole: options?.targetRole,
    targetUser: options?.targetUser,
    metadata: options?.metadata,
    createdAt: new Date(),
    isResolved: false,
  };

  // Log to database
  await prisma.auditLog
    .create({
      data: {
        action: "ALERT_CREATED",
        resource: `alert:${type}`,
        details: message,
        userId: "system",
      },
    })
    .catch(() => {});

  return alert;
}

export async function checkAttendanceThreshold(threshold: number = 85): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const enrollments = await prisma.enrollment.findMany({
    include: { student: true },
  });

  for (const enrollment of enrollments) {
    const records = await prisma.attendanceRecord.findMany({
      where: { enrollmentId: enrollment.id },
    });

    if (records.length === 0) continue;

    const presentCount = records.filter((r) =>
      ["PRESENT", "LATE", "EXCUSED"].includes(r.status)
    ).length;
    const percentage = (presentCount / records.length) * 100;

    if (percentage < threshold) {
      const alert = await createAlert(
        "ATTENDANCE_WARNING",
        `Low Attendance: ${enrollment.student.firstName} ${enrollment.student.lastName}`,
        `Student has ${percentage.toFixed(2)}% attendance (below ${threshold}% threshold)`,
        {
          targetRole: "TEACHER",
          metadata: {
            studentId: enrollment.student.id,
            studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
            attendancePercentage: percentage,
            threshold,
          },
        }
      );
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function checkLowGrades(threshold: number = 70): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const grades = await prisma.grade.findMany({
    include: {
      enrollment: {
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      subject: { select: { name: true } },
    },
  });

  for (const grade of grades) {
    const gradeValues = [
      grade.firstFinalGrade,
      grade.secondFinalGrade,
      grade.thirdFinalGrade,
      grade.fourthFinalGrade,
    ].filter((g) => g !== null) as number[];

    for (const gradeValue of gradeValues) {
      if (gradeValue < threshold) {
        const alert = await createAlert(
          "LOW_GRADE_ALERT",
          `Low Grade Alert: ${grade.enrollment.student.firstName} ${grade.enrollment.student.lastName}`,
          `Student received ${gradeValue} in ${grade.subject.name} (below ${threshold} threshold)`,
          {
            targetRole: "TEACHER",
            metadata: {
              studentId: grade.enrollment.student.id,
              studentName: `${grade.enrollment.student.firstName} ${grade.enrollment.student.lastName}`,
              subject: grade.subject.name,
              gradeValue,
              threshold,
            },
          }
        );
        alerts.push(alert);
        break; // One alert per student per subject
      }
    }
  }

  return alerts;
}

export async function checkEnrollmentCompletion(
  minEnrollmentPercent: number = 80
): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const sections = await prisma.section.findMany({
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  for (const section of sections) {
    if (!section.capacity) continue;

    const enrollmentPercent = (section._count.enrollments / section.capacity) * 100;

    if (enrollmentPercent < minEnrollmentPercent) {
      const alert = await createAlert(
        "ENROLLMENT_INCOMPLETE",
        `Low Enrollment: ${section.name}`,
        `Section has ${enrollmentPercent.toFixed(1)}% enrollment (below ${minEnrollmentPercent}% target)`,
        {
          targetRole: "REGISTRAR",
          metadata: {
            sectionId: section.id,
            sectionName: section.name,
            enrollmentCount: section._count.enrollments,
            capacity: section.capacity,
            enrollmentPercent,
          },
        }
      );
      alerts.push(alert);
    }
  }

  return alerts;
}

export async function getAlertsByType(
  type: AlertType,
  limit: number = 50
): Promise<Alert[]> {
  // In production: fetch from database
  // For now return empty array as placeholder
  return [];
}

export async function getAlertsBySeverity(
  severity: AlertSeverity,
  limit: number = 50
): Promise<Alert[]> {
  // In production: fetch from database
  return [];
}

export async function getAlertsByUser(
  userId: string,
  limit: number = 50
): Promise<Alert[]> {
  // In production: fetch from database where targetUser = userId
  return [];
}

export async function getAlertsByRole(
  role: string,
  limit: number = 50
): Promise<Alert[]> {
  // In production: fetch from database where targetRole = role
  return [];
}

export async function getUnresolvedAlerts(limit: number = 100): Promise<Alert[]> {
  // In production: fetch from database where isResolved = false
  return [];
}

export async function resolveAlert(
  alertId: string,
  userId: string,
  notes?: string
): Promise<void> {
  // In production: update database
  await prisma.auditLog
    .create({
      data: {
        action: "ALERT_RESOLVED",
        resource: `alert:${alertId}`,
        details: notes || "Alert resolved",
        userId,
      },
    })
    .catch(() => {});
}

export async function dismissAlert(
  alertId: string,
  userId: string
): Promise<void> {
  // In production: mark as dismissed for user
  await prisma.auditLog
    .create({
      data: {
        action: "ALERT_DISMISSED",
        resource: `alert:${alertId}`,
        details: "Alert dismissed",
        userId,
      },
    })
    .catch(() => {});
}

export async function createAlertRule(
  name: string,
  condition: string,
  action: string,
  recipients: string[]
): Promise<AlertRule> {
  const rule: AlertRule = {
    id: `rule_${Date.now()}`,
    name,
    condition,
    action,
    enabled: true,
    recipients,
    createdAt: new Date(),
  };

  // In production: save to database
  return rule;
}

export async function getAlertRules(): Promise<AlertRule[]> {
  // In production: fetch from database
  return [];
}

export async function updateAlertRule(
  ruleId: string,
  updates: Partial<AlertRule>
): Promise<AlertRule> {
  // In production: update in database
  throw new Error("Not implemented");
}

export async function deleteAlertRule(ruleId: string): Promise<void> {
  // In production: delete from database
}

export async function evaluateAlertRules(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Check attendance
  const attendanceAlerts = await checkAttendanceThreshold(85);
  alerts.push(...attendanceAlerts);

  // Check grades
  const gradeAlerts = await checkLowGrades(70);
  alerts.push(...gradeAlerts);

  // Check enrollment
  const enrollmentAlerts = await checkEnrollmentCompletion(80);
  alerts.push(...enrollmentAlerts);

  return alerts;
}

export async function sendAlertNotifications(
  alerts: Alert[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const alert of alerts) {
    try {
      // Would send email/SMS/in-app notification here
      sent++;
    } catch (err) {
      failed++;
      console.error("Failed to send alert:", err);
    }
  }

  return { sent, failed };
}

export async function getAlertSummary(): Promise<{
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  unresolved: number;
}> {
  // In production: aggregate from database
  return {
    total: 0,
    bySeverity: { INFO: 0, WARNING: 0, CRITICAL: 0 },
    byType: {
      ATTENDANCE_WARNING: 0,
      LOW_GRADE_ALERT: 0,
      ENROLLMENT_INCOMPLETE: 0,
      SYSTEM_ERROR: 0,
      MAINTENANCE: 0,
      GRADE_POSTED: 0,
      DOCUMENT_SHARED: 0,
      USER_ACTION_REQUIRED: 0,
    },
    unresolved: 0,
  };
}

export function getAlertTemplate(type: AlertType): string {
  return ALERT_CONFIG[type].template;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return String(variables[key] || match);
  });
}
