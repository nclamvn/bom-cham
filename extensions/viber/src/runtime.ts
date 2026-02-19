import type { PluginRuntime } from "openclaw/plugin-sdk";

let runtime: PluginRuntime | null = null;

export function setViberRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getViberRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Viber runtime not initialized");
  }
  return runtime;
}
