import { html } from "lit";
import { icons } from "../icons";
import { t } from "../i18n";
import type { Tab } from "../navigation";

function getGreeting(): string {
  const hour = new Date().getHours();
  const tr = (t() as any).eldercare?.greeting;
  if (hour >= 5 && hour < 11) return tr?.morning ?? "Chao buoi sang!";
  if (hour >= 11 && hour < 14) return tr?.noon ?? "Chao buoi trua!";
  if (hour >= 14 && hour < 18) return tr?.afternoon ?? "Chao buoi chieu!";
  if (hour >= 18 && hour < 22) return tr?.evening ?? "Chao buoi toi!";
  return tr?.night ?? "Khuya roi, nghi ngoi nhe!";
}

type HomeProps = {
  connected: boolean;
  onNavigate: (tab: Tab, preset?: string) => void;
};

export function renderEldercareHome(props: HomeProps) {
  const tr = (t() as any).eldercare?.home;
  const greeting = getGreeting();

  const gridButton = (icon: keyof typeof icons, label: string, tab: Tab, preset?: string) => html`
    <button
      class="eldercare-grid-btn"
      ?disabled=${!props.connected}
      @click=${() => props.onNavigate(tab, preset)}
      aria-label=${label}
    >
      <span class="icon" aria-hidden="true">${icons[icon]}</span>
      <span class="label">${label}</span>
    </button>
  `;

  return html`
    <div class="eldercare-home">
      <div class="eldercare-greeting">${greeting}</div>
      <nav class="eldercare-grid" role="navigation" aria-label="Chuc nang chinh">
        ${gridButton("messageSquare", tr?.chat ?? "Noi chuyen", "chat", "companion")}
        ${gridButton("pill", tr?.medication ?? "Thuoc", "chat", "medication")}
        ${gridButton("music", tr?.music ?? "Nghe nhac", "chat", "entertainment")}
        ${gridButton("phone", tr?.family ?? "Goi gia dinh", "channels")}
      </nav>
    </div>
  `;
}
