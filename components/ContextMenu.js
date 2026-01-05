// components/ContextMenu.js
// Menú contextual para long-press en TaskItem
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Animated,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ContextMenu({ 
  visible, 
  onClose, 
  position = { x: 0, y: 0 },
  actions = []
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Ajustar posición para que no se salga de la pantalla
  const menuWidth = 200;
  const adjustedX = Math.min(position.x, SCREEN_WIDTH - menuWidth - 20);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menu,
            {
              top: position.y,
              left: adjustedX,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === actions.length - 1 && styles.lastMenuItem,
                action.danger && styles.dangerItem
              ]}
              onPress={() => {
                onClose();
                setTimeout(() => action.onPress(), 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={action.icon} 
                size={20} 
                color={action.danger ? '#FF3B30' : '#007AFF'} 
                style={styles.menuIcon}
              />
              <Text 
                style={[
                  styles.menuText,
                  action.danger && styles.dangerText
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  dangerItem: {
    backgroundColor: '#FFF5F5',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  dangerText: {
    color: '#FF3B30',
  },
});
