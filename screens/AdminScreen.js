// screens/AdminScreen.js
// Pantalla de configuración y administración
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Animated, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { generateTaskReport, generateMonthlyReport } from '../services/reports';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { getCurrentSession, logoutUser, isAdmin } from '../services/authFirestore';
import { useTheme } from '../contexts/ThemeContext';
import SpringCard from '../components/SpringCard';
import OverdueAlert from '../components/OverdueAlert';
import { hapticMedium, hapticLight } from '../utils/haptics';
import { subscribeToTasks } from '../services/tasks';

export default function AdminScreen({ navigation, onLogout }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const [notificationCount, setNotificationCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('operativo');
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState([]);
  
  useEffect(() => {
    loadNotificationCount();
    loadCurrentUser();
    loadAllUsers();
    loadUrgentTasks();
  }, []);

  const loadUrgentTasks = async () => {
    const unsubscribe = await subscribeToTasks((tasks) => {
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      const urgent = tasks.filter(task => {
        if (task.status === 'cerrada' || !task.dueAt) return false;
        const due = new Date(task.dueAt).getTime();
        const timeLeft = due - now;
        return timeLeft > 0 && timeLeft < sixHours;
      });
      
      console.log('🚨 AdminScreen - Tareas urgentes encontradas:', urgent.length);
      
      if (urgent.length > 0) {
        setUrgentTasks(urgent);
        setTimeout(() => {
          console.log('🚨 AdminScreen - Mostrando modal urgente');
          setShowUrgentModal(true);
        }, 1500);
      }
    });
    return unsubscribe;
  };

  const loadCurrentUser = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session);
      const adminStatus = await isAdmin();
      setIsUserAdmin(adminStatus);
    } else {
      // No hay sesión, redirigir a login
      navigation.replace('Login');
    }
  };

  const loadNotificationCount = async () => {
    const notifications = await getAllScheduledNotifications();
    setNotificationCount(notifications.length);
  };

  const loadAllUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const resetUserPassword = async () => {
    if (!resetEmail.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Por favor completa email y nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden resetear contraseñas');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', resetEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Error', 'Usuario no encontrado');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const simpleHash = (text) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      };

      const hashedPassword = simpleHash(newPassword + resetEmail.toLowerCase());
      await updateDoc(doc(db, 'users', userDoc.id), {
        password: hashedPassword
      });

      Alert.alert('Contraseña Reseteada', 'La contraseña ha sido actualizada');
      setResetEmail('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo resetear la contraseña: ' + error.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        active: !currentStatus
      });
      Alert.alert('Estado Actualizado', 'El usuario ha sido ' + (!currentStatus ? 'activado' : 'desactivado'));
      loadAllUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado: ' + error.message);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const createUser = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      Alert.alert('Error', 'Por favor completa nombre, email y contraseña');
      return;
    }

    if (!validateEmail(userEmail.trim())) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    if (userPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isUserAdmin) {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden crear usuarios');
      return;
    }

    try {
      // Importar registerUser
      const { registerUser } = require('../services/authFirestore');
      const result = await registerUser(userEmail.trim(), userPassword, userName.trim(), userRole);
      
      if (result.success) {
        Alert.alert('Usuario Creado', `${userName} ha sido agregado como ${userRole}`);
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setUserRole('operativo');
        loadAllUsers(); // Recargar lista
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el usuario: ' + error.message);
    }
  };

  const testNotification = async () => {
    try {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'Permisos Denegados', 
          'Las notificaciones push no están disponibles en Expo Go. Para probarlas necesitas crear un build de desarrollo.'
        );
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

      Alert.alert(
        'Notificación Programada', 
        'Recibirás una notificación en 2 segundos.\n\nNOTA: Las notificaciones push no funcionan en Expo Go, pero se guardan para builds nativos.'
      );
      
      // Actualizar contador
      setTimeout(() => loadNotificationCount(), 100);
    } catch (error) {
      Alert.alert(
        'Información', 
        'Las notificaciones push no están disponibles en Expo Go.\n\nPara usarlas necesitas crear un build de desarrollo con:\n\neas build --profile development --platform android'
      );
      console.log('[Notifications] Error (esperado en Expo Go):', error.message);
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
            setNotificationCount(0);
            Alert.alert('Completado', 'Todas las notificaciones han sido canceladas');
          }
        }
      ]
    );
  };

  const exportReport = async () => {
    Alert.alert(
      'Exportar Reporte',
      'Selecciona el tipo de reporte',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Todas las Tareas (CSV)',
          onPress: async () => {
            try {
              console.log('📄 Iniciando exportación de reporte...');
              const result = await generateTaskReport();
              console.log('✅ Reporte generado:', result);
              Alert.alert(
                '✅ Reporte Generado', 
                `El archivo CSV ha sido generado exitosamente.${Platform.OS === 'web' ? '\n\nEl archivo se descargó automáticamente.' : '\n\nEl archivo se compartió exitosamente.'}`
              );
            } catch (error) {
              console.error('❌ Error exportando:', error);
              Alert.alert(
                'Error al Exportar', 
                `No se pudo generar el reporte: ${error.message}\n\nPor favor verifica que haya tareas en el sistema.`
              );
            }
          }
        },
        {
          text: 'Estadísticas Mensuales',
          onPress: async () => {
            const now = new Date();
            try {
              console.log('📊 Generando estadísticas mensuales...');
              await generateMonthlyReport(now.getFullYear(), now.getMonth() + 1);
              Alert.alert('✅ Reporte Generado', 'Las estadísticas han sido exportadas');
            } catch (error) {
              console.error('❌ Error en estadísticas:', error);
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Modal de Tareas Urgentes */}
      <Modal
        visible={showUrgentModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUrgentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.urgentModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.urgentModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={32} color="#FF3B30" style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.urgentModalTitle, { color: theme.text }]}>⚠️ ¡Alerta Urgente!</Text>
                  <Text style={[styles.urgentModalSubtitle, { color: theme.textSecondary }]}>
                    Tareas críticas próximas a vencer
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowUrgentModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.urgentModalScroll}>
              {urgentTasks.map((task) => {
                const timeLeft = new Date(task.dueAt).getTime() - Date.now();
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.urgentTaskCard, { 
                      backgroundColor: theme.surface,
                      borderColor: hoursLeft < 2 ? '#FF3B30' : '#FF9500'
                    }]}
                    onPress={() => {
                      setShowUrgentModal(false);
                      navigation.navigate('Home');
                    }}
                  >
                    <View style={styles.urgentTaskHeader}>
                      <Ionicons 
                        name={hoursLeft < 2 ? "alert-circle" : "time"} 
                        size={28} 
                        color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} 
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.urgentTaskTitle, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                          📍 {task.area} • 👤 {task.assignedTo}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.urgentTaskTimer, { 
                      backgroundColor: hoursLeft < 2 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)' 
                    }]}>
                      <Ionicons name="hourglass" size={18} color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? '#FF3B30' : '#FF9500' 
                      }]}>
                        ⏰ {hoursLeft}h {minutesLeft}m restantes
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.urgentModalFooter}>
              <TouchableOpacity 
                style={[styles.urgentModalButton, { backgroundColor: '#FF3B30' }]}
                onPress={() => setShowUrgentModal(false)}
              >
                <Text style={styles.urgentModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { backgroundColor: isDark ? '#1A1A1A' : '#9F2241' }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Administración</Text>
            <Text style={styles.subheading}>{currentUser?.displayName || 'Cargando...'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={async () => {
              hapticMedium();
              Alert.alert(
                'Cerrar Sesión',
                '¿Estás seguro que deseas cerrar sesión?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Cerrar Sesión',
                    style: 'destructive',
                    onPress: async () => {
                      if (onLogout) {
                        await onLogout();
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Alerta de tareas vencidas */}
      <OverdueAlert 
        tasks={[]} 
        currentUserEmail={currentUser?.email}
        role={currentUser?.role}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <SpringCard style={[styles.statCard, { backgroundColor: isDark ? '#1E3A8A' : '#3B82F6' }]}>
            <Ionicons name="people" size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{allUsers.length}</Text>
            <Text style={styles.statLabel}>Usuarios</Text>
          </SpringCard>

          <SpringCard style={[styles.statCard, { backgroundColor: isDark ? '#7C2D12' : '#F59E0B' }]}>
            <Ionicons name="notifications" size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{notificationCount}</Text>
            <Text style={styles.statLabel}>Notificaciones</Text>
          </SpringCard>

          <SpringCard style={[styles.statCard, { backgroundColor: isDark ? '#065F46' : '#10B981' }]}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={32} color="#FFFFFF" />
            <Text style={styles.statNumber}>{isDark ? 'ON' : 'OFF'}</Text>
            <Text style={styles.statLabel}>Modo Oscuro</Text>
          </SpringCard>
        </View>

        {/* Crear Usuario */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#8B4789' }]}>
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Crear Usuario</Text>
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A1D' : '#F9FAFB', borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} style={styles.inputIcon} />
            <TextInput
              placeholder="Nombre del usuario"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={userName}
              onChangeText={setUserName}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="words"
            />
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: (isDark ? '#1A1A1D' : '#F9FAFB'), borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={(isDark ? '#9CA3AF' : '#6B7280')} style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={userEmail}
              onChangeText={setUserEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: (isDark ? '#1A1A1D' : '#F9FAFB'), borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={(isDark ? '#9CA3AF' : '#6B7280')} style={styles.inputIcon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={userPassword}
              onChangeText={setUserPassword}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.surface },
                userRole === 'operativo' && styles.roleButtonActive
              ]}
              onPress={() => {
                hapticLight();
                setUserRole('operativo');
              }}
            >
              <Text style={[
                styles.roleButtonText, 
                { color: theme.textSecondary },
                userRole === 'operativo' && styles.roleButtonTextActive
              ]}>
                Operativo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.surface },
                userRole === 'admin' && styles.roleButtonActive
              ]}
              onPress={() => {
                hapticLight();
                setUserRole('admin');
              }}
            >
              <Text style={[
                styles.roleButtonText, 
                { color: theme.textSecondary },
                userRole === 'admin' && styles.roleButtonTextActive
              ]}>
                Administrador
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              createUser();
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#34C759' }]}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Crear Usuario</Text>
            </View>
          </TouchableOpacity>
        </SpringCard>

        {/* Lista de Usuarios */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Usuarios ({allUsers.length})</Text>
          </View>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={() => {
              hapticLight();
              setShowUserList(!showUserList);
            }}
          >
            <Ionicons 
              name={showUserList ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.primary} 
              style={{ marginRight: 8 }} 
            />
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>
              {showUserList ? 'Ocultar Lista' : 'Ver Todos los Usuarios'}
            </Text>
          </TouchableOpacity>

          {showUserList && (
            <View style={styles.userListContainer}>
              {allUsers.map((user) => (
                <View 
                  key={user.id} 
                  style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userHeader}>
                      <View style={[
                        styles.userAvatar, 
                        { backgroundColor: user.role === 'admin' ? (isDark ? '#7C2D12' : '#DC2626') : (isDark ? '#1E40AF' : '#3B82F6') }
                      ]}>
                        <Ionicons 
                          name={user.role === 'admin' ? 'shield-checkmark' : 'person'} 
                          size={16} 
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: theme.text }]}>{user.displayName}</Text>
                        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                      </View>
                      <View style={[
                        styles.userRoleBadge, 
                        { backgroundColor: user.role === 'admin' ? (isDark ? '#7C2D12' : '#DC2626') : (isDark ? '#1E40AF' : '#3B82F6') }
                      ]}>
                        <Text style={styles.userRoleText}>{user.role}</Text>
                      </View>
                    </View>
                    <Text style={[styles.userDate, { color: theme.textSecondary }]}>
                      📅 {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusButton, 
                      !user.active && styles.statusButtonInactive
                    ]}
                    onPress={() => {
                      hapticMedium();
                      toggleUserStatus(user.id, user.active);
                    }}
                  >
                    <Ionicons 
                      name={user.active ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color="#FFFFFF" 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.statusButtonText}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </SpringCard>

        {/* Recuperación de Contraseña */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="key" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resetear Contraseña</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: (isDark ? '#1A1A1D' : '#F9FAFB'), borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={(isDark ? '#9CA3AF' : '#6B7280')} style={styles.inputIcon} />
            <TextInput
              placeholder="Email del usuario"
              placeholderTextColor={(isDark ? '#6B7280' : '#9CA3AF')}
              value={resetEmail}
              onChangeText={setResetEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: (isDark ? '#1A1A1D' : '#F9FAFB'), borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={(isDark ? '#9CA3AF' : '#6B7280')} style={styles.inputIcon} />
            <TextInput
              placeholder="Nueva contraseña"
              placeholderTextColor={(isDark ? '#6B7280' : '#9CA3AF')}
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.input, { color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              resetUserPassword();
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Resetear Contraseña</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Solo administradores pueden resetear contraseñas de otros usuarios.
          </Text>
        </SpringCard>

        {/* Notificaciones */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#06B6D4' }]}>
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              testNotification();
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#34C759' }]}>
              <Ionicons name="flask" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Enviar Notificación de Prueba</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: theme.surface, borderColor: theme.border }]} 
            onPress={() => {
              hapticLight();
              viewScheduledNotifications();
            }}
          >
            <Ionicons name="list-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>Ver Programadas ({notificationCount})</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: isDark ? '#7F1D1D' : '#DC2626' }]} 
            onPress={() => {
              hapticMedium();
              clearAllNotifications();
            }}
          >
            <Ionicons name="trash-outline" size={20} color={isDark ? '#F87171' : '#DC2626'} style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: isDark ? '#F87171' : '#DC2626' }]}>Cancelar Todas</Text>
          </TouchableOpacity>
        </SpringCard>

        {/* Reportes */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Reportes</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              exportReport();
            }}
          >
            <View style={[styles.buttonGradient, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Exportar Reporte</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Los reportes se exportan en formato CSV (compatible con Excel).
          </Text>
        </SpringCard>

        {/* Información de la App */}
        <SpringCard style={[styles.sectionCard, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#6B7280' }]}>
              <Ionicons name="information-circle" size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Información</Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Versión</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Firebase Auth</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Activo</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Firestore Sync</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Conectado</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Modo Oscuro</Text>
            <TouchableOpacity
              style={[styles.themeToggle, isDark && styles.themeToggleActive]}
              onPress={() => {
                hapticMedium();
                toggleTheme();
              }}
            >
              <View style={[styles.themeToggleCircle, isDark && styles.themeToggleCircleActive]}>
                <Ionicons 
                  name={isDark ? "moon" : "sunny"} 
                  size={16} 
                  color={isDark ? "#FFFFFF" : "#FFA500"} 
                />
              </View>
            </TouchableOpacity>
          </View>
        </SpringCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  heading: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 4
  },
  subheading: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500'
  },
  content: {
    padding: 12,
    paddingBottom: 80
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 10
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 2
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sectionCard: {
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    flex: 1
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500'
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 8
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10
  },
  roleButtonActive: {
    backgroundColor: '#9F2241'
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden'
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '700'
  },
  userListContainer: {
    marginTop: 8
  },
  userCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center'
  },
  userInfo: {
    flex: 1,
    marginRight: 12
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1
  },
  userRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  userRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 4
  },
  userDate: {
    fontSize: 12
  },
  statusButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusButtonInactive: {
    backgroundColor: '#6B7280'
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
    opacity: 0.7
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857'
  },
  themeToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    padding: 3,
    justifyContent: 'center'
  },
  themeToggleActive: {
    backgroundColor: '#9F2241'
  },
  themeToggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  themeToggleCircleActive: {
    alignSelf: 'flex-end'
  },
  // Estilos del Modal de Tareas Urgentes
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  urgentModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  urgentModalSubtitle: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500'
  },
  urgentModalScroll: {
    maxHeight: 400,
    padding: 16
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20
  },
  urgentTaskArea: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500'
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 4
  },
  urgentTaskTime: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },
  urgentModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 59, 48, 0.2)'
  },
  urgentModalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5
  }
});




