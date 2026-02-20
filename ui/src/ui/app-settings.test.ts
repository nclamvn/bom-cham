import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Tab } from "./navigation";
import { setTabFromRoute } from "./app-settings";

type SettingsHost = Parameters<typeof setTabFromRoute>[0] & {
  logsPollInterval: number | null;
};

const createHost = (tab: Tab): SettingsHost => ({
  settings: {
    gatewayUrl: "",
    token: "",
    sessionKey: "main",
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navGroupsCollapsed: {},
  },
  theme: "system",
  themeResolved: "dark",
  applySessionKey: "main",
  sessionKey: "main",
  tab,
  connected: false,
  chatHasAutoScrolled: false,
  logsAtBottom: false,
  eventLog: [],
  eventLogBuffer: [],
  basePath: "",
  themeMedia: null,
  themeMediaHandler: null,
  logsPollInterval: null,
});

describe("setTabFromRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops log polling when switching tabs", () => {
    const host = createHost("chat");
    // Simulate an active polling interval
    host.logsPollInterval = window.setInterval(() => {}, 2000);
    expect(host.logsPollInterval).not.toBeNull();

    setTabFromRoute(host, "overview");
    expect(host.logsPollInterval).toBeNull();
  });
});
