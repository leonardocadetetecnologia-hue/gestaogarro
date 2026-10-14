import { prisma } from "@/lib/prisma";

export async function timerSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["timer.yellowHours", "timer.orangeHours", "timer.redHours"] } },
  });
  const map = new Map(rows.map((row) => [row.key, Number(row.value)]));
  return {
    yellowHours: map.get("timer.yellowHours") || 4,
    orangeHours: map.get("timer.orangeHours") || 24,
    redHours: map.get("timer.redHours") || 48,
  };
}
