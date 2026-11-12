const pendingGets = new Map<string, Promise<Response>>();

function getRequestKey(url: string, init: RequestInit) {
  const headers = Array.from(new Headers(init.headers).entries()).sort(
    ([first], [second]) => first.localeCompare(second),
  );

  return JSON.stringify({
    url,
    credentials: init.credentials ?? "same-origin",
    headers,
  });
}

/** Coalesces concurrent identical GETs and gives each caller its own response body. */
export function fetchGet(url: string, init: RequestInit = {}) {
  const key = getRequestKey(url, init);
  let request = pendingGets.get(key);

  if (!request) {
    request = fetch(url, { ...init, method: "GET" });
    pendingGets.set(key, request);
    void request.then(
      () => {
        if (pendingGets.get(key) === request) pendingGets.delete(key);
      },
      () => {
        if (pendingGets.get(key) === request) pendingGets.delete(key);
      },
    );
  }

  return request.then((response) => response.clone());
}
