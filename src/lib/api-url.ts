const FRONTEND_API_URLS = new Map([
  [
    "https://disapm-prod.up.railway.app",
    "https://disapm-api-prod.up.railway.app",
  ],
  ["https://disapm.in", "https://disapm-api-prod.up.railway.app"],
  [
    "https://disapm-stage.up.railway.app",
    "https://disapm-api-stage.up.railway.app",
  ],
]);

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const deploymentApiUrl = FRONTEND_API_URLS.get(window.location.origin);
    if (deploymentApiUrl) {
      return deploymentApiUrl;
    }
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return configuredApiUrl
    ? configuredApiUrl.replace(/\/+$/, "")
    : "http://localhost:3001";
}
