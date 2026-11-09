const PRODUCTION_API_URL = "https://disapm-api-prod.up.railway.app";
const PRODUCTION_FRONTEND_ORIGINS = new Set([
  "https://disapm-prod.up.railway.app",
  "https://disapm.in",
]);

export function getApiUrl(): string {
  if (
    typeof window !== "undefined" &&
    PRODUCTION_FRONTEND_ORIGINS.has(window.location.origin)
  ) {
    return PRODUCTION_API_URL;
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return configuredApiUrl
    ? configuredApiUrl.replace(/\/+$/, "")
    : "http://localhost:3001";
}
