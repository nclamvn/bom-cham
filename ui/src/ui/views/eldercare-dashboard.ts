import { html, nothing } from "lit";

import type {
  AlertLevel,
  EldercareCall,
  EldercareCheck,
  EldercareRoomData,
  EldercareDailySummary,
  EldercareSosEvent,
  EldercareHealthEntry,
  EldercareMedication,
  EldercareMedDose,
  EldercareSleepData,
  EldercareExerciseData,
  EldercareWeatherData,
  EldercareVisitorEntry,
  EldercareMultiRoomData,
  EldercareFallEvent,
  EldercareQueueStatus,
  EldercareEmergencyInfo,
} from "../controllers/eldercare";
import { icons } from "../icons";
import { t } from "../i18n";

export type EldercareDashboardProps = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  haConnected: boolean;
  room: EldercareRoomData;
  summary: EldercareDailySummary;
  lastCheck: EldercareCheck | null;
  sosActive: boolean;
  onRefresh: () => void;
  onCancelSos?: () => void;
  onExportHealth?: () => void;
  // Elder profile switcher (P1-1)
  elderProfiles?: Array<{ id: string; name: string }>;
  activeProfileId?: string;
  onProfileChange?: (id: string) => void;
};

function levelClass(level: AlertLevel): string {
  switch (level) {
    case "emergency":
      return "ec-level--emergency";
    case "warning":
      return "ec-level--warning";
    case "attention":
      return "ec-level--attention";
    default:
      return "ec-level--normal";
  }
}

function levelLabel(level: AlertLevel): string {
  const labels = t().eldercare.levels;
  return labels[level] ?? level;
}

function formatTemp(val: number | null): string {
  return val != null ? `${val.toFixed(1)}°C` : "—";
}

