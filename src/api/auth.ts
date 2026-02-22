const AUTH_TOKEN = process.env.NEXIA_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error("NEXIA_AUTH_TOKEN is not set in .env");
  process.exit(1);
}

export function authenticateRequest(req: Request): boolean {
  const header = req.headers.get("Authorization");
  if (!header) return false;
  const token = header.replace("Bearer ", "");
  return token === AUTH_TOKEN;
}

export function authenticateToken(token: string | null): boolean {
  if (!token) return false;
  return token === AUTH_TOKEN;
}
