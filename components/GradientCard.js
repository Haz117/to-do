// components/GradientCard.js
// Card con borde de gradiente para destacar elementos importantes
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GradientCard = ({ 
  children, 
  colors = ['#6366F1', '#8B5CF6', '#EC4899'],
  borderWidth = 2,
  borderRadius = 16,
  style,
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradientContainer,
        { borderRadius, padding: borderWidth },
        style,
      ]}
    >
      <View style={[styles.innerContainer, { borderRadius: borderRadius - borderWidth }]}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    overflow: 'hidden',
  },
  innerContainer: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});

export default GradientCard;
