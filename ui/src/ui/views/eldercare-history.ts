import { html, nothing } from "lit";

import type { EldercareHistoryDay } from "../controllers/eldercare";
import { icons } from "../icons";
import { t } from "../i18n";

export type EldercareHistoryProps = {
  loading: boolean;
  history: EldercareHistoryDay[];
  onRefresh: () => void;
};

function levelClass(level: string): string {
  switch (level) {
    case "emergency": return "ec-level--emergency";
    case "warning": return "ec-level--warning";
    case "attention": return "ec-level--attention";
    default: return "ec-level--normal";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "Hôm nay";
    if (diff === 1) return "Hôm qua";
    return d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
  } catch {
    return dateStr;
  }
}

export function renderEldercareHistory(props: EldercareHistoryProps) {
  const tr = t().eldercare;

  return html`
    <div class="ec-dashboard">
      <div class="ec-actions">
        <button class="btn btn--ghost btn--sm" @click=${props.onRefresh} ?disabled=${props.loading}>
          ${props.loading ? tr.refreshing : t().common.refresh}
        </button>
      </div>

      <div class="ec-history-timeline">
        ${props.history.length > 0
          ? props.history.map(day => html`
              <details class="ec-history-day">
                <summary class="ec-history-day__header">
                  <span class="ec-history-day__date">${formatDate(day.date)}</span>
                  <span class="ec-history-day__stats">
                    <span class="ec-level-badge ${levelClass(day.maxLevel)}">${(tr.levels as Record<string, string>)[day.maxLevel] ?? day.maxLevel}</span>
                    <span class="ec-text--muted">${day.checksCount} ${tr.checksToday?.toLowerCase?.() ?? "checks"}</span>
                    ${day.sosEvents.length > 0 ? html`<span class="ec-badge ec-badge--warn">SOS: ${day.sosEvents.length}</span>` : nothing}
                  </span>
                </summary>
                <div class="ec-history-day__body">
                  ${day.healthEntries.length > 0 ? html`
                    <div class="ec-history-section">
                      <strong>${tr.healthLog}</strong>
                      ${day.healthEntries.map(e => html`
                        <div class="ec-stat-row">
                          <span class="ec-stat-label">${e.type}</span>
                          <span class="ec-stat-value">${e.value} ${e.unit}</span>
                        </div>
                      `)}
                    </div>
                  ` : nothing}
                  ${day.sosEvents.length > 0 ? html`
                    <div class="ec-history-section">
                      <strong>${tr.sosEventsToday}</strong>
                      ${day.sosEvents.map(ev => html`
                        <div class="ec-stat-row">
                          <span class="ec-stat-label">${ev.source} (Level ${ev.escalationLevel})</span>
                          <span class="ec-stat-value ${ev.resolved ? "ec-text--ok" : "ec-text--danger"}">
                            ${ev.resolved ? tr.resolved : tr.sosActiveShort}
                          </span>
                        </div>
                      `)}
                    </div>
                  ` : nothing}
                  ${day.healthEntries.length === 0 && day.sosEvents.length === 0 ? html`
                    <div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noHealthData}</div></div>
                  ` : nothing}
                </div>
              </details>
            `)
          : html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noHealthData}</div></div>`}
      </div>
    </div>
  `;
}
