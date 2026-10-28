export const pieColors = ["#a55e44", "#507e98", "#548464", "#c58c40", "#7a5ea0", "#bd6256", "#3d8b8b", "#d17a45", "#6e8b4f", "#8d5e7a"];

export type PiePart = {
  label: string;
  value: number;
  share: number;
  start: number;
  end: number;
  color: string;
};

export function pieParts(entries: { label: string; value: number }[]): PiePart[] {
  const rows = entries.filter((item) => item.value > 0);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!total) return [];
  let start = 0;
  return rows.map((item, index) => {
    const share = item.value / total;
    const part = { label: item.label, value: item.value, share, start, end: start + share, color: pieColors[index % pieColors.length] };
    start += share;
    return part;
  });
}

export function piePath(start: number, end: number) {
  if (end - start >= 0.999) return "";
  const point = (turn: number) => {
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle), Math.sin(angle)];
  };
  const [x0, y0] = point(start);
  const [x1, y1] = point(end);
  const large = end - start > 0.5 ? 1 : 0;
  return `M 0 0 L ${x0.toFixed(4)} ${y0.toFixed(4)} A 1 1 0 ${large} 1 ${x1.toFixed(4)} ${y1.toFixed(4)} Z`;
}
