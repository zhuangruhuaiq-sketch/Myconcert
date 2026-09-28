import { useEffect } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";
import type * as Notifications from "expo-notifications";

export function useNotificationRouting() {
  useEffect(() => {
    if (Constants.appOwnership === "expo") return;

    let active = true;
    let removeSubscription: (() => void) | undefined;
    const navigate = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.eventId;
      if (typeof id === "string")
        router.push({ pathname: "/event/[id]", params: { id } });
    };
    void import("expo-notifications").then((notifications) => {
      if (!active) return;
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      void notifications.getLastNotificationResponseAsync().then(navigate).catch(() => undefined);
      const subscription = notifications.addNotificationResponseReceivedListener(navigate);
      removeSubscription = () => subscription.remove();
    });
    return () => {
      active = false;
      removeSubscription?.();
    };
  }, []);
}
