import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";

import { viberPlugin } from "./src/channel.js";
import { handleViberWebhookRequest } from "./src/monitor.js";
import { setViberRuntime } from "./src/runtime.js";

const plugin = {
  id: "viber",
  name: "Viber",
  description: "Viber channel plugin (Bot API)",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setViberRuntime(api.runtime);
    api.registerChannel({ plugin: viberPlugin });
    api.registerHttpHandler(handleViberWebhookRequest);
  },
};

export default plugin;
