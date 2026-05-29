import { API_BASE_URL } from "./api-config";

// Stamps the logged-in user's identity onto every request to the API so the
// server (which is otherwise stateless / blind to who is calling) can attribute
// writes in the activity log. Installed once at startup; patches global fetch.
export function installApiUserHeaders() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (!url || !url.startsWith(API_BASE_URL)) {
      return originalFetch(input, init);
    }

    let user: { id?: string; name?: string; department?: string } | null = null;
    try {
      const raw = localStorage.getItem("neuron_user");
      if (raw) user = JSON.parse(raw);
    } catch {
      user = null;
    }
    if (!user?.id) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("X-User-Id", user.id);
    if (user.name) headers.set("X-User-Name", encodeURIComponent(user.name));
    if (user.department) headers.set("X-User-Department", encodeURIComponent(user.department));

    return originalFetch(input, { ...init, headers });
  };
}
