// contexts/ThemeContext.js
// Contexto para manejar el tema (claro/oscuro) de la aplicación
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Retornar tema por defecto en lugar de lanzar error
    return {
      isDark: false,
      toggleTheme: () => {},
      theme: {
        primary: '#9F2241',
        primaryLight: '#B8314F',
        primaryDark: '#7A1A32',
        background: '#FFFFFF',
        surface: '#F8F9FA',
        card: '#FFFFFF',
        text: '#1C1C1E',
        textSecondary: '#6E6E73',
        border: '#E5E5EA',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        info: '#007AFF',
      }
    };
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
    // ========== COLORES PRINCIPALES ==========
    primary: isDark ? '#B8314F' : '#9F2241',
    primaryLight: isDark ? '#C75064' : '#C72C54',
    primaryDark: isDark ? '#9F2241' : '#7A1A32',
    primaryAlpha: isDark ? 'rgba(184, 49, 79, 0.15)' : 'rgba(159, 34, 65, 0.15)',
    
    // Colores secundarios
    secondary: isDark ? '#6B7FFF' : '#5B7BFF',
    secondaryLight: isDark ? '#8FA2FF' : '#7A97FF',
    secondaryDark: isDark ? '#5766E0' : '#4A62D9',
    
    accent: isDark ? '#FFD93D' : '#FFB800',
    accentLight: isDark ? '#FFE770' : '#FFC933',
    accentDark: isDark ? '#E0BD00' : '#CC9900',
    
    // ========== FONDOS ==========
    background: isDark ? '#0F0F10' : '#FAFAFA',
    backgroundSecondary: isDark ? '#1A1A1D' : '#FFFFFF',
    backgroundTertiary: isDark ? '#242428' : '#F5F5F7',
    card: isDark ? '#1A1A1D' : '#FFFFFF',
    cardElevated: isDark ? '#242428' : '#FFFFFF',
    
    // Glassmorphism
    glass: isDark ? 'rgba(26, 26, 29, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    glassStrong: isDark ? 'rgba(26, 26, 29, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    glassLight: isDark ? 'rgba(26, 26, 29, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    
    // ========== TEXTOS ==========
    text: isDark ? '#FFFFFF' : '#18181B',
    textSecondary: isDark ? '#C7C7CC' : '#6B7280',
    textTertiary: isDark ? '#8E8E93' : '#9CA3AF',
    textMuted: isDark ? '#636366' : '#D1D5DB',
    textInverted: isDark ? '#18181B' : '#FFFFFF',
    
    // ========== BORDES Y SEPARADORES ==========
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    borderLight: isDark ? '#38383A' : '#F3F4F6',
    borderStrong: isDark ? '#48484A' : '#D1D5DB',
    divider: isDark ? '#2C2C2E' : '#E5E7EB',
    
    // ========== ESTADOS ==========
    success: isDark ? '#30D158' : '#10B981',
    successLight: isDark ? '#5DE27E' : '#34D399',
    successDark: isDark ? '#28A745' : '#059669',
    successAlpha: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(16, 185, 129, 0.15)',
    
    error: isDark ? '#FF453A' : '#EF4444',
    errorLight: isDark ? '#FF6961' : '#F87171',
    errorDark: isDark ? '#D93025' : '#DC2626',
    errorAlpha: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(239, 68, 68, 0.15)',
    
    warning: isDark ? '#FFD60A' : '#F59E0B',
    warningLight: isDark ? '#FFDE3D' : '#FBBF24',
    warningDark: isDark ? '#D9B300' : '#D97706',
    warningAlpha: isDark ? 'rgba(255, 214, 10, 0.15)' : 'rgba(245, 158, 11, 0.15)',
    
    info: isDark ? '#0A84FF' : '#3B82F6',
    infoLight: isDark ? '#409CFF' : '#60A5FA',
    infoDark: isDark ? '#0071E3' : '#2563EB',
    infoAlpha: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(59, 130, 246, 0.15)',
    
    // ========== PRIORIDADES ==========
    priorityHigh: isDark ? '#FF453A' : '#EF4444',
    priorityHighBg: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(239, 68, 68, 0.1)',
    priorityMedium: isDark ? '#FFD60A' : '#F59E0B',
    priorityMediumBg: isDark ? 'rgba(255, 214, 10, 0.15)' : 'rgba(245, 158, 11, 0.1)',
    priorityLow: isDark ? '#30D158' : '#10B981',
    priorityLowBg: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(16, 185, 129, 0.1)',
    
    // ========== ESTADOS DE TAREAS ==========
    statusPending: isDark ? '#FF9F0A' : '#FF9800',
    statusPendingBg: isDark ? 'rgba(255, 159, 10, 0.15)' : 'rgba(255, 152, 0, 0.1)',
    statusInProgress: isDark ? '#0A84FF' : '#2196F3',
    statusInProgressBg: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(33, 150, 243, 0.1)',
    statusReview: isDark ? '#BF5AF2' : '#9C27B0',
    statusReviewBg: isDark ? 'rgba(191, 90, 242, 0.15)' : 'rgba(156, 39, 176, 0.1)',
    statusClosed: isDark ? '#30D158' : '#4CAF50',
    statusClosedBg: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    
    // ========== GRADIENTES ==========
    gradientPrimary: isDark ? ['#FF6B9D', '#E0578A', '#C7456F'] : ['#9F2241', '#C72C54', '#7A1A32'],
    gradientSecondary: isDark ? ['#1A1A1D', '#242428'] : ['#FFFFFF', '#FAFAFA'],
    gradientHeader: isDark ? ['#1A1A1D', '#0F0F10'] : ['#9F2241', '#C72C54', '#B8314F'],
    gradientSuccess: isDark ? ['#30D158', '#28A745'] : ['#10B981', '#059669'],
    gradientWarning: isDark ? ['#FFD60A', '#D9B300'] : ['#F59E0B', '#D97706'],
    gradientError: isDark ? ['#FF453A', '#D93025'] : ['#EF4444', '#DC2626'],
    gradientInfo: isDark ? ['#0A84FF', '#0071E3'] : ['#3B82F6', '#2563EB'],
    gradientOverlay: isDark ? ['rgba(15,15,16,0)', 'rgba(15,15,16,0.9)'] : ['rgba(255,255,255,0)', 'rgba(250,250,250,0.9)'],
    
    // ========== SOMBRAS ==========
    shadow: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.08)',
    shadowMedium: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.12)',
    shadowStrong: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.18)',
    shadowColored: isDark ? 'rgba(255, 107, 157, 0.3)' : 'rgba(159, 34, 65, 0.2)',
    
    // ========== OVERLAYS ==========
    overlay: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)',
    overlayLight: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
    overlayStrong: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.7)',
    
    // ========== INPUTS ==========
    inputBackground: isDark ? '#1A1A1D' : '#FFFFFF',
    inputBorder: isDark ? '#38383A' : '#E5E7EB',
    inputBorderFocused: isDark ? '#FF6B9D' : '#9F2241',
    inputPlaceholder: isDark ? '#8E8E93' : '#9CA3AF',
    inputText: isDark ? '#FFFFFF' : '#18181B',
    
    // ========== BOTONES ==========
    buttonPrimaryBg: isDark ? '#FF6B9D' : '#9F2241',
    buttonPrimaryText: '#FFFFFF',
    buttonSecondaryBg: isDark ? '#242428' : '#F5F5F7',
    buttonSecondaryText: isDark ? '#FFFFFF' : '#18181B',
    buttonGhostBg: 'transparent',
    buttonGhostText: isDark ? '#FF6B9D' : '#9F2241',
    buttonDisabledBg: isDark ? '#2C2C2E' : '#E5E7EB',
    buttonDisabledText: isDark ? '#636366' : '#9CA3AF',
    
    // ========== SKELETON/SHIMMER ==========
    shimmerBase: isDark ? '#242428' : '#F3F4F6',
    shimmerHighlight: isDark ? '#2C2C2E' : '#E5E7EB',
    
    // ========== BADGES ==========
    badgeBackground: isDark ? '#242428' : '#F3F4F6',
    badgeText: isDark ? '#FFFFFF' : '#18181B',
    
    // ========== SUPERFICIES ==========
    surface: isDark ? '#1A1A1D' : '#FFFFFF',
    surfaceVariant: isDark ? '#2C2C2C' : '#FFFAF0',
    
    // Sombras adicionales
    shadowColor: isDark ? '#000000' : '#000000',
    
    // Iconos
    icon: isDark ? '#FFFFFF' : '#9F2241',
    iconInactive: isDark ? '#808080' : '#8E8E93',
    
    isDark,
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
