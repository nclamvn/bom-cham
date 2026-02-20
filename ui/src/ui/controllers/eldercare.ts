import type { GatewayBrowserClient } from "../gateway";

// ── Types ────────────────────────────────────────────

export type AlertLevel = "normal" | "attention" | "warning" | "emergency";

export type EldercareCheck = {
  timestamp: string;
  level: AlertLevel;
  details?: string;
};

export type EldercareSosEvent = {
  timestamp: string;
  source: string;
  escalationLevel: number;
  resolved: boolean;
  resolvedBy?: string;
  responseMinutes?: number;
};

export type EldercareCall = {
  timestamp: string;
  caller: string;
  duration?: string;
};

export type EldercareRoomData = {
  temperature: number | null;
  humidity: number | null;
  motionMinutes: number | null;
  presence: boolean | null;
};

// ── Extended types for Sprint 6-8 features ──────────

export type EldercareHealthEntry = {
  type: string;
  timestamp: string;
  value: string;
  unit: string;
  status: string;
};

export type EldercareMedication = {
  name: string;
  shortName: string;
  times: string[];
  withFood: boolean;
};

export type EldercareMedDose = {
  medication: string;
  scheduledTime: string;
  taken: boolean;
  takenTime?: string;
};

export type EldercareSleepData = {
  sleepTime: string | null;
  wakeTime: string | null;
  totalHours: number | null;
  wakeEvents: number;
  quality: "good" | "normal" | "poor" | null;
  avg7day: number | null;
  trend: "improving" | "stable" | "declining" | null;
};

export type EldercareExerciseData = {
  completedToday: boolean;
  level: number | null;
  durationMin: number | null;
  startedAt: string | null;
};

export type EldercareWeatherData = {
  outdoorTemp: number | null;
  outdoorHumidity: number | null;
  conditions: string[];
  alertSent: boolean;
};

export type EldercareVisitorEntry = {
  start: string;
  end?: string;
  durationMin?: number;
  count?: number;
};

export type EldercareMultiRoomData = {
  currentRoom: string | null;
  since: string | null;
  bathroomVisitsToday: number;
  movements: Array<{ from: string; to: string; time: string }>;
};

export type EldercareFallEvent = {
  timestamp: string;
  source: string;
  result: string;
  escalated: boolean;
};

export type EldercareQueueStatus = {
  pending: number;
  retrying: number;
  failed: number;
  lastFallbackAt: string | null;
};

export type EldercareEmergencyInfo = {
  nearestHospital: string | null;
  hospitalPhone: string | null;
  familyDoctor: string | null;
  doctorPhone: string | null;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
};

// ── Summary ─────────────────────────────────────────

export type EldercareDailySummary = {
  checksToday: number;
  alertsToday: number;
  highestLevel: AlertLevel;
  callsToday: EldercareCall[];
  musicPlayed: number;
  remindersDelivered: number;
  storyActive: boolean;
  sosEvents: EldercareSosEvent[];
  lastReport: string | null;
  lastReportDate: string | null;
  // Sprint 6-8 data
  healthEntries: EldercareHealthEntry[];
  medications: EldercareMedication[];
  medDoses: EldercareMedDose[];
  sleep: EldercareSleepData;
  exercise: EldercareExerciseData;
  weather: EldercareWeatherData;
  visitorsToday: EldercareVisitorEntry[];
  visitorActive: boolean;
  multiRoom: EldercareMultiRoomData;
  lastFallEvent: EldercareFallEvent | null;
  queueStatus: EldercareQueueStatus;
  emergency: EldercareEmergencyInfo;
};

// ── State shape (added to app.ts) ───────────────────

export type EldercareState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  eldercareLoading: boolean;
  eldercareError: string | null;
  eldercareHaConnected: boolean;
  eldercareRoom: EldercareRoomData;
  eldercareSummary: EldercareDailySummary;
  eldercareLastCheck: EldercareCheck | null;
  eldercareSosActive: boolean;
};

const EMPTY_SLEEP: EldercareSleepData = {
  sleepTime: null, wakeTime: null, totalHours: null,
  wakeEvents: 0, quality: null, avg7day: null, trend: null,
};

const EMPTY_EXERCISE: EldercareExerciseData = {
  completedToday: false, level: null, durationMin: null, startedAt: null,
};

const EMPTY_WEATHER: EldercareWeatherData = {
  outdoorTemp: null, outdoorHumidity: null, conditions: [], alertSent: false,
};

const EMPTY_MULTIROOM: EldercareMultiRoomData = {
  currentRoom: null, since: null, bathroomVisitsToday: 0, movements: [],
};

const EMPTY_QUEUE: EldercareQueueStatus = {
  pending: 0, retrying: 0, failed: 0, lastFallbackAt: null,
};

