"use client";

import { useEffect, useState } from "react";

/**
 * Gerenciador de Push Notifications — solicita permissão, subscribe/unsubscribe
 * e envia subscription para o backend.
 *
 * Requiere VAPID_PUBLIC_KEY em NEXT_PUBLIC_VAPID_PUBLIC_KEY.
 */
export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Verificar subscription existente
    checkExistingSubscription();

    // Listen for sync message from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_PENDING_SUBSCRIPTION") {
        syncPendingSubscription();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const syncPendingSubscription = async () => {
    try {
      const pending = localStorage.getItem("pending_push_subscription");
      if (pending) {
        const subscription = JSON.parse(pending);
        await saveSubscriptionToBackend(subscription as unknown as PushSubscription);
        localStorage.removeItem("pending_push_subscription");
      }
    } catch (error) {
      console.error("Error syncing pending subscription:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const urlBase64ToBufferSource = (base64String: string): ArrayBuffer => {
    const uint8Array = urlBase64ToUint8Array(base64String);
    return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
  };

  const subscribeToPush = async () => {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      console.error("VAPID_PUBLIC_KEY not configured");
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBufferSource(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);
      setPermission("granted");

      // Enviar subscription para o backend
      await saveSubscriptionToBackend(sub);
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setPermission("denied");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        setPermission("default");

        // Remover subscription do backend
        await removeSubscriptionFromBackend(subscription);
      }
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSubscriptionToBackend = async (sub: PushSubscription) => {
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
        }),
      });

      if (!response.ok) {
        console.error("Failed to save subscription to backend");
      }
    } catch (error) {
      console.error("Error saving subscription:", error);
      // In mock mode or offline, subscription is saved locally for when connection returns
      localStorage.setItem("pending_push_subscription", JSON.stringify(sub.toJSON()));
    }
  };

  const removeSubscriptionFromBackend = async (sub: PushSubscription) => {
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
        }),
      });

      if (!response.ok) {
        console.error("Failed to remove subscription from backend");
      }
    } catch (error) {
      console.error("Error removing subscription:", error);
    }
  };

  // Não renderizar nada se não suportado ou se já tiver permissão granted
  if (!isSupported || permission === "granted") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg border border-ink-700 bg-ink-950/95 p-4 shadow-xl backdrop-blur-sm">
        <p className="mb-3 text-sm text-slate-300">
          Receba notificações sobre atualizações de sinais escatológicos
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={subscribeToPush}
            disabled={loading || permission === "denied"}
            className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ativando..." : "Ativar notificações"}
          </button>
          <button
            type="button"
            onClick={() => setPermission("denied")}
            className="rounded border border-ink-600 px-3 py-1.5 text-xs text-slate-400 hover:border-ink-500 hover:text-slate-300"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
