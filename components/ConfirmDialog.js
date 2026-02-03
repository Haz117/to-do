// components/ConfirmDialog.js
// Diálogo de confirmación personalizado elegante
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BlurView } from 'expo-blur';

export default function ConfirmDialog({ 
  visible, 
  title = 'Confirmar', 
  message = '¿Estás seguro?',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  icon = 'help-circle',
  iconColor = '#FF9500',
  danger = false,
  onConfirm,
  onCancel 
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm && onConfirm();
  };

  const handleCancel = () => {
    onCancel && onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleCancel}
        />
        
        <Animated.View 
          style={[
            styles.dialog,
            { 
              backgroundColor: theme.card,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Icono */}
          <View style={[styles.iconContainer, { 
            backgroundColor: danger ? '#FEE2E2' : iconColor + '20' 
          }]}>
            <Ionicons 
              name={icon} 
              size={48} 
              color={danger ? '#DC2626' : iconColor} 
            />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>

          {/* Mensaje */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { 
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border 
              }]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { 
                backgroundColor: danger ? '#DC2626' : '#9F2241' 
              }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cancelButton: {
    borderColor: 'transparent',
  },
  confirmButton: {
    borderWidth: 0,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
