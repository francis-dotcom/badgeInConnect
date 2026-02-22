export const CONFIG = {
  // Set EXPO_PUBLIC_API_BASE_URL in .env to override (e.g. your ngrok tunnel URL).
  // Fallback: local dev machine IP on port 3004.
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.0.53:3004",
  TIMEOUT_MS: 10000, // 10 seconds timeout for network requests
  // Optional: set to match careGiverConnect backend ADMIN_SESSION_SECRET so /api/admin/* requests are allowed
  ADMIN_SESSION_SECRET: process.env.EXPO_PUBLIC_ADMIN_SESSION_SECRET || "",
};

/** Headers for /api/admin/* requests. Include in fetch() so backend accepts the request. */
export function getAdminApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CONFIG.ADMIN_SESSION_SECRET) {
    headers.Authorization = `Bearer ${CONFIG.ADMIN_SESSION_SECRET}`;
  }
  return headers;
}
