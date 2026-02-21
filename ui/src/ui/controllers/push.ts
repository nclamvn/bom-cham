// Push notification controller (P1-4)

export async function registerPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // Create new subscription (VAPID key would be configured server-side)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, applicationServerKey would come from the gateway config
      });
    }

    return true;
  } catch {
    return false;
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isPushGranted(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}
