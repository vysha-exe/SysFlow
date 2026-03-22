"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/time";

type FrontTimerProps = {
  startIso: string;
  /** Optional text size / color (default: text-sm font-medium text-primary). */
  className?: string;
};

export function FrontTimer({ startIso, className }: FrontTimerProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={className ?? "text-sm font-medium text-primary"}>
      Fronting for{" "}
      {formatDuration(startIso, new Date(currentTime).toISOString())}
    </span>
  );
}
