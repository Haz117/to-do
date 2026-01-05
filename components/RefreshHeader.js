// components/RefreshHeader.js
// Header personalizado para pull-to-refresh con texto y animación
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RefreshHeader = ({ refreshing = false }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }).start();
    } else {
      rotateAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }).start();
    }
  }, [refreshing]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { rotate },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Ionicons 
          name="reload" 
          size={24} 
          color="#007AFF" 
        />
      </Animated.View>
      <Text style={styles.text}>
        {refreshing ? 'Actualizando...' : 'Desliza para actualizar'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 0.3,
  },
});

export default RefreshHeader;
