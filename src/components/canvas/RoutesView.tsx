"use client";

import { useState } from "react";
import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";
import { RouteCard } from "./RouteCard";

export function RoutesView() {
  const { routes, recommendedRouteId, loading, goBack } = useVeriboxStore();
  const { chooseRoute } = useVeriboxActions();
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6 max-w-2xl">
        <h2 className="font-serif text-2xl text-ink sm:text-3xl">
          勾选一套搜索顺序
        </h2>
        <p className="mt-2 text-sm text-muted">
          不是三个风格方案。选一套后，按顺序去搜；中英文关键词可以直接复制。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            recommended={route.id === recommendedRouteId}
            selecting={loading && pendingId === route.id}
            onSelect={() => {
              setPendingId(route.id);
              void chooseRoute(route);
            }}
          />
        ))}
      </div>

      <button type="button" className="btn-ghost mt-6" onClick={goBack}>
        返回修改任务
      </button>
    </section>
  );
}
