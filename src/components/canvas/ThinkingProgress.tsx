"use client";
import { useEffect, useState } from "react";

export function ThinkingProgress({
  initial,
  stage,
}: {
  initial: boolean;
  stage?: string | null;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  let label = "正在更新判断";
  if (initial) {
    label = "正在理解任务";
  } else if (stage === "state_confirmed" || stage === "routes") {
    label = "正在生成 3 条探索路线";
  } else if (stage === "route_selected" || stage === "step_active") {
    label = "正在推荐搜索平台与关键词";
  }

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
        {label}
        <span aria-hidden> · {seconds} 秒</span>
      </span>
    </div>
  );
}
