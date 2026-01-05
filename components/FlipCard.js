// components/FlipCard.js
// Tarjeta con animación de flip 3D
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { hapticLight } from '../utils/haptics';

const FlipCard = ({ 
  frontComponent,
  backComponent,
  style,
  flipDuration = 600,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    hapticLight();
    
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={flipCard}
      style={style}
    >
      <View style={styles.container}>
        {/* Front */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            {
              opacity: frontOpacity,
              transform: [{ rotateY: frontInterpolate }],
            },
          ]}
        >
          {frontComponent}
        </Animated.View>

        {/* Back */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            {
              opacity: backOpacity,
              transform: [{ rotateY: backInterpolate }],
            },
          ]}
        >
          {backComponent}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    perspective: 1000,
  },
  card: {
    backfaceVisibility: 'hidden',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});

export default FlipCard;
