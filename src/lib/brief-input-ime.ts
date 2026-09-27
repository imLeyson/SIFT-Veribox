export type BriefInputImeState = {
  value: string;
  composing: boolean;
};

export type BriefInputImeEvent =
  | { type: "compositionstart" }
  | { type: "change"; value: string }
  | { type: "compositionend"; value: string };

export function applyBriefInputImeEvent(
  state: BriefInputImeState,
  event: BriefInputImeEvent,
): { state: BriefInputImeState; commit: string | null } {
  if (event.type === "compositionstart") {
    return {
      state: { ...state, composing: true },
      commit: null,
    };
  }

  if (event.type === "compositionend") {
    return {
      state: { value: event.value, composing: false },
      commit: event.value,
    };
  }

  return {
    state: { value: event.value, composing: state.composing },
    commit: state.composing ? null : event.value,
  };
}
