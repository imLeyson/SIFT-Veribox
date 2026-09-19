"use client";
import { useEffect, useState } from "react";
export function ThinkingProgress({ initial }: { initial: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 text-sm text-muted"
    >
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-accent"
        aria-hidden
      />
      <span>
        {initial ? "正在理解任务" : "正在更新判断"}
        <span aria-hidden> · {seconds} 秒</span>
      </span>
    </div>
  );
}
