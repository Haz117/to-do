// components/SkeletonLoader.js
// Skeleton loader animado con shimmer effect profesional
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SkeletonLoader({ type = 'card', count = 3 }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  const ShimmerOverlay = () => (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );

  if (type === 'bento') {
    return (
      <View style={styles.bentoContainer}>
        {/* Fila 1: Grande + Mediano */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoLarge, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
          <View style={[styles.bentoMedium, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
        </View>
        
        {/* Fila 2: 3 pequeños */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoSmall, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
          <View style={[styles.bentoSmall, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
          <View style={[styles.bentoSmall, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
        </View>
        
        {/* Fila 3: Ancho */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoWide, styles.shimmerContainer]}>
            <ShimmerOverlay />
          </View>
        </View>
      </View>
    );
  }

  if (type === 'card') {
    return (
      <View style={styles.cardContainer}>
        {[...Array(count)].map((_, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.titleSkeleton, styles.shimmerContainer]}>
                <ShimmerOverlay />
              </View>
              <View style={[styles.badgeSkeleton, styles.shimmerContainer]}>
                <ShimmerOverlay />
              </View>
            </View>
            <View style={[styles.metaSkeleton, styles.shimmerContainer]}>
              <ShimmerOverlay />
            </View>
            <View style={[styles.metaSmallSkeleton, styles.shimmerContainer]}>
              <ShimmerOverlay />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
    width: 350,
  },
  bentoContainer: {
    gap: 14,
    marginBottom: 32,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  bentoLarge: {
    flex: 2,
    minHeight: 180,
    backgroundColor: '#E5E5EA',
    borderRadius: 28,
  },
  bentoMedium: {
    flex: 1,
    minHeight: 180,
    backgroundColor: '#E5E5EA',
    borderRadius: 28,
  },
  bentoSmall: {
    flex: 1,
    minHeight: 140,
    backgroundColor: '#E5E5EA',
    borderRadius: 28,
  },
  bentoWide: {
    flex: 1,
    minHeight: 110,
    backgroundColor: '#E5E5EA',ñ
    borderRadius: 28,
  },
  cardContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFAF0',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F5DEB3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSkeleton: {
    width: '60%',
    height: 20,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
  },
  badgeSkeleton: {
    width: 70,
    height: 30,
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
  },
  metaSkeleton: {
    width: '80%',
    height: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    marginBottom: 8,
  },
  metaSmallSkeleton: {
    width: '40%',
    height: 14,
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
  },
});
