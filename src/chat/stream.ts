// src/chat/stream.ts
import { StreamChat, Channel } from "stream-chat";

let client: StreamChat | null = null;

export function getStreamClient() {
  if (!client) {
    // injecté par Edge `chat-token`
    // @ts-ignore
    const API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY || ""; 
    client = StreamChat.getInstance(API_KEY);
  }
  return client!;
}

export async function connectStreamUser(params: {
  user: { id: string; name?: string; image?: string };
  token: string;
}) {
  const c = getStreamClient();
  if (c.userID) return c;
  await c.connectUser(params.user, params.token);
  return c;
}

export function deterministicChannelIdFor1to1(a: string | number, b: string | number) {
  const arr = [String(a), String(b)].sort();
  return `conv_${arr[0]}_${arr[1]}`;
}
