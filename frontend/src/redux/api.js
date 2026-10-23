const configuredServerUrl =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:8000");

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

export async function fetchContacts() {
  const result = await apiRequest("/api/users/contacts");
  return result.users;
}

export async function fetchConversationMessages(userId, before) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  const result = await apiRequest(
    `/api/v1/message/get/${encodeURIComponent(userId)}${query}`,
  );
  return result;
}

export async function sendConversationMessage(userId, message) {
  const result = await apiRequest(
    `/api/v1/message/send/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: JSON.stringify(message),
    },
  );
  return result.newMessage;
}

export async function deleteConversation(userId) {
  return apiRequest(
    `/api/v1/message/delete/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export async function deleteMessageForMe(userId, messageId) {
  return apiRequest(
    `/api/v1/message/${encodeURIComponent(userId)}/message/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}
