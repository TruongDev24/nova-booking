"use client";

import { useContext } from "react";
import { SocketContext } from "@/components/providers/socket-provider";

export function useSocket() {
  return useContext(SocketContext);
}
