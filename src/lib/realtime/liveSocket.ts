"use client";

import Pusher, { type Channel } from "pusher-js";

export type LiveSocketConfig = {
  authEndpoint: string;
  authToken: string;
  channelName: string;
  key: string;
  host: string;
  port: number;
  scheme: string;
  useTls: boolean;
};

export type LiveSocket = {
  channel: Channel;
  disconnect: () => void;
};

export function createLiveSocket(config: LiveSocketConfig): LiveSocket {
  const pusher = new Pusher(config.key, {
    cluster: "",
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.useTls || config.scheme === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: config.authEndpoint,
    auth: {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.authToken}`,
      },
    },
  });

  const channel = pusher.subscribe(config.channelName);

  return {
    channel,
    disconnect: () => {
      pusher.unsubscribe(config.channelName);
      pusher.disconnect();
    },
  };
}
