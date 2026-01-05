// components/Toast.js
// Componente de Toast para feedback visual de acciones
// Ahora con soporte para acciones y swipe to dismiss
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Toast = ({ 
  message, 
  type = 'success', 
  visible, 
  onHide, 
  duration = 3000,
  action = null, // { label: string, onPress: function }
  swipeToDismiss = true 
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;

  // PanResponder para swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => swipeToDismiss,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return swipeToDismiss && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (swipeToDismiss) {
          swipeX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          // Swipe suficientemente lejos, ocultar
          Animated.timing(swipeX, {
            toValue: gestureState.dx > 0 ? 500 : -500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            swipeX.setValue(0);
            hideToast();
          });
        } else {
          // Volver a posición original
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      swipeX.setValue(0);
      // Mostrar
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // Ocultar automáticamente
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return '#34C759';
      case 'error': return '#FF3B30';
      case 'warning': return '#FF9500';
      case 'info': return '#5856D6';
      default: return '#34C759';
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{ translateY }, { translateX: swipeX }],
          opacity,
          backgroundColor: getColor()
        }
      ]}
    >
      <Ionicons name={getIcon()} size={24} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      
      {action && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            hideToast();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999
  },
  icon: {
    marginRight: 12
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  actionButton: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3
  }
});

export default Toast;
