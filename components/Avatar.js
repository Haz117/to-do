// components/Avatar.js
// Avatar con iniciales y color dinámico por usuario
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Función para generar color basado en el nombre
const getColorFromName = (name = '') => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
    '#6C5B7B', '#355C7D', '#99B898', '#FECEAB', '#E84A5F',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Función para obtener iniciales
const getInitials = (name = '') => {
  if (!name || name.trim() === '') return '?';
  
  const parts = name.trim().split(' ').filter(Boolean);
  
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function Avatar({ 
  name, 
  size = 40, 
  style,
  textStyle,
  backgroundColor,
  showBorder = false,
  borderColor = '#FFFFFF'
}) {
  const initials = getInitials(name);
  const bgColor = backgroundColor || getColorFromName(name);
  const fontSize = size * 0.4;

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: bgColor,
          borderWidth: showBorder ? 2 : 0,
          borderColor: borderColor,
        },
        style
      ]}
    >
      <Text 
        style={[
          styles.initials, 
          { fontSize },
          textStyle
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
