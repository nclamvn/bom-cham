import { html, nothing, type TemplateResult } from "lit";

import { icons } from "../icons";
import { t } from "../i18n";

export type EldercareConfigSection =
  | "monitor" | "sos" | "companion" | "videocall"
  | "medication" | "exercise" | "safety" | "emergency";

export type EldercareContact = {
  name: string;
  phone: string;
  zaloId?: string;
  role: string;
};

export type EldercareConfigProps = {
  connected: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  activeSection: EldercareConfigSection;
  monitorConfig: Record<string, unknown> | null;
  sosContacts: EldercareContact[];
  companionConfig: Record<string, unknown> | null;
  videocallConfig: Record<string, unknown> | null;
  medicationConfig: Record<string, unknown> | null;
  exerciseConfig: Record<string, unknown> | null;
  safetyConfig: Record<string, unknown> | null;
  emergencyConfig: Record<string, unknown> | null;
  haEntities: Record<string, string>;
  onSave: () => void;
  onRefresh: () => void;
  onSectionChange: (section: EldercareConfigSection) => void;
  onConfigChange: (section: string, path: string[], value: unknown) => void;
};

const SECTIONS: EldercareConfigSection[] = [
  "monitor", "sos", "companion", "videocall",
  "medication", "exercise", "safety", "emergency",
];

function sectionIcon(section: EldercareConfigSection): TemplateResult {
  switch (section) {
    case "monitor": return html`<span class="ec-config-tab__icon">${icons.satellite}</span>`;
    case "sos": return html`<span class="ec-config-tab__icon">${icons.bellRing}</span>`;
    case "companion": return html`<span class="ec-config-tab__icon">${icons.music}</span>`;
    case "videocall": return html`<span class="ec-config-tab__icon">${icons.phone}</span>`;
    case "medication": return html`<span class="ec-config-tab__icon">${icons.pill}</span>`;
    case "exercise": return html`<span class="ec-config-tab__icon">${icons.dumbbell}</span>`;
    case "safety": return html`<span class="ec-config-tab__icon">${icons.shieldAlert}</span>`;
    case "emergency": return html`<span class="ec-config-tab__icon">${icons.siren}</span>`;
  }
}

// ── Existing sections ────────────────────────────────

function renderMonitorSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.monitorConfig ?? {}) as Record<string, unknown>;
  const thresholds = (cfg.thresholds ?? {}) as Record<string, Record<string, unknown>>;
  const noMotion = (thresholds.no_motion_minutes ?? {}) as Record<string, unknown>;
  const temp = (thresholds.temperature ?? {}) as Record<string, unknown>;

  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.monitorThresholds}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.noMotionAttention}</label>
        <input class="ec-config-field__input" type="number" .value=${String(noMotion.attention ?? 30)}
          @change=${(e: Event) => props.onConfigChange("monitor", ["thresholds", "no_motion_minutes", "attention"], Number((e.target as HTMLInputElement).value))} />
        <span class="ec-config-field__hint">${tr.minutesHint}</span>
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.noMotionWarning}</label>
        <input class="ec-config-field__input" type="number" .value=${String(noMotion.warning ?? 60)}
          @change=${(e: Event) => props.onConfigChange("monitor", ["thresholds", "no_motion_minutes", "warning"], Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.noMotionEmergency}</label>
        <input class="ec-config-field__input" type="number" .value=${String(noMotion.emergency ?? 90)}
          @change=${(e: Event) => props.onConfigChange("monitor", ["thresholds", "no_motion_minutes", "emergency"], Number((e.target as HTMLInputElement).value))} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.temperatureThresholds}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.tempLow}</label>
        <input class="ec-config-field__input" type="number" step="0.5" .value=${String(temp.low ?? 20)}
          @change=${(e: Event) => props.onConfigChange("monitor", ["thresholds", "temperature", "low"], Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.tempHigh}</label>
        <input class="ec-config-field__input" type="number" step="0.5" .value=${String(temp.high ?? 35)}
          @change=${(e: Event) => props.onConfigChange("monitor", ["thresholds", "temperature", "high"], Number((e.target as HTMLInputElement).value))} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.haEntities}</h4>
      ${Object.entries(props.haEntities).map(
        ([key, value]) => html`
          <div class="ec-config-field">
            <label class="ec-config-field__label">${key}</label>
            <input class="ec-config-field__input" type="text" .value=${value}
              @change=${(e: Event) => props.onConfigChange("monitor", ["entities", key], (e.target as HTMLInputElement).value)} />
          </div>
        `,
      )}
    </div>
  `;
}

function renderSosSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.sosContacts}</h4>
      <div class="ec-contact-list">
        ${props.sosContacts.map(
          (contact) => html`
            <div class="ec-contact-item">
              <span class="ec-contact-item__name">${contact.name}</span>
              <span class="ec-contact-item__phone">${contact.phone}</span>
              <span class="ec-contact-item__role">${contact.role}</span>
            </div>
          `,
        )}
        ${props.sosContacts.length === 0
          ? html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.noContacts}</div></div>`
          : nothing}
      </div>
      <p class="ec-config-field__hint" style="margin-top: 8px">${tr.contactsHint}</p>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.escalationLevels}</h4>
      <div class="ec-stat-row"><span class="ec-stat-label">Level 1</span><span class="ec-stat-value">${tr.level1Desc}</span></div>
      <div class="ec-stat-row"><span class="ec-stat-label">Level 2 (+3 ${tr.minutes})</span><span class="ec-stat-value">${tr.level2Desc}</span></div>
      <div class="ec-stat-row"><span class="ec-stat-label">Level 3 (+5 ${tr.minutes})</span><span class="ec-stat-value">${tr.level3Desc}</span></div>
    </div>
  `;
}

function renderCompanionSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.companionConfig ?? {}) as Record<string, unknown>;
  const music = (cfg.music ?? {}) as Record<string, unknown>;
  const stories = (cfg.stories ?? {}) as Record<string, unknown>;
  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.musicSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.defaultPlaylist}</label>
        <input class="ec-config-field__input" type="text" .value=${String(music.default_playlist ?? "bolero_mix")}
          @change=${(e: Event) => props.onConfigChange("companion", ["music", "default_playlist"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.volume}</label>
        <input class="ec-config-field__input" type="number" min="0" max="1" step="0.1" .value=${String(music.volume ?? 0.9)}
          @change=${(e: Event) => props.onConfigChange("companion", ["music", "volume"], Number((e.target as HTMLInputElement).value))} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.ttsSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.ttsRate}</label>
        <input class="ec-config-field__input" type="number" min="0.5" max="1.5" step="0.1" .value=${String(stories.tts_rate ?? 0.8)}
          @change=${(e: Event) => props.onConfigChange("companion", ["stories", "tts_rate"], Number((e.target as HTMLInputElement).value))} />
        <span class="ec-config-field__hint">${tr.ttsRateHint}</span>
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.ttsVoice}</label>
        <input class="ec-config-field__input" type="text" .value=${String(stories.tts_voice ?? "vi-VN-HoaiMyNeural")}
          @change=${(e: Event) => props.onConfigChange("companion", ["stories", "tts_voice"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
  `;
}

function renderVideocallSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.videocallConfig ?? {}) as Record<string, unknown>;
  const tablet = (cfg.tablet ?? {}) as Record<string, unknown>;
  const schedule = (cfg.schedule ?? {}) as Record<string, unknown>;
  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.tabletSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.tabletIp}</label>
        <input class="ec-config-field__input" type="text" .value=${String(tablet.ip ?? "192.168.1.xxx")}
          @change=${(e: Event) => props.onConfigChange("videocall", ["tablet", "ip"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.fullyKioskPassword}</label>
        <input class="ec-config-field__input" type="password" .value=${String(tablet.fully_kiosk_password ?? "")}
          @change=${(e: Event) => props.onConfigChange("videocall", ["tablet", "fully_kiosk_password"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.scheduleSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.morningReminder}</label>
        <input class="ec-config-field__input" type="time" .value=${String(schedule.morning_reminder_time ?? "08:00")}
          @change=${(e: Event) => props.onConfigChange("videocall", ["schedule", "morning_reminder_time"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.quietHoursStart}</label>
        <input class="ec-config-field__input" type="time" .value=${String(schedule.quiet_hours_start ?? "22:00")}
          @change=${(e: Event) => props.onConfigChange("videocall", ["schedule", "quiet_hours_start"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.quietHoursEnd}</label>
        <input class="ec-config-field__input" type="time" .value=${String(schedule.quiet_hours_end ?? "06:00")}
          @change=${(e: Event) => props.onConfigChange("videocall", ["schedule", "quiet_hours_end"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
  `;
}

// ── New sections ─────────────────────────────────────

function renderMedicationSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.medicationConfig ?? {}) as Record<string, unknown>;
  const enabled = cfg.enabled !== false;
  const meds = (Array.isArray(cfg.medications) ? cfg.medications : []) as Array<Record<string, unknown>>;

  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.medSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.medEnabled}</label>
        <input class="ec-config-field__input" type="checkbox" ?checked=${enabled} style="width: auto"
          @change=${(e: Event) => props.onConfigChange("medication", ["enabled"], (e.target as HTMLInputElement).checked)} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.medList}</h4>
      <div class="ec-contact-list">
        ${meds.map((med, i) => html`
          <div class="ec-contact-item">
            <span class="ec-contact-item__name">${med.name ?? ""}</span>
            <span class="ec-contact-item__phone">${Array.isArray(med.times) ? (med.times as string[]).join(", ") : ""}</span>
            <span class="ec-contact-item__role">${med.with_food ? tr.medWithFood : ""}</span>
          </div>
        `)}
        ${meds.length === 0
          ? html`<div class="ec-empty-state"><div class="ec-empty-state__text">${tr.medNone}</div></div>`
          : nothing}
      </div>
      <p class="ec-config-field__hint" style="margin-top: 8px">${tr.medHint}</p>
    </div>
  `;
}

function renderExerciseSection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.exerciseConfig ?? {}) as Record<string, unknown>;
  const enabled = cfg.enabled !== false;
  const level = typeof cfg.level === "number" ? cfg.level : 1;
  const time = typeof cfg.reminder_time === "string" ? cfg.reminder_time : "09:00";

  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.exerciseSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.exerciseEnabled}</label>
        <input class="ec-config-field__input" type="checkbox" ?checked=${enabled} style="width: auto"
          @change=${(e: Event) => props.onConfigChange("exercise", ["enabled"], (e.target as HTMLInputElement).checked)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.exerciseLevelSetting}</label>
        <input class="ec-config-field__input" type="number" min="1" max="3" .value=${String(level)}
          @change=${(e: Event) => props.onConfigChange("exercise", ["level"], Number((e.target as HTMLInputElement).value))} />
        <span class="ec-config-field__hint">${tr.exerciseLevelHint}</span>
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.exerciseTime}</label>
        <input class="ec-config-field__input" type="time" .value=${time}
          @change=${(e: Event) => props.onConfigChange("exercise", ["reminder_time"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
  `;
}

function renderSafetySection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.safetyConfig ?? {}) as Record<string, unknown>;
  const fall = (cfg.fall_detect ?? {}) as Record<string, unknown>;
  const detection = (fall.detection ?? {}) as Record<string, unknown>;
  const confirm = (fall.confirm ?? {}) as Record<string, unknown>;
  const cooldown = (fall.cooldown ?? {}) as Record<string, unknown>;
  const multiroom = (cfg.multiroom ?? {}) as Record<string, unknown>;
  const wcMax = typeof multiroom.wc_max_minutes === "number" ? multiroom.wc_max_minutes : 20;

  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.fallDetectSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.fallStillness}</label>
        <input class="ec-config-field__input" type="number" .value=${String(detection.stillness_threshold_minutes ?? 5)}
          @change=${(e: Event) => props.onConfigChange("safety", ["fall_detect", "detection", "stillness_threshold_minutes"], Number((e.target as HTMLInputElement).value))} />
        <span class="ec-config-field__hint">${tr.fallStillnessHint}</span>
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.fallTtsWait}</label>
        <input class="ec-config-field__input" type="number" .value=${String(confirm.tts_wait_seconds ?? 30)}
          @change=${(e: Event) => props.onConfigChange("safety", ["fall_detect", "confirm", "tts_wait_seconds"], Number((e.target as HTMLInputElement).value))} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.fallCooldown}</label>
        <input class="ec-config-field__input" type="number" .value=${String(cooldown.between_checks_minutes ?? 10)}
          @change=${(e: Event) => props.onConfigChange("safety", ["fall_detect", "cooldown", "between_checks_minutes"], Number((e.target as HTMLInputElement).value))} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.multiroomSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.wcMaxMinutes}</label>
        <input class="ec-config-field__input" type="number" .value=${String(wcMax)}
          @change=${(e: Event) => props.onConfigChange("safety", ["multiroom", "wc_max_minutes"], Number((e.target as HTMLInputElement).value))} />
        <span class="ec-config-field__hint">${tr.wcMaxHint}</span>
      </div>
    </div>
  `;
}

function renderEmergencySection(props: EldercareConfigProps) {
  const tr = t().eldercare.config;
  const cfg = (props.emergencyConfig ?? {}) as Record<string, unknown>;
  const hospital = (cfg.nearest_hospital ?? {}) as Record<string, unknown>;
  const doctor = (cfg.family_doctor ?? {}) as Record<string, unknown>;
  const medical = (cfg.medical_profile ?? {}) as Record<string, unknown>;

  return html`
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.emergencyHospitalSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyHospitalName}</label>
        <input class="ec-config-field__input" type="text" .value=${String(hospital.name ?? "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["nearest_hospital", "name"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyHospitalPhone}</label>
        <input class="ec-config-field__input" type="text" .value=${String(hospital.emergency_phone ?? hospital.phone ?? "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["nearest_hospital", "emergency_phone"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.emergencyDoctorSettings}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyDoctorName}</label>
        <input class="ec-config-field__input" type="text" .value=${String(doctor.name ?? "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["family_doctor", "name"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyDoctorPhone}</label>
        <input class="ec-config-field__input" type="text" .value=${String(doctor.phone ?? "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["family_doctor", "phone"], (e.target as HTMLInputElement).value)} />
      </div>
    </div>
    <div class="ec-config-section">
      <h4 class="ec-config-section__title">${tr.emergencyMedicalProfile}</h4>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyBloodType}</label>
        <input class="ec-config-field__input" type="text" .value=${String(medical.blood_type ?? "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["medical_profile", "blood_type"], (e.target as HTMLInputElement).value)} />
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyAllergies}</label>
        <input class="ec-config-field__input" type="text" .value=${String(Array.isArray(medical.allergies) ? (medical.allergies as string[]).join(", ") : "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["medical_profile", "allergies"], (e.target as HTMLInputElement).value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
        <span class="ec-config-field__hint">${tr.emergencyAllergiesHint}</span>
      </div>
      <div class="ec-config-field">
        <label class="ec-config-field__label">${tr.emergencyConditions}</label>
        <input class="ec-config-field__input" type="text" .value=${String(Array.isArray(medical.chronic_conditions) ? (medical.chronic_conditions as string[]).join(", ") : "")}
          @change=${(e: Event) => props.onConfigChange("emergency", ["medical_profile", "chronic_conditions"], (e.target as HTMLInputElement).value.split(",").map((s: string) => s.trim()).filter(Boolean))} />
        <span class="ec-config-field__hint">${tr.emergencyConditionsHint}</span>
      </div>
    </div>
  `;
}

// ── Main Config ──────────────────────────────────────

export function renderEldercareConfig(props: EldercareConfigProps) {
  const tr = t().eldercare;

  return html`
    <div class="ec-config">
      <!-- Section tabs -->
      <div class="ec-config-tabs">
        ${SECTIONS.map(
          (section) => html`
            <button
              class="ec-config-tab ${props.activeSection === section ? "ec-config-tab--active" : ""}"
              @click=${() => props.onSectionChange(section)}
            >
              ${sectionIcon(section)} ${tr.configSections[section]}
            </button>
          `,
        )}
      </div>

      <!-- Actions -->
      <div class="ec-actions">
        <button
          class="btn btn--primary btn--sm"
          @click=${props.onSave}
          ?disabled=${props.saving || !props.connected}
        >
          ${props.saving ? t().common.saving : t().common.save}
        </button>
        <button
          class="btn btn--ghost btn--sm"
          @click=${props.onRefresh}
          ?disabled=${props.loading || !props.connected}
        >
          ${t().common.refresh}
        </button>
        ${props.error
          ? html`<span class="ec-error">${props.error}</span>`
          : nothing}
      </div>

      <!-- Active section content -->
      ${props.activeSection === "monitor" ? renderMonitorSection(props) : nothing}
      ${props.activeSection === "sos" ? renderSosSection(props) : nothing}
      ${props.activeSection === "companion" ? renderCompanionSection(props) : nothing}
      ${props.activeSection === "videocall" ? renderVideocallSection(props) : nothing}
      ${props.activeSection === "medication" ? renderMedicationSection(props) : nothing}
      ${props.activeSection === "exercise" ? renderExerciseSection(props) : nothing}
      ${props.activeSection === "safety" ? renderSafetySection(props) : nothing}
      ${props.activeSection === "emergency" ? renderEmergencySection(props) : nothing}
    </div>
  `;
}
