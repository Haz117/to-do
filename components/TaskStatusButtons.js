// components/TaskStatusButtons.js
// Botones para cambiar el estado de las tareas (solo para operativos)
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import RippleButton from './RippleButton';
import { hapticLight } from '../utils/haptics';

const statusFlow = {
  'pendiente': { 
    next: 'en_proceso', 
    label: 'Iniciar Tarea', 
    icon: 'play-circle', 
    gradient: ['#007AFF', '#0051D5'],
    iconBg: '#E3F2FD'
  },
  'en_proceso': { 
    next: 'en_revision', 
    label: 'Enviar a Revisión', 
    icon: 'eye', 
    gradient: ['#AF52DE', '#8E24AA'],
    iconBg: '#F3E5F5'
  },
  'en_revision': { 
    next: 'cerrada', 
    label: 'Completar', 
    icon: 'checkmark-circle', 
    gradient: ['#34C759', '#2CA64D'],
    iconBg: '#E8F5E9'
  },
  'cerrada': { 
    next: 'pendiente', 
    label: 'Reabrir', 
    icon: 'refresh-circle', 
    gradient: ['#FF9500', '#FF6B00'],
    iconBg: '#FFF3E0'
  }
};

export default function TaskStatusButtons({ currentStatus, taskId, onStatusChange }) {
  const { theme } = useTheme();
  const nextState = statusFlow[currentStatus || 'pendiente'];
  
  if (!nextState) return null;
  
  const handlePress = () => {
    hapticLight();
    onStatusChange(taskId, nextState.next);
  };
  
  return (
    <View style={styles.container}>
      <RippleButton 
        onPress={handlePress}
        style={styles.buttonWrapper}
        rippleColor="rgba(255,255,255,0.5)"
      >
        <LinearGradient
          colors={nextState.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <View style={[styles.iconCircle, { backgroundColor: nextState.iconBg }]}>
            <Ionicons name={nextState.icon} size={18} color={nextState.gradient[0]} />
          </View>
          <Text style={styles.buttonText}>{nextState.label}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" style={styles.arrowIcon} />
        </LinearGradient>
      </RippleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  buttonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  arrowIcon: {
    opacity: 0.9,
  },
});
