import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string;
}) {
  await prisma.notification.create({ data: input });
}
