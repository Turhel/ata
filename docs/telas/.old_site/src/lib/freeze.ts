type FreezeState = {
  frozen: boolean;
  lastActivityAt: number;
  hasFocus: boolean;
  isHidden: boolean;
};

const IDLE_MS = 10_000;
const CHECK_MS = 250;

let started = false;
let timer: number | null = null;

let state: FreezeState = {
  frozen: false,
  lastActivityAt: Date.now(),
  hasFocus: true,
  isHidden: false,
};

const listeners = new Set<() => void>();
const resumeListeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function emitResume() {
  for (const l of resumeListeners) l();
}

function setFrozen(next: boolean) {
  if (state.frozen === next) return;
  state = { ...state, frozen: next };
  emit();
  if (!next) emitResume();
}

function bumpActivity() {
  const now = Date.now();
  state = { ...state, lastActivityAt: now };

  // If the document is hidden or does not have focus, we must keep the app frozen.
  // Otherwise, pointer movement over the page (while focus is elsewhere, e.g. DevTools)
  // can cause rapid freeze/unfreeze oscillation and trigger request storms via onAppResume.
  if (state.frozen) {
    if (state.isHidden || !state.hasFocus) {
      emit();
      return;
    }
    setFrozen(false);
    return;
  }
  else emit();
}

function checkIdle() {
  const now = Date.now();
  if (state.isHidden || !state.hasFocus) {
    setFrozen(true);
    return;
  }
  const shouldFreeze = now - state.lastActivityAt >= IDLE_MS;
  setFrozen(shouldFreeze);
}

export function startFreezeManager() {
  if (started) return;
  started = true;

  if (typeof window === "undefined") return;

  state = {
    ...state,
    hasFocus: document.hasFocus?.() ?? true,
    isHidden: document.hidden ?? false,
  };

  // NOTE: We intentionally do NOT toggle the document cursor (e.g. "wait") here.
  // It causes a visible flicker (cursor alternates between wait/default) and looks like a bug.

  const onActivity = () => bumpActivity();
  const opts: AddEventListenerOptions = { capture: true, passive: true };

  window.addEventListener("pointerdown", onActivity, opts);
  window.addEventListener("pointermove", onActivity, opts);
  window.addEventListener("keydown", onActivity, opts);
  window.addEventListener("scroll", onActivity, opts);
  window.addEventListener("wheel", onActivity, opts);
  window.addEventListener("touchstart", onActivity, opts);

  window.addEventListener(
    "visibilitychange",
    () => {
      state = { ...state, isHidden: document.hidden };
      if (document.hidden) setFrozen(true);
      else bumpActivity();
    },
    { capture: true }
  );

  window.addEventListener(
    "blur",
    () => {
      state = { ...state, hasFocus: false };
      setFrozen(true);
    },
    { capture: true }
  );

  window.addEventListener(
    "focus",
    () => {
      state = { ...state, hasFocus: true };
      bumpActivity();
    },
    { capture: true }
  );

  timer = window.setInterval(checkIdle, CHECK_MS);
  checkIdle();
}

export function isFrozen() {
  return state.frozen;
}

export function getFreezeState(): FreezeState {
  return state;
}

export function subscribeFreeze(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onAppResume(listener: () => void) {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}

export async function waitUntilActive(opts?: { signal?: AbortSignal }) {
  if (!state.frozen) return;

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new Error("Aborted while waiting for user interaction"));
    };
    const offResume = onAppResume(() => {
      cleanup();
      resolve();
    });
    const cleanup = () => {
      offResume();
      opts?.signal?.removeEventListener("abort", onAbort);
    };

    if (opts?.signal?.aborted) return onAbort();
    opts?.signal?.addEventListener("abort", onAbort, { once: true });
  });
}
