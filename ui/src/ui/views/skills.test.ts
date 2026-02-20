import { render } from "lit";
import { describe, expect, it } from "vitest";

import { renderSkills, type SkillsProps } from "./skills";
import { t } from "../i18n";

function createProps(overrides: Partial<SkillsProps> = {}): SkillsProps {
  return {
    loading: false,
    report: null,
    error: null,
    filter: "",
    edits: {},
    busyKey: null,
    messages: {},
    onFilterChange: () => undefined,
    onRefresh: () => undefined,
    onToggle: () => undefined,
    onEdit: () => undefined,
    onSaveKey: () => undefined,
    onInstall: () => undefined,
    // Settings panel
    settingsPanel: {
      open: false,
      skillId: null,
      skill: null,
      schema: null,
      uiHints: null,
      currentConfig: null,
      loading: false,
      saving: false,
      formValues: {},
      envVars: [],
      onFieldChange: () => undefined,
      onEnvChange: () => undefined,
      onEnvAdd: () => undefined,
      onEnvRemove: () => undefined,
      onSave: () => undefined,
      onClose: () => undefined,
    },
    ...overrides,
  };
}

describe("skills view", () => {
  it("hides workspace skills section when no skills", () => {
    const container = document.createElement("div");
    render(renderSkills(createProps({ report: { skills: [], workspaceDir: "", managedSkillsDir: "" } })), container);
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(0);
  });

  it("shows workspace skills section when skills exist", () => {
    const container = document.createElement("div");
    render(
      renderSkills(createProps({
        report: {
          workspaceDir: "",
          managedSkillsDir: "",
          skills: [
            {
              skillKey: "sk1",
              name: "Test Skill",
              description: "A test skill",
              source: "workspace",
              filePath: "",
              baseDir: "",
              emoji: "",
              eligible: true,
              always: false,
              disabled: false,
              blockedByAllowlist: false,
              requirements: { bins: [], env: [], config: [], os: [] },
              missing: { bins: [], env: [], config: [], os: [] },
              configChecks: [],
              install: [],
            },
          ],
        },
      })),
      container,
    );
    expect(container.textContent).toContain("Test Skill");
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(1);
  });

  it("renders title and description", () => {
    const container = document.createElement("div");
    render(
      renderSkills(createProps({
        report: {
          workspaceDir: "",
          managedSkillsDir: "",
          skills: [
            {
              skillKey: "sk1",
              name: "Skill One",
              description: "desc",
              source: "workspace",
              filePath: "",
              baseDir: "",
              emoji: "",
              eligible: true,
              always: false,
              disabled: false,
              blockedByAllowlist: false,
              requirements: { bins: [], env: [], config: [], os: [] },
              missing: { bins: [], env: [], config: [], os: [] },
              configChecks: [],
              install: [],
            },
          ],
        },
      })),
      container,
    );
    expect(container.textContent).toContain(t().skills.title);
  });
});
