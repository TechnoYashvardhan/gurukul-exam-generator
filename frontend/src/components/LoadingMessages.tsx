"use client";

import React from "react";

interface LoadingMessagesProps {
  message?: string;
}

export function LoadingMessages({
  message = "The Guru is composing your examination...",
}: LoadingMessagesProps) {
  return <p className="lotus-loader__text">{message}</p>;
}
