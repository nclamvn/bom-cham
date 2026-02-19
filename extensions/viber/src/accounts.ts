import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk";

import type { ViberConfig, ViberAccountConfig } from "./types.js";

export type ViberTokenResolution = {
  token: string;
  source: "env" | "config" | "none";
};

export type ResolvedViberAccount = {
  accountId: string;
  name: string | undefined;
  enabled: boolean;
  token: string;
  tokenSource: ViberTokenResolution["source"];
  config: ViberAccountConfig;
};

function getViberConfig(cfg: OpenClawConfig): ViberConfig | undefined {
  return cfg.channels?.viber as ViberConfig | undefined;
}

function resolveViberToken(
  config: ViberConfig | undefined,
  accountId: string,
): ViberTokenResolution {
  const isDefaultAccount = accountId === DEFAULT_ACCOUNT_ID;
  const accountConfig =
    accountId !== DEFAULT_ACCOUNT_ID
      ? (config?.accounts?.[accountId] as ViberAccountConfig | undefined)
      : undefined;

  if (accountConfig?.authToken?.trim()) {
    return { token: accountConfig.authToken.trim(), source: "config" };
  }

  if (isDefaultAccount) {
    const token = config?.authToken?.trim();
    if (token) return { token, source: "config" };
    const envToken = process.env.VIBER_AUTH_TOKEN?.trim();
    if (envToken) return { token: envToken, source: "env" };
  }

  return { token: "", source: "none" };
}

function listConfiguredAccountIds(cfg: OpenClawConfig): string[] {
  const accounts = getViberConfig(cfg)?.accounts;
  if (!accounts || typeof accounts !== "object") return [];
  return Object.keys(accounts).filter(Boolean);
}

export function listViberAccountIds(cfg: OpenClawConfig): string[] {
  const ids = listConfiguredAccountIds(cfg);
  if (ids.length === 0) return [DEFAULT_ACCOUNT_ID];
  return ids.sort((a, b) => a.localeCompare(b));
}

export function resolveDefaultViberAccountId(cfg: OpenClawConfig): string {
  const ids = listViberAccountIds(cfg);
  if (ids.includes(DEFAULT_ACCOUNT_ID)) return DEFAULT_ACCOUNT_ID;
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

function mergeViberAccountConfig(cfg: OpenClawConfig, accountId: string): ViberAccountConfig {
  const raw = (cfg.channels?.viber ?? {}) as ViberConfig;
  const { accounts: _ignored, ...base } = raw;
  const account =
    accountId !== DEFAULT_ACCOUNT_ID
      ? ((raw.accounts?.[accountId] as ViberAccountConfig | undefined) ?? {})
      : {};
  return { ...base, ...account };
}

export function resolveViberAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedViberAccount {
  const accountId = normalizeAccountId(params.accountId);
  const baseEnabled = getViberConfig(params.cfg)?.enabled !== false;
  const merged = mergeViberAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const tokenResolution = resolveViberToken(getViberConfig(params.cfg), accountId);

  return {
    accountId,
    name: merged.botName?.trim() || undefined,
    enabled,
    token: tokenResolution.token,
    tokenSource: tokenResolution.source,
    config: merged,
  };
}
