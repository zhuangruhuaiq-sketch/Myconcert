import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export function useNotificationRouting() {
  useEffect(() => {
    const navigate = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.eventId;
      if (typeof id === "string")
        router.push({ pathname: "/event/[id]", params: { id } });
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(navigate)
      .catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => sub.remove();
  }, []);
}
