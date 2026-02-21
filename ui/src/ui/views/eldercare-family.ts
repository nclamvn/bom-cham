import { html, nothing } from "lit";

import type {
  AlertLevel,
  EldercareCheck,
  EldercareRoomData,
  EldercareDailySummary,
} from "../controllers/eldercare";
import { icons } from "../icons";
import { t } from "../i18n";

export type EldercareFamilyProps = {
  connected: boolean;
  room: EldercareRoomData;
  summary: EldercareDailySummary;
  sosActive: boolean;
  lastCheck: EldercareCheck | null;
  onRefresh: () => void;
  onCancelSos?: () => void;
};

function levelClass(level: AlertLevel): string {
  switch (level) {
    case "emergency": return "ec-level--emergency";
    case "warning": return "ec-level--warning";
    case "attention": return "ec-level--attention";
    default: return "ec-level--normal";
  }
}

function levelEmoji(level: AlertLevel): string {
  switch (level) {
    case "emergency": return "🚨";
    case "warning": return "⚠️";
    case "attention": return "👀";
    default: return "💚";
  }
}

function formatTemp(val: number | null): string {
  return val != null ? `${val.toFixed(1)}°C` : "—";
}

export function renderEldercareFamily(props: EldercareFamilyProps) {
  const tr = t().eldercare;
  const s = props.summary;
  const level = props.lastCheck?.level ?? "normal";
  const levelLabel = (tr.levels as Record<string, string>)[level] ?? level;

  const totalDoses = s.medications.reduce((sum, m) => sum + m.times.length, 0);
  const takenCount = s.medDoses.filter((d) => d.taken).length;
  const allTaken = totalDoses > 0 && takenCount >= totalDoses;

  const tempVal = props.room.temperature;
  const tempWarn = tempVal != null && (tempVal < 20 || tempVal > 35);
  const humidVal = props.room.humidity;

  return html`
    <div class="ec-fam">
      <!-- SOS Banner -->
      ${props.sosActive
        ? html`
            <div class="ec-sos-banner">
              <div class="ec-sos-banner__icon">${icons.bellRing}</div>
              <div class="ec-sos-banner__content">
                <div class="ec-sos-banner__text">${tr.sosActive}</div>
              </div>
              <button class="btn btn--danger btn--sm ec-sos-cancel"
                @click=${() => { if (confirm(tr.cancelSosConfirm ?? "Xác nhận hủy SOS?")) props.onCancelSos?.(); }}>
                ${tr.cancelSos ?? "Hủy SOS"}
              </button>
            </div>
          `
        : nothing}

      <!-- Hero status -->
      <div class="ec-fam__hero ${levelClass(level)}">
        <span class="ec-fam__hero-emoji">${levelEmoji(level)}</span>
        <span class="ec-fam__hero-label">${tr.careStatus}</span>
        <span class="ec-fam__hero-level">${levelLabel}</span>
        ${s.checksToday > 0
          ? html`<span class="ec-fam__hero-checks">${s.checksToday} ${tr.checksToday?.toLowerCase?.() ?? "lượt kiểm tra"}</span>`
          : nothing}
      </div>

      <!-- Info cards grid -->
      <div class="ec-fam__grid">
        <!-- Temperature -->
        <div class="ec-fam__tile ${tempWarn ? "ec-fam__tile--warn" : ""}">
          <div class="ec-fam__tile-icon">${icons.thermometer}</div>
          <div class="ec-fam__tile-value">${formatTemp(tempVal)}</div>
          <div class="ec-fam__tile-label">${tr.temperature}</div>
          ${tempWarn ? html`<div class="ec-fam__tile-alert">${tr.tempOutOfRange}</div>` : nothing}
        </div>

        <!-- Humidity -->
        <div class="ec-fam__tile">
          <div class="ec-fam__tile-icon">${icons.activity}</div>
          <div class="ec-fam__tile-value">${humidVal != null ? `${humidVal.toFixed(0)}%` : "—"}</div>
          <div class="ec-fam__tile-label">${tr.humidity}</div>
        </div>

        <!-- Medication -->
        <div class="ec-fam__tile ${!allTaken && totalDoses > 0 ? "ec-fam__tile--warn" : ""}">
          <div class="ec-fam__tile-icon">${icons.pill}</div>
          <div class="ec-fam__tile-value">${totalDoses > 0 ? `${takenCount}/${totalDoses}` : "—"}</div>
          <div class="ec-fam__tile-label">${tr.medication}</div>
          ${totalDoses > 0
            ? html`<div class="ec-fam__tile-status ${allTaken ? "ec-fam__tile-status--ok" : "ec-fam__tile-status--pending"}">
                ${allTaken ? (tr.familyMedTaken ?? "Đã uống đủ") : (tr.familyMedNotYet ?? "Chưa uống đủ")}
              </div>`
            : html`<div class="ec-fam__tile-status">${tr.noMedications}</div>`}
        </div>

        <!-- Presence -->
        <div class="ec-fam__tile">
          <div class="ec-fam__tile-icon">${icons.usersRound}</div>
          <div class="ec-fam__tile-value">${props.room.presence == null ? "—" : props.room.presence ? tr.inRoom : tr.noMotion}</div>
          <div class="ec-fam__tile-label">${tr.presence}</div>
        </div>
      </div>

      <!-- Video call CTA -->
      <button class="ec-fam__call-btn" @click=${() => {
        const input = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | null;
        if (input) {
          input.value = "gọi video";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }}>
        <span class="ec-fam__call-icon">${icons.phone}</span>
        <span class="ec-fam__call-text">${tr.familyVideoCall ?? "Gọi video"}</span>
      </button>

      <!-- Refresh -->
      <div class="ec-fam__footer">
        <button class="btn btn--ghost btn--sm" @click=${props.onRefresh}>
          ${t().common.refresh}
        </button>
        ${!props.connected
          ? html`<span class="ec-badge ec-badge--offline">${t().common.disconnected}</span>`
          : nothing}
      </div>
    </div>
  `;
}
