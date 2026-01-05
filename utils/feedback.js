/**
 * Utility functions for user feedback (Toast notifications and Haptic feedback)
 */

import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

/**
 * Show a success toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: 'Éxito')
 */
export const showSuccess = (message, title = 'Éxito') => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'top',
    topOffset: 60,
  });
  
  // Haptic feedback for success
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Show an error toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: '❌ Error')
 */
export const showError = (message, title = '❌ Error') => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: 4000,
    position: 'top',
    topOffset: 60,
  });
  
  // Haptic feedback for error
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Show an info toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: 'ℹ️ Info')
 */
export const showInfo = (message, title = 'ℹ️ Info') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'top',
    topOffset: 60,
  });
  
  // Light haptic feedback
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Show a warning toast message
 * @param {string} message - Message to display
 * @param {string} title - Optional title (default: '⚠️ Advertencia')
 */
export const showWarning = (message, title = '⚠️ Advertencia') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: 3500,
    position: 'top',
    topOffset: 60,
  });
  
  // Warning haptic feedback
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Haptic feedback for button press
 */
export const hapticLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Haptic feedback for important actions
 */
export const hapticMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Haptic feedback for critical actions (delete, etc.)
 */
export const hapticHeavy = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Haptic feedback for selection changes
 */
export const hapticSelection = () => {
  Haptics.selectionAsync();
};
