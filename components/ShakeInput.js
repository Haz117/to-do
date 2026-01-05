// components/ShakeInput.js
// Input con animación de shake para errores y feedback visual
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TextInput, Animated, StyleSheet } from 'react-native';
import { hapticMedium } from '../utils/haptics';

const ShakeInput = forwardRef(({ 
  error = false,
  style,
  errorColor = '#FF3B30',
  ...props 
}, ref) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    shake: () => {
      triggerShake();
    },
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

  const triggerShake = () => {
    hapticMedium();
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (error) {
      triggerShake();
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(borderColorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [error]);

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E5EA', errorColor],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: shakeAnim }],
          borderColor,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[styles.input, style]}
        {...props}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
});

export default ShakeInput;
