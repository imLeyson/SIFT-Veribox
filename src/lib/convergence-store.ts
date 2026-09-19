"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { z } from "zod";
import {
  AnswerSchema,
  DesignStateSchema,
  HistoryEntrySchema,
  NextSchema,
  TurnPayloadSchema,
  TurnResultSchema,
} from "./agent/convergence-schema";
import {
  hasDirection,
  type Answer,
  type TurnResult,
} from "@/types/convergence";

export const STORAGE_KEY = "sift-convergence-v1";
const SessionSchema = z
  .object({
    sessionId: z.string().min(1),
    rawBrief: z.string().max(10000),
    state: DesignStateSchema.nullable(),
    next: NextSchema.nullable(),
    history: z.array(HistoryEntrySchema),
    draft: AnswerSchema.nullable(),
    correctionDraft: z.string(),
    importedBrief: z.boolean(),
    positions: z.record(
      z.string(),
      z.object({ x: z.number().finite(), y: z.number().finite() }),
    ),
    mode: z.enum(["live", "mock"]).nullable(),
    model: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.state &&
        !TurnPayloadSchema.safeParse({ state: value.state, next: value.next })
          .success) ||
      (!value.state && value.next)
    ) {
      ctx.addIssue({ code: "custom", message: "会话状态损坏" });
    }
  });
type Session = z.infer<typeof SessionSchema>;
type RequestToken = { id: string; sessionId: string; revision: number };
type SiftStore = Session & {
  activeRequest: RequestToken | null;
  error: string | null;
  storageWarning: string | null;
  setRawBrief: (text: string) => void;
  setDraft: (answer: Answer | null) => void;
  setCorrectionDraft: (text: string) => void;
  setPosition: (id: string, position: { x: number; y: number }) => void;
  setError: (text: string | null) => void;
  beginRequest: () => RequestToken | null;
  cancelRequest: () => void;
  failRequest: (id: string, error: string) => void;
  commitTurn: (response: TurnResult) => boolean;
  enterCheckpoint: () => void;
  confirm: () => void;
  reset: () => void;
};
function emptySession(): Session {
  return {
    sessionId: crypto.randomUUID(),
    rawBrief: "",
    state: null,
    next: null,
    history: [],
    draft: null,
    correctionDraft: "",
    importedBrief: false,
    positions: {},
    mode: null,
    model: null,
  };
}

export function createSiftStore(providedStorage?: StateStorage) {
  let readWarning: string | null = null;
  const storage = createJSONStorage<Session>(() => ({
    getItem: async (name) => {
      try {
        const target = providedStorage ?? localStorage;
        const stored = await target.getItem(name);
        if (stored !== null) {
          JSON.parse(stored); // Recover malformed JSON before Zustand's decoder.
          return stored;
        }
        const old = await target.getItem("sift-agent-v1");
        if (!old) return null;
        const legacy = JSON.parse(old);
        const rawBrief =
          typeof legacy?.state?.rawBrief === "string"
            ? legacy.state.rawBrief.slice(0, 10000)
            : "";
        return JSON.stringify({
          state: {
            ...emptySession(),
            rawBrief,
            importedBrief: Boolean(rawBrief),
          },
          version: 1,
        });
      } catch {
        readWarning = "本地记录无法读取，已打开空白会话。";
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await (providedStorage ?? localStorage).setItem(name, value);
      } catch {
        const warning = "浏览器未能保存记录，请暂时不要刷新页面。";
        if (useStore.getState().storageWarning !== warning)
          useStore.setState({ storageWarning: warning });
      }
    },
    removeItem: async (name) => {
      await (providedStorage ?? localStorage).removeItem(name);
    },
  }));
  const useStore = create<SiftStore>()(
    persist(
      (set, get) => ({
        ...emptySession(),
        activeRequest: null,
        error: null,
        storageWarning: null,
        setRawBrief: (rawBrief) =>
          set({ rawBrief, error: null, importedBrief: false }),
        setDraft: (draft) => set({ draft }),
        setCorrectionDraft: (correctionDraft) => set({ correctionDraft }),
        setPosition: (id, position) =>
          set({ positions: { ...get().positions, [id]: position } }),
        setError: (error) => set({ error }),
        beginRequest: () => {
          if (get().activeRequest) return null;
          const token = {
            id: crypto.randomUUID(),
            sessionId: get().sessionId,
            revision: get().state?.revision ?? 0,
          };
          set({ activeRequest: token, error: null });
          return token;
        },
        cancelRequest: () => set({ activeRequest: null, error: null }),
        failRequest: (id, error) => {
          if (get().activeRequest?.id === id)
            set({ activeRequest: null, error });
        },
        commitTurn: (response) => {
          const s = get();
          const token = s.activeRequest;
          if (
            !token ||
            token.id !== response.requestId ||
            token.sessionId !== response.sessionId ||
            s.sessionId !== response.sessionId ||
            token.revision !== response.baseRevision ||
            (s.state?.revision ?? 0) !== response.baseRevision
          )
            return false;
          const parsed = TurnResultSchema.safeParse(response);
          if (
            !parsed.success ||
            response.state.revision !== response.baseRevision + 1 ||
            response.state.status === "confirmed"
          )
            throw new Error("响应状态无效，请重试");
          set({
            state: response.state,
            next: response.next,
            history: response.history,
            mode: response.mode,
            model: response.model,
            activeRequest: null,
            error: null,
            draft: null,
            correctionDraft: "",
            importedBrief: false,
          });
          return true;
        },
        enterCheckpoint: () => {
          const state = get().state;
          if (!state || state.status === "confirmed") return;
          set({
            state: {
              ...state,
              status: "checkpoint",
              revision: state.revision + 1,
            },
            next: { type: "checkpoint", reason: "user_requested" },
            activeRequest: null,
            error: null,
          });
        },
        confirm: () => {
          const state = get().state;
          if (!state || state.status !== "checkpoint" || !hasDirection(state))
            return;
          set({
            state: {
              ...state,
              status: "confirmed",
              revision: state.revision + 1,
            },
            activeRequest: null,
            error: null,
          });
        },
        reset: () =>
          set({ ...emptySession(), activeRequest: null, error: null }),
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        storage,
        skipHydration: true,
        partialize: ({
          sessionId,
          rawBrief,
          state,
          next,
          history,
          draft,
          correctionDraft,
          importedBrief,
          positions,
          mode,
          model,
        }) => ({
          sessionId,
          rawBrief,
          state,
          next,
          history,
          draft,
          correctionDraft,
          importedBrief,
          positions,
          mode,
          model,
        }),
        merge: (saved, current) => {
          if (!saved) return { ...current, storageWarning: readWarning };
          const parsed = SessionSchema.safeParse(saved);
          return parsed.success
            ? { ...current, ...parsed.data }
            : {
                ...current,
                storageWarning: "本地记录格式不兼容，已打开空白会话。",
              };
        },
      },
    ),
  );
  return useStore;
}

export const useSiftStore = createSiftStore();
