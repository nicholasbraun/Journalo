import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { TimeOfDay } from '@journal/core';

// The daily-reminder adapter: the only module that touches expo-notifications. It keeps
// the OS notification state in sync with the user's reminder setting, and is deliberately
// "dumb" — the notification merely prompts the user to open the app (ARCHITECTURE.md):
// it carries no data and offers no quick-log action, so the quick-log screen stays the
// single logging surface.
//
// Verified against the SDK 56 docs (https://docs.expo.dev/versions/v56.0.0/sdk/notifications/),
// not memory. expo-notifications is a native module, so a JS-only reload after adding it
// will not work — a fresh dev build is required.

// Android groups notifications into channels; a daily local notification needs one to be
// delivered reliably. iOS ignores this.
const ANDROID_CHANNEL_ID = 'daily-reminder';

// Control how the reminder behaves if it fires while the app is foregrounded. We show the
// banner/list entry but stay silent (no sound, no badge): it is a gentle nudge, and the
// user is already in the app. `shouldShowAlert` is deprecated in SDK 56 in favor of the
// explicit banner/list pair, so we set those.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Ensure the reminder can actually be delivered. Returns whether permission is granted, so
// the caller can reconcile the toggle with reality (a user who declines at the OS prompt
// can't have a reminder, regardless of the in-app setting). On Android 13+ this triggers
// the POST_NOTIFICATIONS runtime prompt.
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  // Re-requesting after a hard denial is a no-op on iOS, but asking again when the status
  // is merely undetermined is the whole point — so always go through request here.
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// Replace any existing schedule with a single daily reminder at `time`. We cancel-all first
// rather than track identifiers: there is exactly one reminder in this app, so clearing the
// slate keeps changing the time idempotent and immune to orphaned schedules from a crash or
// an older build.
export async function scheduleDailyReminder(time: TimeOfDay): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily check-in',
      body: 'Take a moment to log today.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
}

// Remove the reminder. Same cancel-all rationale as scheduleDailyReminder: there is only
// ever the one schedule to clear.
export async function cancelReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
