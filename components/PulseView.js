// components/PulseView.js
// Vista con animación de pulso continua - Útil para llamar atención
import React, { useEffect, useRef, memo } from 'react';
import { Animated } from 'react-native';

const PulseView = memo(function PulseView({ 
  children, 
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1000,
  style = {},
  enabled = true
}) {
  const pulseAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    if (!enabled) {
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: minScale,
          duration,
          useNativeDriver: true,
        })
      ])
    );
    
    pulse.start();
    return () => pulse.stop();
  }, [enabled, minScale, maxScale, duration]);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }, style]}>
      {children}
    </Animated.View>
  );
});

export default PulseView;
