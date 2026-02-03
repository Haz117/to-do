// theme/colors.js
// Paleta de colores centralizada

export const COLORS = {
  // Colores primarios
  primary: '#9F2241',
  primaryDark: '#7F1D1D',
  primaryLight: '#FEE2E2',
  
  // Estados de tareas
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Prioridades
  priorityHigh: '#DC2626',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
  
  // Estados
  pending: '#FF9800',
  inProgress: '#2196F3',
  inReview: '#9C27B0',
  completed: '#4CAF50',
  
  // Grises
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Transparencias
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

// Función para obtener color según prioridad
export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'alta':
      return COLORS.priorityHigh;
    case 'media':
      return COLORS.priorityMedium;
    case 'baja':
      return COLORS.priorityLow;
    default:
      return COLORS.gray400;
  }
};

// Función para obtener color según estado
export const getStatusColor = (status) => {
  switch (status) {
    case 'pendiente':
      return COLORS.pending;
    case 'en_proceso':
      return COLORS.inProgress;
    case 'en_revision':
      return COLORS.inReview;
    case 'cerrada':
      return COLORS.completed;
    default:
      return COLORS.gray400;
  }
};
