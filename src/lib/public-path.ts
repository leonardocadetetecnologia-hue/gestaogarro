export function sessionCookiePath() {
  const value = (process.env.BASE_PATH || "").trim().replace(/\/$/, "");
  if (!value || value === "/") return "/";
  return value.startsWith("/") ? value : `/${value}`;
}
