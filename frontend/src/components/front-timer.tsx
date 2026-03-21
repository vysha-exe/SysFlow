"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/time";

type FrontTimerProps = {
  startIso: string;
};

export function FrontTimer({ startIso }: FrontTimerProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-sm font-medium text-violet-700">
      Fronting for{" "}
      {formatDuration(startIso, new Date(currentTime).toISOString())}
    </span>
  );
}