function formatHumidity(val: number | null): string {
  return val != null ? `${val.toFixed(0)}%` : "—";
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatSosElapsed(startIso: string): string {
  try {
    const diff = Date.now() - new Date(startIso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "< 1 phút";
    return `${minutes} phút`;
  } catch {
    return "";
  }
}

// ── SVG Sparkline ───────────────────────────────────
function renderSparkline(values: number[], width = 60, height = 20) {
  if (values.length < 2) return nothing;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return html`
    <svg class="ec-sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// ── Fall Detection Card (P2-6) ──────────────────────
function renderFallCard(fallEvent: EldercareFallEvent | null) {
  const tr = t().eldercare;
  if (!fallEvent) return nothing;
  const isToday = fallEvent.timestamp.includes(new Date().toISOString().slice(0, 10));
  if (!isToday) return nothing;

  return html`
    <div class="ec-card ${fallEvent.escalated ? "ec-card--danger" : ""}">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.shieldAlert}</span>
        <span class="ec-card__title">${tr.fallDetected ?? "Phát hiện ngã"}</span>
      </div>
      <div class="ec-card__body">
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.fallDetection}</span>
          <span class="ec-stat-value ${fallEvent.escalated ? "ec-text--danger" : "ec-text--ok"}">
            ${fallEvent.result === "confirmed_ok" ? tr.fallOk : tr.fallEscalated}
          </span>
        </div>
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.sosTime ?? "Thời gian"}</span>
          <span class="ec-stat-value">${formatTime(fallEvent.timestamp)}</span>
        </div>
        <div class="ec-stat-row">
          <span class="ec-stat-label">Source</span>
          <span class="ec-stat-value ec-text--muted">${fallEvent.source}</span>
        </div>
      </div>
    </div>
  `;
}

// ── Health Card ──────────────────────────────────────
function renderHealthCard(entries: EldercareHealthEntry[], onExport?: () => void) {
  const tr = t().eldercare;
  const typeLabels: Record<string, string> = {
    blood_pressure: tr.healthBP, glucose: tr.healthGlucose,
    heart_rate: tr.healthHR, temperature: tr.healthTemp,
    spo2: tr.healthSpO2, weight: tr.healthWeight,
  };
  const latest = new Map<string, EldercareHealthEntry>();
  for (const e of entries) {
    if (!latest.has(e.type) || e.timestamp > (latest.get(e.type)!.timestamp)) latest.set(e.type, e);
  }

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.activity}</span>
        <span class="ec-card__title">${tr.healthLog}</span>
        ${onExport && latest.size > 0 ? html`
          <button class="btn btn--ghost btn--xs" @click=${onExport} title="${tr.exportData ?? "Xuất dữ liệu"}">
            CSV
          </button>
        ` : nothing}
      </div>
      <div class="ec-card__body">
        ${latest.size > 0
          ? html`${Array.from(latest.values()).map(
              (e) => html`
                <div class="ec-stat-row">
                  <span class="ec-stat-label">${typeLabels[e.type] ?? e.type}</span>
                  <span class="ec-stat-value ${e.status === "high" || e.status === "dangerous" ? "ec-text--danger" : e.status === "low" ? "ec-text--warn" : ""}">
                    ${e.value} ${e.unit}
                  </span>
                </div>
              `,
            )}`
          : html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noHealthData}</div></div>`}
      </div>
    </div>
  `;
}

// ── Medication Card ──────────────────────────────────
function renderMedicationCard(medications: EldercareMedication[], doses: EldercareMedDose[]) {
  const tr = t().eldercare;
  const totalDoses = medications.reduce((sum, m) => sum + m.times.length, 0);
  const takenCount = doses.filter((d) => d.taken).length;

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.pill}</span>
        <span class="ec-card__title">${tr.medication}</span>
      </div>
      <div class="ec-card__body">
        ${medications.length > 0
          ? html`
              <div class="ec-stat-row">
                <span class="ec-stat-label">${tr.medAdherence}</span>
                <span class="ec-stat-value ${takenCount < totalDoses ? "ec-text--warn" : "ec-text--ok"}">
                  ${takenCount}/${totalDoses}
                </span>
              </div>
              ${medications.map(
                (med) => html`
                  <div class="ec-stat-row">
                    <span class="ec-stat-label">${med.shortName || med.name}</span>
                    <span class="ec-stat-value ec-text--muted">${med.times.join(", ")}</span>
                  </div>
                `,
              )}
            `
          : html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noMedications}</div></div>`}
      </div>
    </div>
  `;
}

// ── Sleep Card ───────────────────────────────────────
function renderSleepCard(sleep: EldercareSleepData) {
  const tr = t().eldercare;
  const qualityClass = sleep.quality === "good" ? "ec-text--ok" : sleep.quality === "poor" ? "ec-text--danger" : "";
  const qualityLabel = sleep.quality ? (tr.sleepQualities as Record<string, string>)[sleep.quality] ?? sleep.quality : "—";
  const trendIcon = sleep.trend === "improving" ? "↑" : sleep.trend === "declining" ? "↓" : "→";

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.moon}</span>
        <span class="ec-card__title">${tr.sleepTracker}</span>
      </div>
      <div class="ec-card__body">
        <div class="ec-sensor-grid">
          <div class="ec-sensor">
            <div class="ec-sensor__value">${sleep.totalHours != null ? sleep.totalHours.toFixed(1) : "—"}</div>
            <div class="ec-sensor__label">${tr.sleepHours}</div>
          </div>
          <div class="ec-sensor">
            <div class="ec-sensor__value ${qualityClass}">${qualityLabel}</div>
            <div class="ec-sensor__label">${tr.sleepQuality}</div>
          </div>
          <div class="ec-sensor">
            <div class="ec-sensor__value">${sleep.wakeEvents}</div>
            <div class="ec-sensor__label">${tr.sleepWakes}</div>
          </div>
        </div>
        ${sleep.avg7day != null
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.sleepAvg7d}</span>
              <span class="ec-stat-value">${sleep.avg7day.toFixed(1)}h ${trendIcon}</span>
            </div>`
          : nothing}
      </div>
    </div>
  `;
}

// ── Exercise Card ────────────────────────────────────
function renderExerciseCard(exercise: EldercareExerciseData) {
  const tr = t().eldercare;
  const levelLabels: Record<number, string> = { 1: tr.exerciseLevel1, 2: tr.exerciseLevel2, 3: tr.exerciseLevel3 };

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.dumbbell}</span>
        <span class="ec-card__title">${tr.exercise}</span>
      </div>
      <div class="ec-card__body">
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.exerciseToday}</span>
          <span class="ec-stat-value ${exercise.completedToday ? "ec-text--ok" : "ec-text--muted"}">
            ${exercise.completedToday ? tr.exerciseDone : tr.exerciseNotYet}
          </span>
        </div>
        ${exercise.level != null
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.exerciseLevel}</span>
              <span class="ec-stat-value">${levelLabels[exercise.level] ?? exercise.level}</span>
            </div>`
          : nothing}
        ${exercise.durationMin != null
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.exerciseDuration}</span>
              <span class="ec-stat-value">${exercise.durationMin} ${tr.exerciseMin}</span>
            </div>`
          : nothing}
      </div>
    </div>
  `;
}

