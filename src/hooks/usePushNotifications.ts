import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Registers the device for FCM push notifications and stores the token
 * in device_push_tokens. No-op on web.
 */
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;

    let removeListeners: Array<() => void> = [];

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let status = perm.receive;
        if (status === "prompt" || status === "prompt-with-rationale") {
          const req = await PushNotifications.requestPermissions();
          status = req.receive;
        }
        if (status !== "granted") return;

        await PushNotifications.register();

        const sub1 = await PushNotifications.addListener("registration", async (t) => {
          try {
            await supabase.from("device_push_tokens").upsert(
              {
                user_id: user.id,
                token: t.value,
                platform: Capacitor.getPlatform(),
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "token" },
            );
          } catch (e) {
            console.error("token upsert failed", e);
          }
        });

        const sub2 = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error", err);
        });

        removeListeners = [() => sub1.remove(), () => sub2.remove()];
      } catch (e) {
        console.error("push init failed", e);
      }
    })();

    return () => {
      removeListeners.forEach((fn) => fn());
    };
  }, [user]);
}
