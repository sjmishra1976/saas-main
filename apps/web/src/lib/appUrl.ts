export function getAppBaseUrl(req?: Request) {
  const configured =
    process.env.APP_BASE_URL ||
    process.env.AUTH0_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (configured) return configured;

  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function toAppUrl(path: string, req?: Request) {
  return new URL(path, getAppBaseUrl(req));
}
