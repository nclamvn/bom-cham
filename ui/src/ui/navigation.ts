import type { IconName } from "./icons.js";
import { t } from "./i18n";

// Tab groups - Bờm Chăm eldercare-first layout
export const TAB_GROUPS = [
  {
    label: "care",
    labelKey: "eldercare",
    tabs: ["chat", "eldercare", "eldercare-config"],
    icon: "activity",
    shortcut: "1"
  },
  {
    label: "system",
    labelKey: "core",
    tabs: ["overview", "channels", "config"],
    icon: "messageSquare",
    shortcut: "2"
  },
  {
    label: "advanced",
    labelKey: "admin",
    tabs: ["skills", "cron", "memory"],
    icon: "settings",
    shortcut: "3"
  },
] as const;

export function getTabGroupLabel(group: (typeof TAB_GROUPS)[number]): string {
  const translations = t();
  switch (group.labelKey) {
    case "eldercare":
      return (translations.nav as Record<string, string>).eldercare ?? "Chăm sóc";
    case "core":
      return (translations.nav as Record<string, string>).core ?? "Hệ thống";
    case "admin":
      return (translations.nav as Record<string, string>).admin ?? "Nâng cao";
    default:
      return group.label.toUpperCase();
  }
}

export function getTabGroupShortcut(group: (typeof TAB_GROUPS)[number]): string {
  return (group as { shortcut?: string }).shortcut ?? "";
}

export type Tab =
  | "overview"
  | "channels"
  | "cron"
  | "skills"
  | "chat"
  | "memory"
  | "config"
  | "eldercare"
  | "eldercare-config";

const TAB_PATHS: Record<Tab, string> = {
  overview: "/overview",
  channels: "/channels",
  cron: "/cron",
  skills: "/skills",
  memory: "/memory",
  chat: "/chat",
  config: "/config",
  eldercare: "/eldercare",
  "eldercare-config": "/eldercare-config",
};

const PATH_TO_TAB = new Map(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]));

export function normalizeBasePath(basePath: string): string {
  if (!basePath) return "";
  let base = basePath.trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (base === "/") return "";
  if (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

export function normalizePath(path: string): string {
  if (!path) return "/";
  let normalized = path.trim();
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) normalized = "/";
  if (normalized === "/") return "eldercare";
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function inferBasePathFromPathname(pathname: string): string {
  let normalized = normalizePath(pathname);
  if (normalized.endsWith("/index.html")) {
    normalized = normalizePath(normalized.slice(0, -"/index.html".length));
  }
  if (normalized === "/") return "";
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  for (let i = 0; i < segments.length; i++) {
    const candidate = `/${segments.slice(i).join("/")}`.toLowerCase();
    if (PATH_TO_TAB.has(candidate)) {
      const prefix = segments.slice(0, i);
      return prefix.length ? `/${prefix.join("/")}` : "";
    }
  }
  return `/${segments.join("/")}`;
}

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    case "eldercare":
      return "activity";
    case "eldercare-config":
      return "settings";
    case "chat":
      return "messageSquare";
    case "overview":
      return "barChart";
    case "channels":
      return "link";
    case "cron":
      return "loader";
    case "memory":
      return "brain";
    case "skills":
      return "zap";
    case "config":
      return "settings";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  const translations = t();
  switch (tab) {
    case "eldercare":
      return (translations.nav as Record<string, string>).eldercare ?? "Dashboard";
    case "eldercare-config":
      return (translations.nav as Record<string, string>).eldercareConfig ?? "Cài đặt chăm sóc";
    case "overview":
      return translations.nav.overview;
    case "channels":
      return translations.nav.channels;
    case "cron":
      return translations.nav.cronJobs;
    case "memory":
      return translations.nav.memory;
    case "skills":
      return translations.nav.skills;
    case "chat":
      return translations.nav.chat;
    case "config":
      return translations.nav.config;
    default:
      return translations.nav.control;
  }
}

export function subtitleForTab(tab: Tab) {
  const subtitles = t().nav.subtitles;
  switch (tab) {
    case "eldercare":
      return (subtitles as Record<string, string>).eldercare ?? "Giám sát người thân";
    case "eldercare-config":
      return (subtitles as Record<string, string>).eldercareConfig ?? "Cài đặt chăm sóc";
    case "overview":
      return subtitles.overview;
    case "channels":
      return subtitles.channels;
    case "cron":
      return subtitles.cron;
    case "memory":
      return subtitles.memory;
    case "skills":
      return subtitles.skills;
    case "chat":
      return subtitles.chat;
    case "config":
      return subtitles.config;
    default:
      return "";
  }
}
