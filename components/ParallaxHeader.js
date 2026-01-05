// components/ParallaxHeader.js
// Header con efecto parallax en scroll
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const ParallaxHeader = ({ 
  scrollY,
  children,
  backgroundComponent,
  colors = ['#6366F1', '#8B5CF6'],
}) => {
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE / 2],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.header,
        {
          height: headerHeight,
          transform: [{ translateY: headerTranslate }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.backgroundContainer,
          { opacity: imageOpacity },
        ]}
      >
        <LinearGradient
          colors={colors}
          style={StyleSheet.absoluteFillObject}
        >
          {backgroundComponent}
        </LinearGradient>
      </Animated.View>
      
      <View style={styles.contentContainer}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
});

export default ParallaxHeader;
