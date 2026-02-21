import { html, nothing } from "lit";
import { t } from "../i18n";

export type SosState = "idle" | "confirming" | "calling" | "cancelled";

export type SosButtonProps = {
  state: SosState;
  countdown: number;
  onTrigger: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
};

export function renderSosFloating(props: SosButtonProps) {
  const tr = (t() as any).sos ?? {};

  if (props.state === "idle") {
    return html`
      <button class="sos-floating" @click=${props.onTrigger} aria-label=${tr.button ?? "SOS"}>
        <span class="sos-floating__text">SOS</span>
      </button>
    `;
  }

  if (props.state === "confirming") {
    const pct = (props.countdown / 10) * 100;
    return html`
      <div class="sos-overlay" role="alertdialog" aria-modal="true" aria-label=${tr.confirmTitle ?? "Gọi cấp cứu?"}>
        <div class="sos-dialog">
          <div class="sos-dialog__title">${tr.confirmTitle ?? "Gọi cấp cứu?"}</div>
          <div class="sos-dialog__message">${tr.confirmMessage ?? "Nhấn xác nhận hoặc đợi hết giờ để gọi."}</div>
          <div class="sos-dialog__countdown">
            <div class="sos-dialog__countdown-bar" style="width: ${pct}%"></div>
          </div>
          <div class="sos-dialog__countdown-text">${tr.autoCall ?? "Tự động gọi sau"} ${props.countdown}s</div>
          <button class="sos-dialog__confirm" @click=${props.onConfirm}>
            ${tr.confirm ?? "XAC NHAN -- GOI CAP CUU"}
          </button>
          <button class="sos-dialog__cancel" @click=${props.onCancel}>
            ${tr.cancel ?? "HUY -- Toi on"}
          </button>
        </div>
      </div>
    `;
  }

  if (props.state === "calling") {
    return html`
      <div class="sos-overlay" role="alertdialog" aria-modal="true">
        <div class="sos-dialog">
          <div class="sos-dialog__title">${tr.calling ?? "Dang lien lac..."}</div>
          <div class="sos-dialog__message">${tr.placeholder ?? "Tinh nang se hoat dong trong phien ban tiep theo."}</div>
          <button class="sos-dialog__cancel" @click=${props.onClose}>
            ${tr.close ?? "Dong"}
          </button>
        </div>
      </div>
    `;
  }

  return nothing;
}
