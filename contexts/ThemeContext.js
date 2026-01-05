// contexts/ThemeContext.js
// Contexto para manejar el tema (claro/oscuro) de la aplicación
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error cargando tema:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error guardando tema:', error);
    }
  };

  const theme = {
    // Colores principales
    primary: isDark ? '#FF6B6B' : '#8B0000',
    primaryLight: isDark ? '#FF8787' : '#A52A2A',
    primaryDark: isDark ? '#EE5A6F' : '#6B0000',
    
    // Fondos
    background: isDark ? '#121212' : '#F8F9FA',
    backgroundSecondary: isDark ? '#1E1E1E' : '#FFFFFF',
    backgroundTertiary: isDark ? '#2D2D2D' : '#F3F4F6',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    
    // Textos
    text: isDark ? '#FFFFFF' : '#1F2937',
    textSecondary: isDark ? '#B3B3B3' : '#6B7280',
    textTertiary: isDark ? '#808080' : '#9CA3AF',
    
    // Bordes y separadores
    border: isDark ? '#2D2D2D' : '#E5E7EB',
    borderLight: isDark ? '#404040' : '#F3F4F6',
    divider: isDark ? '#2D2D2D' : '#E5E7EB',
    
    // Estados
    success: isDark ? '#4ADE80' : '#10B981',
    error: isDark ? '#F87171' : '#EF4444',
    warning: isDark ? '#FBBF24' : '#F59E0B',
    info: isDark ? '#60A5FA' : '#3B82F6',
    
    // Prioridades
    priorityHigh: isDark ? '#F87171' : '#EF4444',
    priorityMedium: isDark ? '#FBBF24' : '#F59E0B',
    priorityLow: isDark ? '#4ADE80' : '#10B981',
    
    // Estados de tareas
    statusPending: isDark ? '#FB923C' : '#FF9800',
    statusInProgress: isDark ? '#60A5FA' : '#2196F3',
    statusReview: isDark ? '#C084FC' : '#9C27B0',
    statusClosed: isDark ? '#4ADE80' : '#4CAF50',
    
    // Gradientes (arrays para LinearGradient)
    gradientPrimary: isDark ? ['#FF6B6B', '#EE5A6F'] : ['#8B0000', '#6B0000'],
    gradientSecondary: isDark ? ['#1E1E1E', '#2D2D2D'] : ['#FFFFFF', '#F8F9FA'],
    gradientHeader: isDark ? ['#1E1E1E', '#121212'] : ['#8B0000', '#A52A2A', '#CD5C5C'],
    
    // Sombras
    shadow: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
    shadowStrong: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.2)',
    
    // Overlays
    overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    
    // Inputs
    inputBackground: isDark ? '#2D2D2D' : '#FFFFFF',
    inputBorder: isDark ? '#404040' : '#E5E7EB',
    inputPlaceholder: isDark ? '#808080' : '#9CA3AF',
    
    // Búsqueda
    searchBackground: isDark ? '#2D2D2D' : '#FFFFFF',
    searchBorder: isDark ? '#404040' : '#E5E7EB',
    
    // Botones
    buttonBackground: isDark ? '#2D2D2D' : '#F3F4F6',
    buttonText: isDark ? '#FFFFFF' : '#1F2937',
    
    // Skeleton/Shimmer
    shimmerBase: isDark ? '#2D2D2D' : '#E5E7EB',
    shimmerHighlight: isDark ? '#404040' : '#F3F4F6',
    
    // Badges
    badgeBackground: isDark ? '#2D2D2D' : '#F3F4F6',
    badgeText: isDark ? '#FFFFFF' : '#1F2937',
    
    // Superficie y variantes
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    surfaceVariant: isDark ? '#2C2C2C' : '#FFFAF0',
    
    // Sombras adicionales
    shadowColor: isDark ? '#000000' : '#000000',
    
    // Iconos
    icon: isDark ? '#FFFFFF' : '#8B0000',
    iconInactive: isDark ? '#808080' : '#8E8E93',
    
    isDark,
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
