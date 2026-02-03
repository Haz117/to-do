// utils/mobileStyles.js
// Estilos y configuraciones específicas para iOS y Android
import { Platform, StatusBar, Dimensions } from 'react-native';

const { height, width } = Dimensions.get('window');

export const MOBILE_CONSTANTS = {
  // Espaciado superior seguro
  SAFE_AREA_TOP: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 8,
  
  // Altura del tab bar
  TAB_BAR_HEIGHT: Platform.OS === 'ios' ? 85 : 70,
  TAB_BAR_PADDING_BOTTOM: Platform.OS === 'ios' ? 25 : 12,
  
  // Altura del header
  HEADER_PADDING_TOP: Platform.OS === 'ios' ? 10 : 20,
  
  // Espaciado general
  SPACING_SM: 8,
  SPACING_MD: 16,
  SPACING_LG: 24,
  SPACING_XL: 32,
  
  // Bordes redondeados
  BORDER_RADIUS_SM: 8,
  BORDER_RADIUS_MD: 16,
  BORDER_RADIUS_LG: 24,
  BORDER_RADIUS_XL: 32,
  
  // Sombras
  SHADOW_SM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  SHADOW_MD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  SHADOW_LG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Configuración de StatusBar según tema
export const getStatusBarConfig = (isDark) => ({
  barStyle: isDark ? 'light-content' : 'dark-content',
  backgroundColor: isDark ? '#1A1A1A' : '#9F2241',
});

// Estilos de TabBar mejorados
export const getTabBarStyle = (theme) => ({
  backgroundColor: theme.card,
  borderTopColor: theme.border,
  borderTopWidth: 1,
  height: MOBILE_CONSTANTS.TAB_BAR_HEIGHT,
  paddingBottom: MOBILE_CONSTANTS.TAB_BAR_PADDING_BOTTOM,
  paddingTop: 8,
  ...MOBILE_CONSTANTS.SHADOW_LG,
});

// Estilos de Badge mejorados
export const getTabBarBadgeStyle = (theme) => ({
  backgroundColor: '#EF4444',
  color: '#FFF',
  fontSize: 10,
  fontWeight: '700',
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  top: Platform.OS === 'ios' ? 0 : -2,
  borderWidth: 2,
  borderColor: theme.card,
});

// Header con SafeArea
export const getHeaderStyle = (theme) => ({
  paddingTop: MOBILE_CONSTANTS.HEADER_PADDING_TOP,
  paddingBottom: 24,
  paddingHorizontal: 24,
  borderBottomLeftRadius: MOBILE_CONSTANTS.BORDER_RADIUS_XL,
  borderBottomRightRadius: MOBILE_CONSTANTS.BORDER_RADIUS_XL,
  ...MOBILE_CONSTANTS.SHADOW_LG,
});

// Wrapper con SafeArea
export const getSafeAreaWrapper = (backgroundColor) => ({
  flex: 1,
  backgroundColor,
});

export default MOBILE_CONSTANTS;
