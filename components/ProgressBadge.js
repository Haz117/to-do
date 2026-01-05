// components/ProgressBadge.js
// Badge con barra de progreso animada
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function ProgressBadge({ 
  status = 'pendiente', 
  progress = 0, // 0 a 100
  animated = true,
  showProgress = false
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated && showProgress) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, animated, showProgress]);

  const getStatusConfig = () => {
    switch (status) {
      case 'pendiente':
        return { color: '#FF9800', label: 'Pendiente', bgColor: '#FFF3E0' };
      case 'en_proceso':
        return { color: '#2196F3', label: 'En Proceso', bgColor: '#E3F2FD' };
      case 'en_revision':
        return { color: '#9C27B0', label: 'En Revisión', bgColor: '#F3E5F5' };
      case 'cerrada':
        return { color: '#4CAF50', label: 'Completada', bgColor: '#E8F5E9' };
      default:
        return { color: '#9E9E9E', label: status, bgColor: '#F5F5F5' };
    }
  };

  const config = getStatusConfig();
  
  const animatedWidth = showProgress ? progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  }) : '0%';

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      {showProgress && progress > 0 && (
        <Animated.View 
          style={[
            styles.progressBar, 
            { 
              backgroundColor: config.color + '40',
              width: animatedWidth 
            }
          ]} 
        />
      )}
      
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
        {showProgress && progress > 0 && (
          <Text style={[styles.percentage, { color: config.color }]}>
            {Math.round(progress)}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
