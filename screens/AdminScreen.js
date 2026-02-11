// screens/AdminScreen.js
// Pantalla de configuración y administración
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated, Platform, Modal, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { getCurrentSession, logoutUser, isAdmin } from '../services/authFirestore';
import { useTheme } from '../contexts/ThemeContext';
import Toast from '../components/Toast';
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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Animation refs for stagger effect
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(30)).current;
  const usersOpacity = useRef(new Animated.Value(0)).current;
  const usersSlide = useRef(new Animated.Value(30)).current;

  // Stagger animations on mount
  useEffect(() => {
    const staggerDelay = 120;
    
    // Header animation
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // Stats cards animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(statsSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay);

    // Form section animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(formSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay * 2);

    // Users list animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(usersOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(usersSlide, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay * 3);
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };
  
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
      
      if (urgent.length > 0) {
        setUrgentTasks(urgent);
        setTimeout(() => {
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
      // Error silencioso
    }
  };

  const resetUserPassword = async () => {
    if (!resetEmail.trim() || !newPassword.trim()) {
      showToast('Por favor completa email y nueva contraseña', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (!isUserAdmin) {
      showToast('Solo los administradores pueden resetear contraseñas', 'warning');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', resetEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showToast('Usuario no encontrado', 'error');
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

      showToast('La contraseña ha sido actualizada', 'success');
      setResetEmail('');
      setNewPassword('');
    } catch (error) {
      showToast('No se pudo resetear la contraseña: ' + error.message, 'error');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        active: !currentStatus
      });
      showToast('El usuario ha sido ' + (!currentStatus ? 'activado' : 'desactivado'), 'success');
      loadAllUsers();
    } catch (error) {
      showToast('No se pudo actualizar el estado: ' + error.message, 'error');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const createUser = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) {
      showToast('Por favor completa nombre, email y contraseña', 'error');
      return;
    }

    if (!validateEmail(userEmail.trim())) {
      showToast('Por favor ingresa un email válido', 'error');
      return;
    }

    if (userPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (!isUserAdmin) {
      showToast('Solo los administradores pueden crear usuarios', 'warning');
      return;
    }

    try {
      // Importar registerUser
      const { registerUser } = require('../services/authFirestore');
      const result = await registerUser(userEmail.trim(), userPassword, userName.trim(), userRole);
      
      if (result.success) {
        showToast(`${userName} ha sido agregado como ${userRole}`, 'success');
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        setUserRole('operativo');
        loadAllUsers(); // Recargar lista
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('No se pudo crear el usuario: ' + error.message, 'error');
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
          title: 'Notificación de Prueba',
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
                  <Text style={[styles.urgentModalTitle, { color: theme.text }]}>¡Alerta Urgente!</Text>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Ionicons name="location" size={14} color={theme.textSecondary} />
                          <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                            {task.area}
                          </Text>
                          <Ionicons name="person" size={14} color={theme.textSecondary} />
                          <Text style={[styles.urgentTaskArea, { color: theme.textSecondary }]}>
                            {task.assignedTo}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.urgentTaskTimer, { 
                      backgroundColor: hoursLeft < 2 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)' 
                    }]}>
                      <Ionicons name="hourglass" size={18} color={hoursLeft < 2 ? '#FF3B30' : '#FF9500'} />
                      <Text style={[styles.urgentTaskTime, { 
                        color: hoursLeft < 2 ? '#FF3B30' : '#FF9500' 
                      }]}>
                        {hoursLeft}h {minutesLeft}m restantes
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

      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.greetingContainer}>
                <Ionicons name="hand-right" size={20} color="#FFFFFF" style={{ marginRight: 8, opacity: 0.9 }} />
                <Text style={styles.greeting}>Hola!</Text>
              </View>
              <Text style={styles.heading}>Administración</Text>
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
        </LinearGradient>
      </Animated.View>

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
        {/* Stats Overview - Estilo tarjetas grandes con glassmorphism */}
        <Animated.View style={[
          styles.statsContainer,
          { opacity: statsOpacity, transform: [{ translateY: statsSlide }] }
        ]}>
          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.95)', 'rgba(37, 99, 235, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="people" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{allUsers.length}</Text>
              <Text style={styles.statLabel}>USUARIOS</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.95)', 'rgba(217, 119, 6, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name="notifications" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{notificationCount}</Text>
              <Text style={styles.statLabel}>NOTIFICACIONES</Text>
            </LinearGradient>
          </View>

          <View style={[styles.statCard, styles.statCardGlass]}>
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconBadge}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{isDark ? 'ON' : 'OFF'}</Text>
              <Text style={styles.statLabel}>MODO OSCURO</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Crear Usuario */}
        <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
          <View style={[
            styles.sectionCard, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.iconCircleSection}
              >
                <Ionicons name="person-add" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Crear Usuario</Text>
            </View>
          
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Nombre del usuario"
              placeholderTextColor={theme.textSecondary}
              value={userName}
              onChangeText={setUserName}
              style={[styles.input, { color: theme.text }]}
              autoCapitalize="words"
            />
          </View>
          
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={userEmail}
              onChangeText={setUserEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor={theme.textSecondary}
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
                { backgroundColor: theme.background, borderColor: theme.border },
                userRole === 'operativo' && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => {
                hapticLight();
                setUserRole('operativo');
              }}
            >
              <Text style={[
                styles.roleButtonText, 
                { color: theme.text },
                userRole === 'operativo' && { color: '#FFFFFF' }
              ]}>
                Operativo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.roleButton, 
                { backgroundColor: theme.background, borderColor: theme.border },
                userRole === 'admin' && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => {
                hapticLight();
                setUserRole('admin');
              }}
            >
              <Text style={[
                styles.roleButtonText, 
                { color: theme.text },
                userRole === 'admin' && { color: '#FFFFFF' }
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
            <LinearGradient
              colors={['#34C759', '#30B351']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Crear Usuario</Text>
            </LinearGradient>
          </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Lista de Usuarios */}
        <Animated.View style={{ opacity: usersOpacity, transform: [{ translateY: usersSlide }] }}>
          <View style={[
            styles.sectionCard, 
            { 
              backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.iconCircleSection}
              >
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Usuarios ({allUsers.length})</Text>
            </View>

            <TouchableOpacity 
              style={[styles.expandButton, { backgroundColor: theme.background, borderColor: theme.border }]} 
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
                  style={[styles.userCard, { backgroundColor: theme.background, borderColor: theme.border }]}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userHeader}>
                      <View style={[
                        styles.userAvatar, 
                        { backgroundColor: user.role === 'admin' ? '#DC2626' : '#3B82F6' }
                      ]}>
                        <Ionicons 
                          name={user.role === 'admin' ? 'shield-checkmark' : 'person'} 
                          size={16} 
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.userTextContainer}>
                        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{user.displayName}</Text>
                        <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{user.email}</Text>
                      </View>
                    </View>
                    <View style={styles.userFooter}>
                      <View style={styles.userDateRow}>
                        <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.userDate, { color: theme.textSecondary }]}>
                          {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                        </Text>
                      </View>
                      <View style={[
                        styles.userRoleBadge, 
                        { backgroundColor: user.role === 'admin' ? '#DC2626' : '#3B82F6' }
                      ]}>
                        <Text style={styles.userRoleText}>{user.role.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusButton, 
                      { backgroundColor: user.active ? '#10B981' : '#EF4444' }
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
          </View>
        </Animated.View>

        {/* Recuperación de Contraseña */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="key" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resetear Contraseña</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email del usuario"
              placeholderTextColor={theme.textSecondary}
              value={resetEmail}
              onChangeText={setResetEmail}
              style={[styles.input, { color: theme.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Nueva contraseña"
              placeholderTextColor={theme.textSecondary}
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
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Resetear Contraseña</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Solo administradores pueden resetear contraseñas de otros usuarios.
          </Text>
        </View>

        {/* Notificaciones */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#06B6D4', '#0891B2']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              hapticMedium();
              testNotification();
            }}
          >
            <LinearGradient
              colors={['#34C759', '#30B351']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="flask" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Enviar Notificación de Prueba</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: theme.background, borderColor: theme.border }]} 
            onPress={() => {
              hapticLight();
              viewScheduledNotifications();
            }}
          >
            <Ionicons name="list-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: theme.primary }]}>Ver Programadas ({notificationCount})</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.expandButton, { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }]} 
            onPress={() => {
              hapticMedium();
              clearAllNotifications();
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={[styles.expandButtonText, { color: '#DC2626' }]}>Cancelar Todas</Text>
          </TouchableOpacity>
        </View>


        {/* Información de la App */}
        <View style={[
          styles.sectionCard, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          }
        ]}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#6B7280', '#4B5563']}
              style={styles.iconCircleSection}
            >
              <Ionicons name="information-circle" size={24} color="#FFFFFF" />
            </LinearGradient>
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
        </View>
      </ScrollView>
      
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4
  },
  heading: { 
    fontSize: 36, 
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 4
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  content: {
    padding: 16,
    paddingBottom: 80
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 135,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden'
  },
  statCardGlass: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  statCardGradient: {
    flex: 1,
    width: '100%',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    opacity: 0.98,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  iconCircleSection: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 52,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600'
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
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2.5,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    minHeight: 52
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 14,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  userListContainer: {
    marginTop: 8
  },
  userCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    minHeight: Platform.OS === 'web' ? 90 : 85,
    gap: 10
  },
  userInfo: {
    flex: 1
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    flex: 1
  },
  userTextContainer: {
    flex: 1,
    minWidth: 0
  },
  userAvatar: {
    width: Platform.OS === 'web' ? 48 : 44,
    height: Platform.OS === 'web' ? 48 : 44,
    borderRadius: Platform.OS === 'web' ? 24 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    flexShrink: 0
  },
  userName: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2
  },
  userRoleBadge: {
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    flexShrink: 0
  },
  userRoleText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  userEmail: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '600'
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  userDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  userDate: {
    fontSize: 12
  },
  statusButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minHeight: Platform.OS === 'web' ? 44 : 40,
    flexShrink: 0,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2
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
    borderRadius: 28,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 22,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  urgentModalSubtitle: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  urgentModalScroll: {
    maxHeight: 400,
    padding: 18
  },
  urgentModalFooter: {
    padding: 18,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 100
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    letterSpacing: -0.3
  },
  urgentTaskArea: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 40
  },
  urgentTaskTime: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: -0.2
  },
  urgentModalFooter: {
    padding: 18,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(239, 68, 68, 0.2)'
  },
  urgentModalButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3
  },
});




