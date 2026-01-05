// utils/haptics.js
// Centralizador de haptic feedback
import * as Haptics from 'expo-haptics';

export const hapticLight = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticMedium = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticHeavy = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticSuccess = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticWarning = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticError = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};

export const hapticSelection = () => {
  try {
    Haptics.selectionAsync();
  } catch (e) {
    console.warn('Haptic feedback no disponible');
  }
};
