const FRONTEND_API_URLS = new Map([
  [
    "https://disapm-prod.up.railway.app",
    "https://disapm-api-prod.up.railway.app",
  ],
  ["https://www.disapm.in", "https://api.disapm.in"],
  ["https://stage.disapm.in", "https://stage-api.disapm.in"],
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
  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is not configured for this deployment.");
  }
  return "http://localhost:3001";
}
