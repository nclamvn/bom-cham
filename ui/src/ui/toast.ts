import { html, nothing, type TemplateResult } from "lit";
import { icons } from "./icons";

export type ToastLevel = "error" | "warning" | "success" | "info";

export type ToastAction = {
  label: string;
  callback: () => void;
};

export type ToastItem = {
  id: number;
  level: ToastLevel;
  message: string;
  dismissMs: number;
  createdAt: number;
  exiting?: boolean;
  action?: ToastAction;
};

let nextId = 1;
let items: ToastItem[] = [];
let listeners: Array<(items: ToastItem[]) => void> = [];

function notify() {
  const snapshot = [...items];
  for (const fn of listeners) fn(snapshot);
}

export function addToast(level: ToastLevel, message: string, dismissMs = 8000, action?: ToastAction) {
  // Deduplicate: if same message already showing, skip
  if (items.some((t) => t.message === message && !t.exiting)) return;
  const id = nextId++;
  const item: ToastItem = { id, level, message, dismissMs, createdAt: Date.now(), action };
  items = [...items, item];
  notify();
  if (dismissMs > 0) {
    setTimeout(() => dismissToast(id), dismissMs);
  }
}

export function dismissToast(id: number) {
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return;
  // Mark as exiting for animation
  items = items.map((t) => (t.id === id ? { ...t, exiting: true } : t));
  notify();
  // Remove after animation
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    notify();
  }, 300);
}

export function subscribeToasts(fn: (items: ToastItem[]) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

const LEVEL_ICON: Record<ToastLevel, TemplateResult> = {
  error: icons.alertCircle,
  warning: icons.alertTriangle,
  success: icons.checkCircle,
  info: icons.info,
};

export function renderToasts(toasts: ToastItem[]): TemplateResult | typeof nothing {
  if (toasts.length === 0) return nothing;
  return html`
    <div class="toast-container">
      ${toasts.map(
        (t) => html`
          <div
            class="toast toast-${t.level} ${t.exiting ? "toast-exit" : ""}"
            role="alert"
          >
            <span class="toast-icon">${LEVEL_ICON[t.level]}</span>
            <span class="toast-content">
              <span class="toast-message">${t.message}</span>
              ${t.action ? html`
                <button class="toast-action" type="button" @click=${() => { t.action!.callback(); dismissToast(t.id); }}>
                  ${t.action.label}
                </button>
              ` : nothing}
            </span>
            <button
              class="toast-close"
              type="button"
              @click=${() => dismissToast(t.id)}
            >
              ${icons.x}
            </button>
          </div>
        `,
      )}
    </div>
  `;
}
