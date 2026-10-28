type Ranked = { id: string; createdAt?: string | Date | null };

function timeOf(value: string | Date | null | undefined) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function creationRank<T extends Ranked>(items: T[]) {
  const dated = items.length > 0 && items.every(item => timeOf(item.createdAt) != null);
  const ordered = dated
    ? [...items].sort((left, right) => {
      const delta = timeOf(left.createdAt)! - timeOf(right.createdAt)!;
      if (delta) return delta;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    })
    : items;
  return ordered.map((item, index) => ({ item, number: index + 1 }));
}

export function compareDeliverables(left: Ranked & { number?: number }, right: Ranked & { number?: number }) {
  if (typeof left.number === "number" && typeof right.number === "number" && left.number !== right.number) {
    return left.number - right.number;
  }
  const leftTime = timeOf(left.createdAt);
  const rightTime = timeOf(right.createdAt);
  if (leftTime != null && rightTime != null && leftTime !== rightTime) return leftTime - rightTime;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
