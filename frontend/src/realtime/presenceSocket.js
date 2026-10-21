import { io } from "socket.io-client";
import { serverUrl } from "../redux/api.js";

export function connectPresenceSocket() {
  return io(serverUrl, {
    withCredentials: true,
    autoConnect: true,
  });
}
