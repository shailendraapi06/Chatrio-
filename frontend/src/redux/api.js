const configuredServerUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

export const serverUrl = configuredServerUrl.replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${serverUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result.message || "Request failed. Please try again.");
    error.status = response.status;
    throw error;
  }

  return result;
}
