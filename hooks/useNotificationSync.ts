import { useEffect } from 'react';
import { notificationsSupported, requestNotificationPermission, syncNotifications } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';

/** Keeps scheduled reminders in step with the store. Mount once, after hydration. */
export function useNotificationSync() {
  useEffect(() => {
    if (!notificationsSupported) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Serialized so two syncs never interleave their cancel-all/schedule steps.
    let chain = Promise.resolve();
    const run = () => {
      chain = chain
        .then(() => syncNotifications(useAppStore.getState()))
        .catch((err) => console.warn('Reminder sync failed', err));
    };

    if (useAppStore.getState().settings.notificationsEnabled) {
      requestNotificationPermission().then(run, run);
    } else run();

    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.events === prev.events && s.classes === prev.classes && s.settings === prev.settings) return;
      clearTimeout(timer);
      timer = setTimeout(run, 600);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