const EMPTY_EMERGENCY: EldercareEmergencyInfo = {
  nearestHospital: null, hospitalPhone: null,
  familyDoctor: null, doctorPhone: null,
  bloodType: null, allergies: [], conditions: [],
};

const EMPTY_SUMMARY: EldercareDailySummary = {
  checksToday: 0,
  alertsToday: 0,
  highestLevel: "normal",
  callsToday: [],
  musicPlayed: 0,
  remindersDelivered: 0,
  storyActive: false,
  sosEvents: [],
  lastReport: null,
  lastReportDate: null,
  healthEntries: [],
  medications: [],
  medDoses: [],
  sleep: { ...EMPTY_SLEEP },
  exercise: { ...EMPTY_EXERCISE },
  weather: { ...EMPTY_WEATHER },
  visitorsToday: [],
  visitorActive: false,
  multiRoom: { ...EMPTY_MULTIROOM },
  lastFallEvent: null,
  queueStatus: { ...EMPTY_QUEUE },
  emergency: { ...EMPTY_EMERGENCY },
};

const EMPTY_ROOM: EldercareRoomData = {
  temperature: null,
  humidity: null,
  motionMinutes: null,
  presence: null,
};

// ── Loader ──────────────────────────────────────────

export async function loadEldercare(state: EldercareState) {
  if (!state.client || !state.connected) return;
  if (state.eldercareLoading) return;
  state.eldercareLoading = true;
  state.eldercareError = null;
  try {
    // Fetch eldercare memory entries
    const memRes = (await state.client.request("memory.search", {
      keyword: "eldercare_",
      limit: 200,
    })) as { facts?: Array<{ id: string; content: string }> } | Array<{ id: string; content: string }> | undefined;

    const raw = memRes && typeof memRes === "object" && "facts" in memRes
      ? (memRes as { facts: unknown[] }).facts
      : memRes;
    const facts = Array.isArray(raw) ? raw as Array<{ id: string; content: string }> : [];
    const today = new Date().toISOString().slice(0, 10);

    // Parse monitoring checks
    const checks: EldercareCheck[] = [];
    const calls: EldercareCall[] = [];
    const sosEvents: EldercareSosEvent[] = [];
    const healthEntries: EldercareHealthEntry[] = [];
    const medDoses: EldercareMedDose[] = [];
    const visitorsToday: EldercareVisitorEntry[] = [];
    const movements: Array<{ from: string; to: string; time: string }> = [];
    let musicPlayed = 0;
    let remindersDelivered = 0;
    let storyActive = false;
    let sosActive = false;
    let lastReport: string | null = null;
    let lastReportDate: string | null = null;

    // Extended
    let medications: EldercareMedication[] = [];
    const sleep: EldercareSleepData = { ...EMPTY_SLEEP };
    const exercise: EldercareExerciseData = { ...EMPTY_EXERCISE };
    const weather: EldercareWeatherData = { ...EMPTY_WEATHER };
    let visitorActive = false;
    const multiRoom: EldercareMultiRoomData = { ...EMPTY_MULTIROOM, movements };
    let lastFallEvent: EldercareFallEvent | null = null;
    const queueStatus: EldercareQueueStatus = { ...EMPTY_QUEUE };
    const emergency: EldercareEmergencyInfo = { ...EMPTY_EMERGENCY };
    let bathroomVisits = 0;

    for (const fact of facts) {
      const content = fact.content;
      const id = fact.id ?? "";
      try {
        // ── Existing parsers ──

        if (id.startsWith("eldercare_check_") && content.includes(today)) {
          const data = JSON.parse(content);
          checks.push({ timestamp: data.timestamp ?? id, level: data.level ?? "normal", details: data.details });
        }
        if (id === "eldercare_sos_active") {
          const data = JSON.parse(content);
          sosActive = data.resolved === false;
          if (content.includes(today)) {
            sosEvents.push({
              timestamp: data.timestamp ?? "", source: data.source ?? "unknown",
              escalationLevel: data.escalation_level ?? 1, resolved: data.resolved ?? false,
              resolvedBy: data.resolved_by, responseMinutes: data.response_minutes,
            });
          }
        }
        if (id.startsWith("eldercare_call_") && content.includes(today)) {
          const data = JSON.parse(content);
          calls.push({ timestamp: data.timestamp ?? id, caller: data.caller ?? data.family_member ?? "unknown", duration: data.duration });
        }
        if (id.startsWith("eldercare_music_played_") && content.includes(today)) musicPlayed++;
        if (id.startsWith("eldercare_reminder_") && content.includes(today)) remindersDelivered++;
        if (id === "eldercare_story_bookmark") storyActive = true;
        if (id.startsWith("eldercare_daily_report_")) {
          const data = JSON.parse(content);
          if (!lastReportDate || id > `eldercare_daily_report_${lastReportDate}`) {
            lastReport = data.report ?? content;
            lastReportDate = id.replace("eldercare_daily_report_", "");
          }
        }

        // ── Health Log ──
        if (id.includes("_health_") && content.includes(today)) {
          const data = JSON.parse(content);
          healthEntries.push({
            type: data.type ?? id.split("_health_")[1]?.split("_")[0] ?? "unknown",
            timestamp: data.timestamp ?? "",
            value: formatHealthValue(data),
            unit: data.unit ?? "",
            status: data.status ?? "normal",
          });
        }

        // ── Medication ──
        if (id.includes("_medication_list")) {
          const data = JSON.parse(content);
          if (data.medications && Array.isArray(data.medications)) {
            medications = data.medications.map((m: Record<string, unknown>) => ({
              name: String(m.name ?? ""), shortName: String(m.short_name ?? m.name ?? ""),
              times: Array.isArray(m.times) ? m.times.map(String) : [],
              withFood: Boolean(m.with_food),
            }));
          }
        }
        if (id.includes("_med_taken_") && content.includes(today)) {
          const data = JSON.parse(content);
          medDoses.push({
            medication: data.medication ?? data.short_name ?? "", scheduledTime: data.scheduled_time ?? "",
            taken: true, takenTime: data.taken_time ?? data.confirmed_at ?? "",
          });
        }
        if (id.includes("_med_missed_") && content.includes(today)) {
          const data = JSON.parse(content);
          medDoses.push({
            medication: data.medication ?? data.short_name ?? "", scheduledTime: data.scheduled_time ?? "",
            taken: false,
          });
        }

        // ── Sleep Tracker ──
        if (id.includes("_sleep_") && id.includes(today.replace(/-/g, ""))) {
          const data = JSON.parse(content);
          sleep.sleepTime = data.sleep_time ?? null;
          sleep.wakeTime = data.wake_time ?? null;
          sleep.totalHours = typeof data.total_hours === "number" ? data.total_hours : null;
          sleep.wakeEvents = typeof data.wake_events === "number" ? data.wake_events : (Array.isArray(data.wake_events) ? data.wake_events.length : 0);
          sleep.quality = data.quality ?? null;
          sleep.avg7day = typeof data.avg_7day === "number" ? data.avg_7day : null;
          sleep.trend = data.trend ?? null;
        }

        // ── Exercise ──
        if (id.includes("_exercise_") && id.includes(today.replace(/-/g, ""))) {
          const data = JSON.parse(content);
          exercise.completedToday = Boolean(data.completed);
          exercise.level = typeof data.level === "number" ? data.level : null;
          exercise.durationMin = typeof data.duration_min === "number" ? data.duration_min : null;
          exercise.startedAt = data.started_at ?? null;
        }

        // ── Weather Alert ──
        if (id.includes("_weather_") && content.includes(today)) {
          const data = JSON.parse(content);
          weather.outdoorTemp = typeof data.outdoor_temp === "number" ? data.outdoor_temp : null;
          weather.outdoorHumidity = typeof data.outdoor_humidity === "number" ? data.outdoor_humidity : null;
          weather.conditions = Array.isArray(data.conditions) ? data.conditions : [];
          weather.alertSent = Boolean(data.alert_sent);
        }

        // ── Visitor Log ──
        if (id === "eldercare_visitor_active" || id.includes("_visitor_active")) {
          const data = JSON.parse(content);
          visitorActive = true;
          visitorsToday.push({ start: data.start ?? "", count: data.count ?? data.max_count ?? 1 });
        }
        if (id.includes("_visitor_") && !id.includes("active") && !id.includes("expected") && !id.includes("security") && content.includes(today)) {
          const data = JSON.parse(content);
          if (data.start) {
            visitorsToday.push({ start: data.start, end: data.end, durationMin: data.duration_min, count: data.max_count });
          }
        }

        // ── Multi-Room ──
        if (id.includes("_location_current")) {
          const data = JSON.parse(content);
          multiRoom.currentRoom = data.room ?? null;
          multiRoom.since = data.since ?? null;
        }
        if (id.includes("_movement_") && content.includes(today)) {
          const data = JSON.parse(content);
          if (data.from && data.to) {
            movements.push({ from: data.from, to: data.to, time: data.time ?? "" });
            if (data.to === "bathroom" || data.to === "wc") bathroomVisits++;
          }
        }

        // ── Fall Detection ──
        if (id.includes("_fall_check_") || id.includes("_fall_raw_")) {
          const data = JSON.parse(content);
          const ev: EldercareFallEvent = {
            timestamp: data.timestamp ?? id, source: data.source ?? "unknown",
            result: data.result ?? "unknown", escalated: Boolean(data.escalated),
          };
          if (!lastFallEvent || ev.timestamp > lastFallEvent.timestamp) lastFallEvent = ev;
        }

        // ── Offline Queue ──
        if (id.includes("_queue_") && !id.includes("_queue_sent_") && !id.includes("_queue_local_")) {
          const data = JSON.parse(content);
          const status = data.status ?? "pending";
          if (status === "pending") queueStatus.pending++;
          else if (status === "retrying") queueStatus.retrying++;
          else if (status === "failed_permanent") queueStatus.failed++;
        }
        if (id.includes("_queue_local_fallback_at")) {
          queueStatus.lastFallbackAt = content.trim();
        }

        // ── Emergency Contacts ──
        if (id.includes("_emergency_list")) {
          const data = JSON.parse(content);
          emergency.nearestHospital = data.nearest_hospital?.name ?? null;
          emergency.hospitalPhone = data.nearest_hospital?.emergency_phone ?? data.nearest_hospital?.phone ?? null;
          emergency.familyDoctor = data.family_doctor?.name ?? null;
          emergency.doctorPhone = data.family_doctor?.phone ?? null;
        }

        // ── Medical Profile ──
        if (id.includes("_medical_profile")) {
          const data = JSON.parse(content);
          emergency.bloodType = data.blood_type ?? null;
          emergency.allergies = Array.isArray(data.allergies) ? data.allergies : [];
          emergency.conditions = Array.isArray(data.chronic_conditions) ? data.chronic_conditions : [];
        }
      } catch {
        // Skip unparseable entries
      }
    }

    multiRoom.bathroomVisitsToday = bathroomVisits;

    const alertChecks = checks.filter((c) => c.level !== "normal");
    const levelOrder: AlertLevel[] = ["normal", "attention", "warning", "emergency"];
    const highestLevel = checks.reduce<AlertLevel>((max, c) => {
      return levelOrder.indexOf(c.level) > levelOrder.indexOf(max) ? c.level : max;
    }, "normal");

    state.eldercareSummary = {
      checksToday: checks.length,
      alertsToday: alertChecks.length,
      highestLevel,
      callsToday: calls,
      musicPlayed,
      remindersDelivered,
      storyActive,
      sosEvents,
      lastReport,
      lastReportDate,
      healthEntries,
      medications,
      medDoses,
      sleep,
      exercise,
      weather,
      visitorsToday,
      visitorActive,
      multiRoom,
      lastFallEvent,
      queueStatus,
      emergency,
    };
    state.eldercareLastCheck = checks.length > 0 ? checks[checks.length - 1] : null;
    state.eldercareSosActive = sosActive;

    // Try to fetch room sensor data from HA via tool call
    try {
      const haRes = (await state.client.request("tools.call", {
        tool: "home_assistant",
        input: {
          action: "get_states",
          entity_ids: [
            "sensor.grandma_room_temperature",
            "sensor.grandma_room_humidity",
            "sensor.grandma_room_motion_minutes",
            "binary_sensor.grandma_room_presence",
          ],
        },
      })) as Array<{ entity_id: string; state: string }> | undefined;

      if (Array.isArray(haRes)) {
        const room: EldercareRoomData = { ...EMPTY_ROOM };
        for (const entity of haRes) {
          switch (entity.entity_id) {
            case "sensor.grandma_room_temperature":
              room.temperature = parseFloat(entity.state) || null;
              break;
            case "sensor.grandma_room_humidity":
              room.humidity = parseFloat(entity.state) || null;
              break;
            case "sensor.grandma_room_motion_minutes":
              room.motionMinutes = parseFloat(entity.state) || null;
              break;
            case "binary_sensor.grandma_room_presence":
              room.presence = entity.state === "on";
              break;
          }
        }
        state.eldercareRoom = room;
        state.eldercareHaConnected = true;
      }
    } catch {
      state.eldercareHaConnected = false;
      state.eldercareRoom = { ...EMPTY_ROOM };
    }
  } catch (err) {
    state.eldercareError = String(err);
    state.eldercareSummary = { ...EMPTY_SUMMARY };
    state.eldercareRoom = { ...EMPTY_ROOM };
  } finally {
    state.eldercareLoading = false;
  }
}

function formatHealthValue(data: Record<string, unknown>): string {
  const type = String(data.type ?? "");
  const v = data.values as Record<string, unknown> | undefined;
  if (type === "blood_pressure" && v) return `${v.systolic ?? "?"}/${v.diastolic ?? "?"}`;
  if (v && typeof Object.values(v)[0] === "number") return String(Object.values(v)[0]);
  if (typeof data.value === "number") return String(data.value);
  return String(data.value ?? "—");
}

export { EMPTY_SUMMARY, EMPTY_ROOM };
