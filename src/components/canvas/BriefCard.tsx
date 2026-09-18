"use client";

import { useVeriboxStore } from "@/lib/store";
import { useVeriboxActions } from "@/hooks/useVeriboxActions";

function TagEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-sm text-ink"
          >
            {v}
            <button
              type="button"
              aria-label={`删除 ${v}`}
              className="ml-1 text-muted hover:text-ink"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:border-accent hover:text-ink"
          onClick={() => {
            const next = window.prompt(`补充${label}`);
            if (next?.trim()) onChange([...values, next.trim()]);
          }}
        >
          + 补充
        </button>
      </div>
    </div>
  );
}

export function BriefCard() {
  const { brief, updateBriefField, goBack, userInitialIdea, setUserInitialIdea, loading } =
    useVeriboxStore();
  const { generateSchemes } = useVeriboxActions();
  if (!brief) return null;

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="card p-8 sm:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
          Project Brief Card
        </p>
        <h2 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          确认任务，然后去搜
        </h2>
        <p className="mt-2 text-sm text-muted">
          先确认这几项。下一步会给出 2–3 套搜索顺序，勾选一套就能复制关键词去网站搜。
        </p>

        <div className="mt-8 space-y-5">
          <Field
            label="Goal"
            value={brief.goal}
            onChange={(v) => updateBriefField("goal", v)}
          />
          <Field
            label="Target User"
            value={brief.targetUser}
            onChange={(v) => updateBriefField("targetUser", v)}
          />
          <TagEditor
            label="Known"
            values={brief.known}
            onChange={(v) => updateBriefField("known", v)}
          />
          <TagEditor
            label="Need to Explore"
            values={brief.unknown}
            onChange={(v) => updateBriefField("unknown", v)}
          />
          <TagEditor
            label="Avoid"
            values={brief.constraints}
            onChange={(v) => updateBriefField("constraints", v)}
          />
          <Field
            label="Deliverable"
            value={brief.deliverable}
            onChange={(v) => updateBriefField("deliverable", v)}
          />
          <Field
            label="已有感觉（可选）"
            value={userInitialIdea.join(" / ")}
            onChange={(v) =>
              setUserInitialIdea(
                v.split(/[\s,/、]+/).map((s) => s.trim()).filter(Boolean)
              )
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => void generateSchemes()}
          >
            {loading ? "正在生成搜索方案…" : "确认，生成搜索方案"}
          </button>
          <button type="button" className="btn-ghost" onClick={goBack}>
            返回修改 Brief
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-line bg-cream/60 px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