// ── Weather Card ─────────────────────────────────────
function renderWeatherCard(weather: EldercareWeatherData) {
  const tr = t().eldercare;

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.cloudSun}</span>
        <span class="ec-card__title">${tr.weatherAlert}</span>
      </div>
      <div class="ec-card__body">
        <div class="ec-sensor-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="ec-sensor">
            <div class="ec-sensor__value">${weather.outdoorTemp != null ? `${weather.outdoorTemp}°C` : "—"}</div>
            <div class="ec-sensor__label">${tr.weatherOutdoor}</div>
          </div>
          <div class="ec-sensor">
            <div class="ec-sensor__value">${weather.outdoorHumidity != null ? `${weather.outdoorHumidity}%` : "—"}</div>
            <div class="ec-sensor__label">${tr.humidity}</div>
          </div>
        </div>
        ${weather.conditions.length > 0
          ? html`<div class="ec-env-warn">${weather.conditions.join(", ")}</div>`
          : html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.weatherStatus}</span>
              <span class="ec-stat-value ec-text--ok">${tr.weatherNormal}</span>
            </div>`}
      </div>
    </div>
  `;
}

// ── Visitors Card ────────────────────────────────────
function renderVisitorCard(visitors: EldercareVisitorEntry[], active: boolean) {
  const tr = t().eldercare;

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.usersRound}</span>
        <span class="ec-card__title">${tr.visitorLog}</span>
        ${active ? html`<span class="ec-badge ec-badge--ok">${tr.visitorHere}</span>` : nothing}
      </div>
      <div class="ec-card__body">
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.visitorsToday}</span>
          <span class="ec-stat-value">${visitors.length}</span>
        </div>
        ${visitors.length > 0
          ? html`<div class="ec-calls-list">
              ${visitors.slice(0, 5).map(
                (v) => html`
                  <div class="ec-call-item">
                    <span class="ec-call-caller">${v.count ? `${v.count} ${tr.visitorPeople}` : tr.visitorVisit}</span>
                    <span class="ec-call-time">${v.start ? formatTime(v.start) : ""}${v.durationMin ? ` (${v.durationMin}m)` : ""}</span>
                  </div>
                `,
              )}
            </div>`
          : html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noVisitors}</div></div>`}
      </div>
    </div>
  `;
}

