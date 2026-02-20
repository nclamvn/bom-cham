import { describe, expect, it, vi } from "vitest";

import {
  openSkillSettings,
  closeSkillSettings,
  updateSettingsField,
  updateSettingsEnvVar,
  addSettingsEnvVar,
  removeSettingsEnvVar,
  saveSkillSettings,
  type SkillsState,
} from "./skills";

function createState(overrides: Partial<SkillsState> = {}): SkillsState {
  return {
    client: null,
    connected: true,
    skillsLoading: false,
    skillsReport: null,
    skillsError: null,
    skillsBusyKey: null,
    skillEdits: {},
    skillMessages: {},
    skillsSettingsOpen: false,
    skillsSettingsSkillId: null,
    skillsSettingsSchema: null,
    skillsSettingsUiHints: null,
    skillsSettingsCurrentConfig: null,
    skillsSettingsLoading: false,
    skillsSettingsSaving: false,
    skillsSettingsFormValues: {},
    skillsSettingsEnvVars: [],
    ...overrides,
  };
}

function mockClient(overrides: Partial<{ request: ReturnType<typeof vi.fn> }> = {}) {
  return {
    request: overrides.request ?? vi.fn().mockResolvedValue({}),
  } as unknown as SkillsState["client"];
}

// ─── openSkillSettings / closeSkillSettings ──────────────

describe("openSkillSettings", () => {
  it("opens panel and loads config schema", async () => {
    const configSchema = { properties: { key: { type: "string" } } };
    const uiHints = { key: { label: "Key" } };
    const currentConfig = { key: "value" };
    const request = vi.fn().mockResolvedValue({ configSchema, uiHints, currentConfig });
    const client = mockClient({ request });
    const state = createState({ client });
    await openSkillSettings(state, "my-skill");
    expect(request).toHaveBeenCalledWith("skills.configSchema", { skillId: "my-skill" });
    expect(state.skillsSettingsOpen).toBe(true);
    expect(state.skillsSettingsSkillId).toBe("my-skill");
    expect(state.skillsSettingsSchema).toEqual(configSchema);
    expect(state.skillsSettingsUiHints).toEqual(uiHints);
    expect(state.skillsSettingsFormValues).toEqual(currentConfig);
    expect(state.skillsSettingsLoading).toBe(false);
  });

  it("initializes env vars from config.env", async () => {
    const currentConfig = { env: { API_KEY: "abc", SECRET: "xyz" } };
    const request = vi.fn().mockResolvedValue({ currentConfig });
    const client = mockClient({ request });
    const state = createState({ client });
    await openSkillSettings(state, "s1");
    expect(state.skillsSettingsEnvVars).toEqual([
      { key: "API_KEY", value: "abc" },
      { key: "SECRET", value: "xyz" },
    ]);
  });

  it("sets error on failure", async () => {
    const client = mockClient({ request: vi.fn().mockRejectedValue(new Error("schema fail")) });
    const state = createState({ client });
    await openSkillSettings(state, "s1");
    expect(state.skillsError).toBe("schema fail");
    expect(state.skillsSettingsLoading).toBe(false);
  });
});

describe("closeSkillSettings", () => {
  it("resets all settings panel state", () => {
    const state = createState({
      skillsSettingsOpen: true,
      skillsSettingsSkillId: "s1",
      skillsSettingsSchema: { properties: {} },
      skillsSettingsFormValues: { foo: "bar" },
      skillsSettingsEnvVars: [{ key: "K", value: "V" }],
    });
    closeSkillSettings(state);
    expect(state.skillsSettingsOpen).toBe(false);
    expect(state.skillsSettingsSkillId).toBeNull();
    expect(state.skillsSettingsSchema).toBeNull();
    expect(state.skillsSettingsFormValues).toEqual({});
    expect(state.skillsSettingsEnvVars).toEqual([]);
  });
});

// ─── updateSettingsField ─────────────────────────────────

describe("updateSettingsField", () => {
  it("updates a form field", () => {
    const state = createState({ skillsSettingsFormValues: { a: 1 } });
    updateSettingsField(state, "b", 2);
    expect(state.skillsSettingsFormValues).toEqual({ a: 1, b: 2 });
  });
});

// ─── env var management ──────────────────────────────────

describe("env var management", () => {
  it("updateSettingsEnvVar updates at index", () => {
    const state = createState({
      skillsSettingsEnvVars: [{ key: "A", value: "1" }],
    });
    updateSettingsEnvVar(state, 0, "B", "2");
    expect(state.skillsSettingsEnvVars[0]).toEqual({ key: "B", value: "2" });
  });

  it("addSettingsEnvVar adds empty row", () => {
    const state = createState({ skillsSettingsEnvVars: [] });
    addSettingsEnvVar(state);
    expect(state.skillsSettingsEnvVars).toHaveLength(1);
    expect(state.skillsSettingsEnvVars[0]).toEqual({ key: "", value: "" });
  });

  it("removeSettingsEnvVar removes at index", () => {
    const state = createState({
      skillsSettingsEnvVars: [
        { key: "A", value: "1" },
        { key: "B", value: "2" },
      ],
    });
    removeSettingsEnvVar(state, 0);
    expect(state.skillsSettingsEnvVars).toHaveLength(1);
    expect(state.skillsSettingsEnvVars[0].key).toBe("B");
  });
});

// ─── saveSkillSettings ───────────────────────────────────

describe("saveSkillSettings", () => {
  it("sends env vars and closes panel", async () => {
    const request = vi.fn().mockResolvedValue({});
    const client = mockClient({ request });
    const state = createState({
      client,
      skillsSettingsOpen: true,
      skillsSettingsSkillId: "my-skill",
      skillsSettingsEnvVars: [{ key: "API_KEY", value: "secret" }],
    });
    await saveSkillSettings(state);
    expect(request).toHaveBeenCalledWith("skills.update", {
      skillKey: "my-skill",
      env: { API_KEY: "secret" },
    });
    expect(state.skillsSettingsOpen).toBe(false);
    expect(state.skillsSettingsSaving).toBe(false);
  });

  it("skips empty env var keys", async () => {
    const request = vi.fn().mockResolvedValue({});
    const client = mockClient({ request });
    const state = createState({
      client,
      skillsSettingsOpen: true,
      skillsSettingsSkillId: "s1",
      skillsSettingsEnvVars: [
        { key: "", value: "ignored" },
        { key: "VALID", value: "kept" },
      ],
    });
    await saveSkillSettings(state);
    expect(request).toHaveBeenCalledWith("skills.update", {
      skillKey: "s1",
      env: { VALID: "kept" },
    });
  });

  it("omits env when no vars", async () => {
    const request = vi.fn().mockResolvedValue({});
    const client = mockClient({ request });
    const state = createState({
      client,
      skillsSettingsOpen: true,
      skillsSettingsSkillId: "s1",
      skillsSettingsEnvVars: [],
    });
    await saveSkillSettings(state);
    expect(request).toHaveBeenCalledWith("skills.update", {
      skillKey: "s1",
      env: undefined,
    });
  });

  it("does nothing without skillId", async () => {
    const client = mockClient();
    const state = createState({ client, skillsSettingsSkillId: null });
    await saveSkillSettings(state);
    expect(client!.request).not.toHaveBeenCalled();
  });
});
