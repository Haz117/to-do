import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * UserSelector - Componente profesional para seleccionar usuarios
 * Características:
 * - Vista destacada del usuario seleccionado
 * - Modal con lista de usuarios filtrable
 * - Búsqueda en tiempo real
 * - Avatar con iniciales
 * - Optimizado para muchos usuarios
 */
export default function UserSelector({
  users = [],
  selectedUser = null,
  onSelectUser = () => {},
  disabled = false,
  theme = {},
  isDark = false
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));

  // Filtrar usuarios basado en búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      user.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Extraer iniciales
  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0].toUpperCase()).join('').slice(0, 2);
  };

  // Obtener color para avatar basado en email
  const getAvatarColor = (email) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleSelectUser = (user) => {
    onSelectUser(user);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setModalVisible(true);
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        speed: 12
      }).start();
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <>
      {/* Selected User Display - MEJORADO */}
      <TouchableOpacity
        style={[
          styles.selectedUserContainer,
          disabled && styles.disabledContainer,
          !selectedUser && styles.emptyContainer
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
        activeOpacity={0.65}
      >
        {selectedUser ? (
          <Animated.View style={[styles.selectedUserContent, { transform: [{ scale: scaleAnim }] }]}>
            {/* Avatar Grande */}
            <View
              style={[
                styles.avatarLarge,
                { backgroundColor: getAvatarColor(selectedUser) }
              ]}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(selectedUser)}
              </Text>
            </View>

            {/* Info Container */}
            <View style={styles.userInfoContainer}>
              <Text style={[styles.userEmailLabel, { color: theme.textSecondary || '#999' }]}>
                RESPONSABLE
              </Text>
              <Text style={[styles.userEmail, { color: theme.text }]} numberOfLines={1}>
                {selectedUser.split('@')[0]}
              </Text>
              <Text style={[styles.userDomain, { color: theme.textSecondary || '#999' }]} numberOfLines={1}>
                {selectedUser.split('@')[1]}
              </Text>
            </View>

            {/* Icono Derecha */}
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-down" size={20} color={theme.primary || '#9F2241'} />
            </View>
          </Animated.View>
        ) : (
          <View style={styles.emptyContent}>
            <View style={[styles.emptyIconContainer, { backgroundColor: (theme.primary || '#9F2241') + '22' }]}>
              <Ionicons name="person-add" size={26} color={theme.primary || '#9F2241'} />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Toca para asignar usuario
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary || '#999' }]}>
              Campo obligatorio
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal de selección */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Seleccionar Usuario
              </Text>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={handleCloseModal}
              >
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.textSecondary || '#999'} />
              <TextInput
                style={[styles.searchInput, { color: theme.text, placeholderTextColor: theme.textSecondary || '#999' }]}
                placeholder="Buscar usuario..."
                placeholderTextColor={theme.textSecondary || '#999'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                selectionColor={theme.primary || '#9F2241'}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary || '#999'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Users List */}
            {filteredUsers.length > 0 ? (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userItem,
                      selectedUser === item && styles.userItemSelected
                    ]}
                    onPress={() => handleSelectUser(item)}
                    activeOpacity={0.6}
                  >
                    <View
                      style={[
                        styles.avatarSmall,
                        { backgroundColor: getAvatarColor(item) }
                      ]}
                    >
                      <Text style={styles.avatarInitialsSmall}>
                        {getInitials(item)}
                      </Text>
                    </View>
                    <View style={styles.userItemInfo}>
                      <Text style={[styles.userItemEmail, { color: theme.text }]}>
                        {item}
                      </Text>
                      <Text style={[styles.userItemExtra, { color: theme.textSecondary || '#999' }]}>
                        {item.split('@')[1]}
                      </Text>
                    </View>
                    {selectedUser === item && (
                      <View style={[styles.checkmark, { backgroundColor: theme.primary || '#9F2241' }]}>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                scrollEnabled={true}
                style={styles.usersList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyListContainer}>
                <Ionicons name="search-outline" size={48} color={theme.textSecondary || '#999'} />
                <Text style={[styles.emptyListText, { color: theme.text }]}>
                  No hay usuarios que coincidan
                </Text>
                <Text style={[styles.emptyListSubtext, { color: theme.textSecondary || '#999' }]}>
                  Intenta con otro término de búsqueda
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  selectedUserContainer: {
    backgroundColor: isDark ? '#2C2C2E' : '#FFF7ED',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: isDark ? '#444444' : '#FFD4A3',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  disabledContainer: {
    opacity: 0.5,
    backgroundColor: '#E5E5EA'
  },
  emptyContainer: {
    backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9',
    borderStyle: 'dashed'
  },
  selectedUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2
  },
  userEmailLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4
  },
  userDomain: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1
  },
  chevronContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: (theme.primary || '#9F2241') + '22',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#E5E5EA'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  closeModalBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#333333' : '#F0F0F0'
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: isDark ? '#333333' : '#F5F5F5',
    borderRadius: 14,
    gap: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  
  // Users List
  usersList: {
    maxHeight: 400
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 14
  },
  userItemSelected: {
    backgroundColor: 'rgba(159,34,65,0.1)'
  },
  avatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2
  },
  avatarInitialsSmall: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3
  },
  userItemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 3
  },
  userItemEmail: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  userItemExtra: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  
  // Empty State
  emptyListContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 70,
    gap: 14
  },
  emptyListText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 10
  },
  emptyListSubtext: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1
  }
});
