// utils/responsive.js
// Hooks y utilidades para responsive design

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { BREAKPOINTS, getColumnCount, getResponsivePadding, getResponsiveValue } from '../theme/tokens';

// Hook para detectar cambios de tamaño de pantalla
export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;
  const isWeb = Platform.OS === 'web';

  return {
    width,
    height,
    isWeb,
    isMobile: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
    isDesktopLarge: width >= BREAKPOINTS.desktopLarge,
    columns: getColumnCount(width),
    padding: getResponsivePadding(width),
    getValue: (values) => getResponsiveValue(width, values),
  };
};

// Helper para estilos responsive
export const responsiveStyle = (screenWidth, styles) => {
  if (screenWidth >= BREAKPOINTS.desktopLarge) {
    return { ...styles.base, ...styles.desktopLarge };
  }
  if (screenWidth >= BREAKPOINTS.desktop) {
    return { ...styles.base, ...styles.desktop };
  }
  if (screenWidth >= BREAKPOINTS.tablet) {
    return { ...styles.base, ...styles.tablet };
  }
  return { ...styles.base, ...styles.mobile };
};

// Helper para obtener ancho de columna en grid
export const getGridColumnWidth = (screenWidth, columns, gap = 16, padding = 32) => {
  const availableWidth = screenWidth - padding - (gap * (columns - 1));
  return availableWidth / columns;
};

// Helper para decidir layout (list o grid)
export const shouldUseGridLayout = (screenWidth) => {
  return screenWidth >= BREAKPOINTS.tablet;
};
