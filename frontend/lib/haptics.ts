import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ok = Platform.OS === 'ios' || Platform.OS === 'android';

export const tap = () => { if (ok) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
export const select = () => { if (ok) Haptics.selectionAsync(); };
export const commit = () => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };
export const warn = () => { if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); };