// ── Safety Card (fall detect + multi-room + queue) ───
function renderSafetyCard(
  multiRoom: EldercareMultiRoomData,
  fallEvent: EldercareFallEvent | null,
  queue: EldercareQueueStatus,
) {
  const tr = t().eldercare;
  const roomLabels: Record<string, string> = {
    bedroom: tr.roomBedroom, bathroom: tr.roomBathroom, wc: tr.roomBathroom,
    living_room: tr.roomLiving, kitchen: tr.roomKitchen,
  };

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.shieldAlert}</span>
        <span class="ec-card__title">${tr.safety}</span>
        ${queue.pending > 0 ? html`<span class="ec-badge ec-badge--warn">${queue.pending} ${tr.queuePending}</span>` : nothing}
      </div>
      <div class="ec-card__body">
        <!-- Multi-room -->
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.currentRoom}</span>
          <span class="ec-stat-value">
            ${multiRoom.currentRoom ? (roomLabels[multiRoom.currentRoom] ?? multiRoom.currentRoom) : "—"}
          </span>
        </div>
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.bathroomVisits}</span>
          <span class="ec-stat-value">${multiRoom.bathroomVisitsToday}</span>
        </div>
        <!-- Fall detection -->
        <div class="ec-stat-row">
          <span class="ec-stat-label">${tr.fallDetection}</span>
          <span class="ec-stat-value ${fallEvent?.escalated ? "ec-text--danger" : "ec-text--ok"}">
            ${fallEvent
              ? `${fallEvent.result === "confirmed_ok" ? tr.fallOk : tr.fallEscalated} (${fallEvent.source})`
              : tr.fallNone}
          </span>
        </div>
        <!-- Offline queue -->
        ${queue.failed > 0
          ? html`<div class="ec-env-warn">${queue.failed} ${tr.queueFailed}</div>`
          : nothing}
      </div>
    </div>
  `;
}

// ── Emergency Info Card ──────────────────────────────
function renderEmergencyCard(emergency: EldercareEmergencyInfo) {
  const tr = t().eldercare;
  const hasData = emergency.nearestHospital || emergency.familyDoctor || emergency.bloodType;
  if (!hasData) return nothing;

  return html`
    <div class="ec-card">
      <div class="ec-card__header">
        <span class="ec-card__icon">${icons.siren}</span>
        <span class="ec-card__title">${tr.emergencyInfo}</span>
      </div>
      <div class="ec-card__body">
        ${emergency.nearestHospital
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.emergencyHospital}</span>
              <span class="ec-stat-value">${emergency.nearestHospital}</span>
            </div>`
          : nothing}
        ${emergency.hospitalPhone
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.emergencyPhone}</span>
              <span class="ec-stat-value">${emergency.hospitalPhone}</span>
            </div>`
          : nothing}
        ${emergency.bloodType
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.emergencyBloodType}</span>
              <span class="ec-stat-value">${emergency.bloodType}</span>
            </div>`
          : nothing}
        ${emergency.allergies.length > 0
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.emergencyAllergies}</span>
              <span class="ec-stat-value ec-text--warn">${emergency.allergies.join(", ")}</span>
            </div>`
          : nothing}
        ${emergency.conditions.length > 0
          ? html`<div class="ec-stat-row">
              <span class="ec-stat-label">${tr.emergencyConditions}</span>
              <span class="ec-stat-value">${emergency.conditions.join(", ")}</span>
            </div>`
          : nothing}
      </div>
    </div>
  `;
}

// ── Main Dashboard ───────────────────────────────────

export function renderEldercareDashboard(props: EldercareDashboardProps) {
  const tr = t().eldercare;
  const s = props.summary;

  return html`
    <div class="ec-dashboard">
      <!-- SOS Banner (if active) with escalation progress -->
      ${props.sosActive
        ? html`
            <div class="ec-sos-banner">
              <div class="ec-sos-banner__icon">${icons.bellRing}</div>
              <div class="ec-sos-banner__content">
                <div class="ec-sos-banner__text">${tr.sosActive}</div>
                ${s.sosLevel > 0 ? html`
                  <div class="ec-sos-progress">
                    <span class="ec-sos-progress__step ${s.sosLevel >= 1 ? "ec-sos-progress__step--done" : ""}">
                      ${tr.sosLevel1 ?? "Level 1: Zalo"} ${s.sosLevel >= 1 ? "✓" : ""}
                    </span>
                    <span class="ec-sos-progress__arrow">→</span>
                    <span class="ec-sos-progress__step ${s.sosLevel >= 2 ? "ec-sos-progress__step--done" : ""} ${s.sosLevel === 2 ? "ec-sos-progress__step--active" : ""}">
                      ${tr.sosLevel2 ?? "Level 2: Gọi điện"} ${s.sosLevel >= 2 ? "✓" : s.sosLevel === 2 ? "..." : ""}
                    </span>
                    <span class="ec-sos-progress__arrow">→</span>
                    <span class="ec-sos-progress__step ${s.sosLevel >= 3 ? "ec-sos-progress__step--done" : ""}">
                      ${tr.sosLevel3 ?? "Level 3: Tất cả"} ${s.sosLevel >= 3 ? "✓" : ""}
                    </span>
                  </div>
                ` : nothing}
                ${s.sosContactsNotified.length > 0 ? html`
                  <div class="ec-sos-banner__contacts">${tr.sosNotified ?? "Đã thông báo"}: ${s.sosContactsNotified.join(", ")}</div>
                ` : nothing}
                ${s.sosStartedAt ? html`
                  <div class="ec-sos-banner__time">${tr.sosTime ?? "Thời gian"}: ${formatSosElapsed(s.sosStartedAt)}</div>
                ` : nothing}
              </div>
              <button class="btn btn--danger btn--sm ec-sos-cancel"
                @click=${() => { if (confirm(tr.cancelSosConfirm ?? "Xác nhận hủy SOS?")) props.onCancelSos?.(); }}>
                ${tr.cancelSos ?? "Hủy SOS"}
              </button>
            </div>
          `
        : nothing}

      <!-- Header actions -->
      <div class="ec-actions">
        ${(props.elderProfiles?.length ?? 0) > 1 ? html`
          <select class="ec-profile-select" .value=${props.activeProfileId ?? "ba_noi"}
            @change=${(e: Event) => props.onProfileChange?.((e.target as HTMLSelectElement).value)}>
            ${(props.elderProfiles ?? []).map(p => html`<option value=${p.id}>${p.name}</option>`)}
          </select>
        ` : nothing}
        <button
          class="btn btn--ghost btn--sm"
          @click=${props.onRefresh}
          ?disabled=${props.loading || !props.connected}
        >
          ${props.loading ? tr.refreshing : t().common.refresh}
        </button>
        ${props.error
          ? html`<span class="ec-error">${props.error}</span>`
          : nothing}
        ${!props.connected
          ? html`<span class="ec-badge ec-badge--offline">${t().common.disconnected}</span>`
          : nothing}
      </div>

      <!-- Status cards grid -->
      <div class="ec-grid">
        <!-- Health Status Card -->
        <div class="ec-card ${props.sosActive ? "ec-card--danger" : ""}">
          <div class="ec-card__header">
            <span class="ec-card__icon">${icons.heartPulse}</span>
            <span class="ec-card__title">${tr.careStatus}</span>
          </div>
          <div class="ec-card__body">
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.presence}</span>
              <span class="ec-stat-value ${props.room.presence ? "ec-text--ok" : "ec-text--muted"}">
                ${props.room.presence == null ? "—" : props.room.presence ? tr.inRoom : tr.noMotion}
              </span>
            </div>
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.currentLevel}</span>
              <span class="ec-stat-value">
                ${props.lastCheck
                  ? html`<span class="ec-level-badge ${levelClass(props.lastCheck.level)}">
                      ${levelLabel(props.lastCheck.level)}
                    </span>`
                  : html`<span class="ec-level-badge ec-level--normal">${levelLabel("normal")}</span>`}
              </span>
            </div>
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.checksToday}</span>
              <span class="ec-stat-value">${s.checksToday}</span>
            </div>
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.alertsToday}</span>
              <span class="ec-stat-value ${s.alertsToday > 0 ? "ec-text--warn" : ""}">
                ${s.alertsToday}
              </span>
            </div>
          </div>
        </div>

        <!-- Room Environment Card -->
        <div class="ec-card">
          <div class="ec-card__header">
            <span class="ec-card__icon">${icons.thermometer}</span>
            <span class="ec-card__title">${tr.roomEnvironment}</span>
            ${!props.haConnected
              ? html`<span class="ec-badge ec-badge--warn">${tr.haOffline}</span>`
              : nothing}
          </div>
          <div class="ec-card__body">
            <div class="ec-sensor-grid">
              <div class="ec-sensor">
                <div class="ec-sensor__value">${formatTemp(props.room.temperature)}</div>
                <div class="ec-sensor__label">${tr.temperature}</div>
              </div>
              <div class="ec-sensor">
                <div class="ec-sensor__value">${formatHumidity(props.room.humidity)}</div>
                <div class="ec-sensor__label">${tr.humidity}</div>
              </div>
              <div class="ec-sensor">
                <div class="ec-sensor__value">
                  ${props.room.motionMinutes != null ? `${props.room.motionMinutes}m` : "—"}
                </div>
                <div class="ec-sensor__label">${tr.motion}</div>
              </div>
            </div>
            ${props.room.temperature != null && (props.room.temperature < 20 || props.room.temperature > 35)
              ? html`<div class="ec-env-warn">${tr.tempOutOfRange}</div>`
              : nothing}
            ${props.room.humidity != null && (props.room.humidity < 40 || props.room.humidity > 80)
              ? html`<div class="ec-env-warn">${tr.humidityOutOfRange}</div>`
              : nothing}
          </div>
        </div>

        <!-- Fall Detection Card (P2-6) -->
        ${renderFallCard(s.lastFallEvent ?? null)}

        <!-- Health Log Card -->
        ${renderHealthCard(s.healthEntries ?? [], props.onExportHealth)}

        <!-- Medication Card -->
        ${renderMedicationCard(s.medications ?? [], s.medDoses ?? [])}

        <!-- Sleep Card -->
        ${renderSleepCard(s.sleep ?? { sleepTime: null, wakeTime: null, totalHours: null, wakeEvents: 0, quality: null, avg7day: null, trend: null })}

        <!-- Exercise Card -->
        ${renderExerciseCard(s.exercise ?? { completedToday: false, level: null, durationMin: null, startedAt: null })}

        <!-- Family Calls Card -->
        <div class="ec-card">
          <div class="ec-card__header">
            <span class="ec-card__icon">${icons.phone}</span>
            <span class="ec-card__title">${tr.familyCalls}</span>
          </div>
          <div class="ec-card__body">
            ${s.callsToday.length > 0
              ? html`
                  <div class="ec-calls-list">
                    ${s.callsToday.map(
                      (call) => html`
                        <div class="ec-call-item">
                          <span class="ec-call-caller">${call.caller}</span>
                          <span class="ec-call-time">${formatTime(call.timestamp)}</span>
                        </div>
                      `,
                    )}
                  </div>
                `
              : html`
                  <div class="ec-empty-state">
                    <div class="ec-empty-state__text">${tr.noCalls}</div>
                  </div>
                `}
          </div>
        </div>

        <!-- Companion Activity Card -->
        <div class="ec-card">
          <div class="ec-card__header">
            <span class="ec-card__icon">${icons.music}</span>
            <span class="ec-card__title">${tr.companionActivity}</span>
          </div>
          <div class="ec-card__body">
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.musicSessions}</span>
              <span class="ec-stat-value">${s.musicPlayed}</span>
            </div>
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.reminders}</span>
              <span class="ec-stat-value">${s.remindersDelivered}</span>
            </div>
            <div class="ec-stat-row">
              <span class="ec-stat-label">${tr.storyActive}</span>
              <span class="ec-stat-value">
                ${s.storyActive ? tr.yes : tr.no}
              </span>
            </div>
          </div>
        </div>

        <!-- Weather Card -->
        ${renderWeatherCard(s.weather ?? { outdoorTemp: null, outdoorHumidity: null, conditions: [], alertSent: false })}

        <!-- Visitors Card -->
        ${renderVisitorCard(s.visitorsToday ?? [], s.visitorActive ?? false)}

        <!-- Safety Card (fall detect + multi-room + queue) -->
        ${renderSafetyCard(
          s.multiRoom ?? { currentRoom: null, since: null, bathroomVisitsToday: 0, movements: [] },
          s.lastFallEvent ?? null,
          s.queueStatus ?? { pending: 0, retrying: 0, failed: 0, lastFallbackAt: null },
        )}

        <!-- Emergency Info Card -->
        ${renderEmergencyCard(s.emergency ?? { nearestHospital: null, hospitalPhone: null, familyDoctor: null, doctorPhone: null, bloodType: null, allergies: [], conditions: [] })}
      </div>

      <!-- SOS Events Section (if any today) -->
      ${s.sosEvents.length > 0
        ? html`
            <div class="ec-section">
              <h3 class="ec-section__title"><span class="ec-section__icon">${icons.bellRing}</span> ${tr.sosEventsToday}</h3>
              <div class="ec-sos-list">
                ${s.sosEvents.map(
                  (ev) => html`
                    <div class="ec-sos-item ${ev.resolved ? "" : "ec-sos-item--active"}">
                      <div class="ec-sos-item__time">${formatTime(ev.timestamp)}</div>
                      <div class="ec-sos-item__source">${ev.source}</div>
                      <div class="ec-sos-item__level">Level ${ev.escalationLevel}</div>
                      <div class="ec-sos-item__status">
                        ${ev.resolved
                          ? html`<span class="ec-text--ok">${tr.resolved} ${ev.resolvedBy ? `(${ev.resolvedBy})` : ""}</span>`
                          : html`<span class="ec-text--danger">${tr.sosActiveShort}</span>`}
                      </div>
                    </div>
                  `,
                )}
              </div>
            </div>
          `
        : nothing}

      <!-- Last Daily Report -->
      ${s.lastReport
        ? html`
            <div class="ec-section">
              <h3 class="ec-section__title"><span class="ec-section__icon">${icons.fileBarChart}</span> ${tr.lastReport} (${s.lastReportDate ?? ""})</h3>
              <div class="ec-report-card">
                <pre class="ec-report-text">${s.lastReport}</pre>
              </div>
            </div>
          `
        : nothing}
    </div>
  `;
}
