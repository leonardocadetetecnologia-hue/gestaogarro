const EVENTS_PATH = "/api/integrations/events";

export function isIntegrationEventsPath(pathname: string, basePath = process.env.BASE_PATH || "") {
  if (pathname === EVENTS_PATH) return true;
  const base = basePath.trim().replace(/\/$/, "");
  return Boolean(base) && pathname === `${base.startsWith("/") ? base : `/${base}`}${EVENTS_PATH}`;
}
