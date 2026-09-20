"use client";
import { useEffect, useState } from "react";
import { useSiftStore } from "@/lib/convergence-store";

export function ThinkingProgress({
  initial,
  stage,
}: {
  initial: boolean;
  stage?: string | null;
}) {
  const [seconds, setSeconds] = useState(0);
  const { briefImages } = useSiftStore();

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  let label = "正在对齐判断与更新状态";
  const hasImages = briefImages && briefImages.length > 0;

  if (initial) {
    if (hasImages) {
      if (seconds < 3) {
        label = `正在解构 ${briefImages.length} 张参考图的色彩与排版`;
      } else if (seconds < 6) {
        label = "正在逆向提炼具象视觉关键词与材质感知";
      } else {
        label = "正在对齐图文意向，构建关键设计分水岭";
      }
    } else {
      if (seconds < 3) {
        label = "正在分析设计简报与明确约束";
      } else {
        label = "正在提炼核心视觉取向与设计假设";
      }
    }
  } else if (stage === "state_confirmed" || stage === "routes") {
    label = seconds < 3 ? "正在推导 3 条风格迥异的探索路线" : "正在梳理各路线关键突破口";
  } else if (stage === "route_selected" || stage === "step_active") {
    label = seconds < 3 ? "正在规划搜索平台与专业检索式" : "正在过滤低质样机，匹配标杆案例";
  } else {
    label = seconds < 3 ? "正在分析你的选择偏好" : "正在收敛视觉状态并刷新设计假设";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 text-xs text-stone-600 font-medium"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span>
        {label}
        <span className="text-stone-400 font-normal"> · {seconds}s</span>
      </span>
    </div>
  );
}
