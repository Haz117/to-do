// components/FloatingActionButton.js
// FAB animado con menú expandible
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticMedium, hapticLight } from '../utils/haptics';

const FloatingActionButton = ({ 
  actions = [],
  mainIcon = 'add',
  mainColor = ['#FF6B6B', '#FF8E53'],
  bottom = 100,
  right = 20,
  size = 60,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const actionAnims = useRef(actions.map(() => new Animated.Value(0))).current;

  const toggleMenu = () => {
    hapticMedium();
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);

    Animated.parallel([
      Animated.spring(rotationAnim, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }),
      Animated.spring(scaleAnim, {
        toValue: isOpen ? 1 : 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 7,
      }),
      Animated.stagger(
        50,
        actionAnims.map(anim =>
          Animated.spring(anim, {
            toValue,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          })
        )
      ),
    ]).start();
  };

  const handleActionPress = (action) => {
    hapticLight();
    toggleMenu();
    setTimeout(() => action.onPress(), 200);
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={[styles.container, { bottom, right }]}>
      {/* Action buttons */}
      {actions.map((action, index) => {
        const translateY = actionAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(size + 10) * (index + 1)],
        });

        const opacity = actionAnims[index];
        const scale = actionAnims[index];

        return (
          <Animated.View
            key={action.label}
            style={[
              styles.actionButton,
              {
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleActionPress(action)}
              style={[styles.actionTouchable, { width: size * 0.75, height: size * 0.75 }]}
            >
              <LinearGradient
                colors={action.color || ['#6366F1', '#8B5CF6']}
                style={styles.actionGradient}
              >
                <Ionicons name={action.icon} size={size * 0.35} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          onPress={toggleMenu}
          style={[styles.mainButton, { width: size, height: size }]}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={mainColor}
            style={styles.mainGradient}
          >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name={mainIcon} size={size * 0.5} color="#FFFFFF" />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Backdrop */}
      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },
  mainButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    position: 'absolute',
    alignItems: 'center',
  },
  actionTouchable: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    right: -10000,
    bottom: -10000,
    backgroundColor: 'transparent',
    zIndex: -1,
  },
});

export default FloatingActionButton;
