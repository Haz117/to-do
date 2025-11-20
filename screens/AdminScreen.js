// screens/AdminScreen.js
// Pantalla de administración para gestionar usuarios y roles
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPeople, savePeople, addPerson as addPersonToStorage, deletePerson as deletePersonFromStorage } from '../services/people';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import * as Notifications from 'expo-notifications';

const ROLES = {
  ADMIN: { name: 'Administrador', color: '#8B0000', icon: 'shield-checkmark' },
  MEMBER: { name: 'Miembro', color: '#DAA520', icon: 'person' },
  GUEST: { name: 'Invitado', color: '#8E8E93', icon: 'eye' }
};

const USERS_KEY = '@todo_users_v1';

export default function AdminScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [people, setPeople] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    loadUsers();
    loadPeopleList();
    checkAdminStatus();
  }, []);

  const loadPeopleList = async () => {
    const peopleData = await loadPeople();
    setPeople(peopleData);
  };

  const checkAdminStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('@current_user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setCurrentUser(user);
          setIsAdmin(user.role === 'ADMIN');
        } catch (parseError) {
          console.error('Error parseando datos de usuario:', parseError);
          // Limpiar datos corruptos
          await AsyncStorage.removeItem('@current_user');
          setShowLoginModal(true);
        }
      } else {
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error('Error verificando usuario:', error);
      setShowLoginModal(true);
    }
  };

  const login = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const data = await AsyncStorage.getItem(USERS_KEY);
    const allUsers = data ? JSON.parse(data) : [];
    
    const user = allUsers.find(u => 
      u.email.toLowerCase() === loginEmail.toLowerCase().trim() && 
      u.password === loginPassword
    );

    if (user) {
      await AsyncStorage.setItem('@current_user', JSON.stringify(user));
      setCurrentUser(user);
      setIsAdmin(user.role === 'ADMIN');
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      Alert.alert('Bienvenido', `Hola ${user.name}!`);
    } else {
      Alert.alert('Error', 'Credenciales incorrectas');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@current_user');
    setCurrentUser(null);
    setIsAdmin(false);
    setShowLoginModal(true);
  };

  const testNotification = async () => {
    try {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert('Permisos Denegados', 'No se pueden enviar notificaciones sin permisos');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Notificación de Prueba',
          body: 'Esta es una notificación de prueba del sistema TODO',
          data: { type: 'test' },
          sound: true,
        },
        trigger: { seconds: 2 }
      });

      Alert.alert('✅ Notificación Programada', 'Recibirás una notificación en 2 segundos');
    } catch (error) {
      Alert.alert('Error', `No se pudo enviar la notificación: ${error.message}`);
    }
  };

  const viewScheduledNotifications = async () => {
    const notifications = await getAllScheduledNotifications();
    if (notifications.length === 0) {
      Alert.alert('Sin Notificaciones', 'No hay notificaciones programadas');
    } else {
      Alert.alert(
        'Notificaciones Programadas',
        `Total: ${notifications.length}\n\n${notifications.slice(0, 5).map((n, i) => 
          `${i+1}. ${n.content.title}`
        ).join('\n')}${notifications.length > 5 ? `\n\n...y ${notifications.length - 5} más` : ''}`
      );
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Confirmar',
      '¿Cancelar TODAS las notificaciones programadas?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar todo',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            Alert.alert('✅ Listo', 'Todas las notificaciones han sido canceladas');
          }
        }
      ]
    );
  };

  const loadUsers = async () => {
    try {
      const data = await AsyncStorage.getItem(USERS_KEY);
      if (data) {
        setUsers(JSON.parse(data));
      } else {
        // Usuarios por defecto con contraseñas
        const defaultUsers = [
          { id: '1', name: 'Admin Principal', email: 'admin@todo.com', password: 'admin123', role: 'ADMIN', createdAt: Date.now() },
          { id: '2', name: 'Usuario Demo', email: 'demo@todo.com', password: 'demo123', role: 'MEMBER', createdAt: Date.now() }
        ];
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const saveUsers = async (newUsers) => {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Error guardando usuarios:', error);
    }
  };

  const addUser = async () => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden agregar personas');
      return;
    }

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const newUser = {
      id: String(Date.now()),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword,
      role: selectedRole,
      createdAt: Date.now()
    };

    // Agregar a la lista de usuarios (autenticación)
    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    // Agregar a la lista de personas (para asignación de tareas)
    await addPersonToStorage({ 
      name: newUserName.trim(), 
      email: newUserEmail.trim(), 
      role: selectedRole 
    });
    
    await loadPeopleList();
    
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setSelectedRole('MEMBER');
    setShowAddModal(false);
    Alert.alert('Éxito', 'Persona agregada correctamente');
  };

  const changeRole = (userId, newRole) => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden cambiar roles');
      return;
    }
    
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    );
    saveUsers(updatedUsers);
    Alert.alert('Éxito', 'Rol actualizado correctamente');
  };

  const deleteUser = async (userId) => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden eliminar personas');
      return;
    }
    
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar esta persona?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const updatedUsers = users.filter(u => u.id !== userId);
            saveUsers(updatedUsers);
            
            // También eliminar de la lista de personas
            const personToDelete = people.find(p => p.email === users.find(u => u.id === userId)?.email);
            if (personToDelete) {
              await deletePersonFromStorage(personToDelete.id);
              await loadPeopleList();
            }
          }
        }
      ]
    );
  };

  const renderUserCard = (user) => {
    const role = ROLES[user.role];
    const isCurrentUser = currentUser && user.id === currentUser.id;

    return (
      <View key={user.id} style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[role.color, role.color + 'CC']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              {isCurrentUser && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>TÚ</Text></View>}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: role.color + '15' }]}>
            <Ionicons name={role.icon} size={16} color={role.color} />
            <Text style={[styles.roleText, { color: role.color }]}>{role.name}</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <Text style={styles.actionsLabel}>Cambiar rol:</Text>
          <View style={styles.roleButtons}>
            {Object.keys(ROLES).map(roleKey => (
              <TouchableOpacity
                key={roleKey}
                style={[
                  styles.roleButton,
                  user.role === roleKey && styles.roleButtonActive,
                  { borderColor: ROLES[roleKey].color }
                ]}
                onPress={() => changeRole(user.id, roleKey)}
                disabled={isCurrentUser && roleKey !== 'ADMIN'}
              >
                <Ionicons 
                  name={ROLES[roleKey].icon} 
                  size={24} 
                  color={user.role === roleKey ? '#fff' : ROLES[roleKey].color} 
                />
              </TouchableOpacity>
            ))}
          </View>
          {!isCurrentUser && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteUser(user.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#8B0000" style={{ marginRight: 6 }} />
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B0000', '#6B0000']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Administración</Text>
            <Text style={styles.subheading}>Gestiona personas del equipo</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
        
        {currentUser && (
          <View style={styles.currentUserBanner}>
            <Ionicons name={ROLES[currentUser.role]?.icon} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.currentUserText}>
              {currentUser.name} ({ROLES[currentUser.role]?.name})
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* BENTO GRID - Dashboard Administrativo */}
        <View style={styles.bentoGrid}>
          {/* Fila 1: Estadísticas principales */}
          <View style={styles.bentoRow}>
            <TouchableOpacity style={[styles.bentoCard, styles.bentoLarge]} activeOpacity={0.9}>
              <LinearGradient colors={['#5856D6', '#4842C2']} style={styles.bentoGradient}>
                <View style={styles.bentoHeader}>
                  <Ionicons name="people" size={32} color="#FFFFFF" />
                  <Text style={styles.bentoTitle}>Equipo Total</Text>
                </View>
                <Text style={styles.bentoHugeNumber}>{users.length}</Text>
                <View style={styles.bentoFooter}>
                  <View style={styles.bentoMetric}>
                    <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.bentoMetricText}>
                      {users.filter(u => u.role === 'ADMIN').length} administradores
                    </Text>
                  </View>
                  <View style={styles.bentoMetric}>
                    <Ionicons name="person" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.bentoMetricText}>
                      {users.filter(u => u.role === 'MEMBER').length} miembros activos
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bentoColumn}>
              <TouchableOpacity style={[styles.bentoCard, styles.bentoSmallSquare]} activeOpacity={0.9}>
                <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.bentoGradient}>
                  <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" style={{ marginBottom: 8 }} />
                  <Text style={styles.bentoNumber}>{users.filter(u => u.role === 'ADMIN').length}</Text>
                  <Text style={styles.bentoLabel}>Admins</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoCard, styles.bentoSmallSquare]} activeOpacity={0.9}>
                <LinearGradient colors={['#DAA520', '#B8860B']} style={styles.bentoGradient}>
                  <Ionicons name="person" size={28} color="#FFFFFF" style={{ marginBottom: 8 }} />
                  <Text style={styles.bentoNumber}>{users.filter(u => u.role === 'MEMBER').length}</Text>
                  <Text style={styles.bentoLabel}>Miembros</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fila 2: Distribución de roles */}
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.bentoWide]}>
              <View style={styles.bentoHeader}>
                <Ionicons name="pie-chart" size={20} color="#1A1A1A" />
                <Text style={[styles.bentoTitle, { color: '#1A1A1A' }]}>Distribución de Roles</Text>
              </View>
              <View style={styles.roleBarsContainer}>
                {Object.entries(ROLES).map(([roleKey, roleData]) => {
                  const count = users.filter(u => u.role === roleKey).length;
                  const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                  return (
                    <View key={roleKey} style={styles.roleBarContainer}>
                      <View style={styles.roleBarLabel}>
                        <Ionicons name={roleData.icon} size={16} color={roleData.color} />
                        <Text style={styles.roleBarText}>{roleData.name}</Text>
                      </View>
                      <View style={styles.roleBarTrack}>
                        <View 
                          style={[
                            styles.roleBarFill, 
                            { width: `${percentage}%`, backgroundColor: roleData.color }
                          ]} 
                        />
                      </View>
                      <Text style={styles.roleBarCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Fila 3: Acciones rápidas */}
          <View style={styles.bentoRow}>
            <TouchableOpacity 
              style={[styles.bentoCard, styles.bentoAction]} 
              onPress={() => {
                if (isAdmin) {
                  setShowAddModal(true);
                } else {
                  Alert.alert('Acceso Denegado', 'Solo los administradores pueden agregar usuarios');
                }
              }}
              activeOpacity={0.9}
            >
              <LinearGradient 
                colors={isAdmin ? ['#34C759', '#28A745'] : ['#8E8E93', '#6E6E73']} 
                style={styles.bentoGradient}
              >
                <Ionicons name="person-add" size={32} color="#FFFFFF" style={{ marginBottom: 12 }} />
                <Text style={styles.bentoActionText}>
                  {isAdmin ? 'Agregar Persona' : 'Solo Admin'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity 
                style={[styles.bentoCard, styles.bentoAction]} 
                onPress={testNotification}
                activeOpacity={0.9}
              >
                <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.bentoGradient}>
                  <Ionicons name="notifications" size={32} color="#FFFFFF" style={{ marginBottom: 12 }} />
                  <Text style={styles.bentoActionText}>Probar Notificación</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sección de Notificaciones (solo Admin) */}
        {isAdmin && (
          <View style={styles.notificationSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="notifications" size={22} color="#8B0000" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Gestión de Notificaciones</Text>
            </View>
            
            <TouchableOpacity style={styles.notifButton} onPress={viewScheduledNotifications}>
              <Ionicons name="list-outline" size={20} color="#DAA520" style={{ marginRight: 8 }} />
              <Text style={styles.notifButtonText}>Ver Programadas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.notifButton, styles.notifButtonDanger]} onPress={clearAllNotifications}>
              <Ionicons name="trash-outline" size={20} color="#8B0000" style={{ marginRight: 8 }} />
              <Text style={[styles.notifButtonText, styles.notifButtonTextDanger]}>Cancelar Todas</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.usersList}>
          <Text style={styles.sectionTitle}>Miembros del Equipo</Text>
          {users.map(renderUserCard)}
        </View>
      </ScrollView>

      {/* Modal para agregar usuario */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="person-add" size={28} color="#DAA520" style={{ marginRight: 10 }} />
              <Text style={styles.modalTitle}>Nueva Persona</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor="#C7C7CC"
              value={newUserName}
              onChangeText={setNewUserName}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#C7C7CC"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#C7C7CC"
              value={newUserPassword}
              onChangeText={setNewUserPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Rol:</Text>
            <View style={styles.roleSelector}>
              {Object.keys(ROLES).map(roleKey => (
                <TouchableOpacity
                  key={roleKey}
                  style={[
                    styles.roleSelectorButton,
                    selectedRole === roleKey && styles.roleSelectorButtonActive,
                    { borderColor: ROLES[roleKey].color }
                  ]}
                  onPress={() => setSelectedRole(roleKey)}
                >
                  <Ionicons name={ROLES[roleKey].icon} size={20} color={ROLES[roleKey].color} />
                  <Text style={styles.roleSelectorText}>{ROLES[roleKey].name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addUser}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Agregar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Login */}
      <Modal
        visible={showLoginModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowLoginModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#8B0000', '#6B0000']}
              style={styles.loginHeader}
            >
              <TouchableOpacity 
                style={styles.modalBackButton} 
                onPress={() => {
                  setShowLoginModal(false);
                  navigation.goBack();
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Ionicons name="lock-closed" size={32} color="#FFFFFF" style={{ marginBottom: 8 }} />
                <Text style={styles.loginTitle}>Iniciar Sesión</Text>
                <Text style={styles.loginSubtitle}>Panel de Administración</Text>
              </View>
              <View style={{ width: 40 }} />
            </LinearGradient>

            <View style={styles.loginForm}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#C7C7CC"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#C7C7CC"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.loginButton} onPress={login}>
                <LinearGradient
                  colors={['#8B0000', '#6B0000']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Entrar</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backToHomeButton}
                onPress={() => {
                  setShowLoginModal(false);
                  navigation.goBack();
                }}
              >
                <Ionicons name="home-outline" size={18} color="#8B0000" style={{ marginRight: 6 }} />
                <Text style={styles.backToHomeText}>Volver al menú principal</Text>
              </TouchableOpacity>

              <View style={styles.credentialsHint}>
                <View style={styles.hintTitleContainer}>
                  <Ionicons name="bulb" size={16} color="#FF9500" style={{ marginRight: 6 }} />
                  <Text style={styles.hintTitle}>Credenciales por defecto:</Text>
                </View>
                <Text style={styles.hintText}>Admin: admin@todo.com / admin123</Text>
                <Text style={styles.hintText}>Demo: demo@todo.com / demo123</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  currentUserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8
  },
  currentUserText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  heading: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 8
  },
  subheading: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500'
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8B0000',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  addButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  notificationSection: {
    backgroundColor: '#FFFAF0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B0000',
    letterSpacing: -0.5
  },
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  notifButtonDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#8B0000'
  },
  notifButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B0000',
    textAlign: 'center'
  },
  notifButtonTextDanger: {
    color: '#8B0000'
  },
  usersList: {
    gap: 16
  },
  userCard: {
    backgroundColor: '#FFFAF0',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  currentBadge: {
    position: 'absolute',
    bottom: -4,
    right: 12,
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500'
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6
  },
  roleIcon: {
    fontSize: 16
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  userActions: {
    gap: 12
  },
  actionsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  roleButtonActive: {
    backgroundColor: '#8B0000'
  },
  roleButtonText: {
    fontSize: 20
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    borderWidth: 1.5,
    borderColor: '#8B0000'
  },
  deleteButtonText: {
    color: '#8B0000',
    fontSize: 15,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  input: {
    backgroundColor: '#FFFAF0',
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6E73',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  roleSelector: {
    gap: 10,
    marginBottom: 24
  },
  roleSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    gap: 12
  },
  roleSelectorButtonActive: {
    backgroundColor: '#F8F9FA'
  },
  roleSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden'
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6E6E73'
  },
  confirmButton: {},
  confirmButtonGradient: {
    padding: 16,
    alignItems: 'center'
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  loginHeader: {
    marginHorizontal: -24,
    marginTop: -24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9
  },
  loginForm: {
    gap: 16
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8
  },
  backToHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFAF0',
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  backToHomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B0000'
  },
  credentialsHint: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginTop: 8
  },
  hintTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  hintText: {
    fontSize: 13,
    color: '#6E6E73',
    marginBottom: 4
  },
  // Bento Grid Styles
  bentoGrid: {
    gap: 16,
    marginBottom: 32
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16
  },
  bentoColumn: {
    gap: 16,
    flex: 1
  },
  bentoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  bentoLarge: {
    flex: 2,
    minHeight: 200
  },
  bentoSmallSquare: {
    flex: 1,
    minHeight: 92
  },
  bentoWide: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    borderWidth: 2,
    borderColor: '#F5DEB3',
    padding: 18,
    minHeight: 130
  },
  bentoAction: {
    flex: 1,
    minHeight: 120
  },
  bentoGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  bentoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3
  },
  bentoHugeNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    marginVertical: 8
  },
  bentoNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    marginBottom: 4
  },
  bentoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  bentoFooter: {
    gap: 8
  },
  bentoMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  bentoMetricText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },
  bentoActionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  roleBarsContainer: {
    marginTop: 16,
    gap: 14
  },
  roleBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  roleBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 130
  },
  roleBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  roleBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden'
  },
  roleBarFill: {
    height: '100%',
    borderRadius: 5
  },
  roleBarCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    width: 30,
    textAlign: 'right'
  }
});
