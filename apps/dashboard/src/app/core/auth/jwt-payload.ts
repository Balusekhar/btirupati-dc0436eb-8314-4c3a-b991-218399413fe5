export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  exp?: number;
  iat?: number;
};

function base64UrlDecode(input: string): string {
  // Convert base64url -> base64.
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const normalized = b64 + pad;

  // atob is available in browsers; dashboard is a browser app.
  return atob(normalized);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

