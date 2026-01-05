// screens/AdminScreen.js
// Pantalla de configuración y administración
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { generateTaskReport, generateMonthlyReport } from '../services/reports';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as Notifications from 'expo-notifications';
import { getCurrentSession, logoutUser, isAdmin } from '../services/authFirestore';
import { useTheme } from '../contexts/ThemeContext';

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
  
  useEffect(() => {
    loadNotificationCount();
    loadCurrentUser();
    loadAllUsers();
  }, []);

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
              const result = await generateTaskReport();
              Alert.alert(
                'Reporte Generado', 
                'El archivo CSV ha sido generado.\n\nNOTA: La descarga de archivos tiene limitaciones en Expo Go. En producción el archivo se guardará en la carpeta de Descargas.'
              );
            } catch (error) {
              Alert.alert(
                'Información', 
                'La exportación de reportes está implementada pero tiene limitaciones en Expo Go.\n\nEn un build de producción, el archivo CSV se guardará en la carpeta de Descargas del dispositivo.'
              );
              console.log('[Export] Error (esperado en Expo Go):', error.message);
            }
          }
        },
        {
          text: 'Estadísticas Mensuales',
          onPress: async () => {
            const now = new Date();
            try {
              await generateMonthlyReport(now.getFullYear(), now.getMonth() + 1);
              Alert.alert('Reporte Generado', 'Las estadísticas han sido exportadas');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B0000', '#6B0000']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Administración</Text>
            <Text style={styles.subheading}>{currentUser?.displayName || 'Cargando...'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={async () => {
              Alert.alert(
                'Cerrar Sesión',
                '¿Estás seguro que deseas cerrar sesión?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Cerrar Sesión',
                    style: 'destructive',
                    onPress: async () => {
                      await logoutUser();
                      if (onLogout) {
                        onLogout();
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Lista de Usuarios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={22} color="#8B0000" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Usuarios ({allUsers.length})</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowUserList(!showUserList)}
          >
            <View style={styles.buttonOutline}>
              <Ionicons 
                name={showUserList ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#5856D6" 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.buttonTextOutline}>
                {showUserList ? 'Ocultar Lista' : 'Ver Todos los Usuarios'}
              </Text>
            </View>
          </TouchableOpacity>

          {showUserList && (
            <View style={styles.userListContainer}>
              {allUsers.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <View style={styles.userHeader}>
                      <Ionicons 
                        name={user.role === 'admin' ? 'shield-checkmark' : 'person'} 
                        size={18} 
                        color={user.role === 'admin' ? '#8B0000' : '#5856D6'} 
                      />
                      <Text style={styles.userName}>{user.displayName}</Text>
                      <View style={[styles.userRoleBadge, user.role === 'admin' && styles.userRoleBadgeAdmin]}>
                        <Text style={styles.userRoleText}>{user.role}</Text>
                      </View>
                    </View>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userDate}>
                      Creado: {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusButton, !user.active && styles.statusButtonInactive]}
                    onPress={() => toggleUserStatus(user.id, user.active)}
                  >
                    <Text style={styles.statusButtonText}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Crear Usuario */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-add" size={22} color="#8B0000" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Crear Usuario</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#8B0000" style={styles.inputIcon} />
            <TextInput
              placeholder="Nombre del usuario"
              placeholderTextColor="#C7C7CC"
              value={userName}
              onChangeText={setUserName}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8B0000" style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#C7C7CC"
              value={userEmail}
              onChangeText={setUserEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8B0000" style={styles.inputIcon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#C7C7CC"
              value={userPassword}
              onChangeText={setUserPassword}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[styles.roleButton, userRole === 'operativo' && styles.roleButtonActive]}
              onPress={() => setUserRole('operativo')}
            >
              <Text style={[styles.roleButtonText, userRole === 'operativo' && styles.roleButtonTextActive]}>
                Operativo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleButton, userRole === 'admin' && styles.roleButtonActive]}
              onPress={() => setUserRole('admin')}
            >
              <Text style={[styles.roleButtonText, userRole === 'admin' && styles.roleButtonTextActive]}>
                Administrador
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={createUser}>
            <LinearGradient colors={['#34C759', '#28A745']} style={styles.buttonGradient}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Crear Usuario</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recuperación de Contraseña */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={22} color="#8B0000" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Resetear Contraseña</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8B0000" style={styles.inputIcon} />
            <TextInput
              placeholder="Email del usuario"
              placeholderTextColor="#C7C7CC"
              value={resetEmail}
              onChangeText={setResetEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8B0000" style={styles.inputIcon} />
            <TextInput
              placeholder="Nueva contraseña"
              placeholderTextColor="#C7C7CC"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={resetUserPassword}>
            <LinearGradient colors={['#FF9500', '#FF8000']} style={styles.buttonGradient}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Resetear Contraseña</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Solo administradores pueden resetear contraseñas de otros usuarios.
          </Text>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={22} color="#8B0000" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Notificaciones</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{notificationCount}</Text>
              <Text style={styles.statLabel}>Programadas</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={testNotification}>
            <LinearGradient colors={['#34C759', '#28A745']} style={styles.buttonGradient}>
              <Ionicons name="flask" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Enviar Notificación de Prueba</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={viewScheduledNotifications}>
            <View style={styles.buttonOutline}>
              <Ionicons name="list-outline" size={20} color="#5856D6" style={{ marginRight: 8 }} />
              <Text style={styles.buttonTextOutline}>Ver Notificaciones Programadas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={clearAllNotifications}>
            <View style={[styles.buttonOutline, styles.buttonDanger]}>
              <Ionicons name="trash-outline" size={20} color="#8B0000" style={ { marginRight: 8 }} />
              <Text style={[styles.buttonTextOutline, styles.buttonTextDanger]}>Cancelar Todas</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Reportes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart" size={22} color="#8B0000" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Reportes</Text>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={exportReport}>
            <LinearGradient colors={['#007AFF', '#0051D5']} style={styles.buttonGradient}>
              <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Exportar Reporte</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Los reportes se exportan en formato CSV (compatible con Excel).
          </Text>
        </View>

        {/* Información de la App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firebase Auth</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Activo</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firestore Sync</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Conectado</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modo Oscuro</Text>
            <TouchableOpacity
              style={[styles.themeToggle, isDark && styles.themeToggleActive]}
              onPress={toggleTheme}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
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
  section: {
    marginBottom: 32
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#F5DEB3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500'
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#8B0000',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7'
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F2F2F7'
  },
  roleButtonActive: {
    backgroundColor: '#8B0000'
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93'
  },
  roleButtonTextActive: {
    color: '#FFFFFF'
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden'
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5856D6',
    borderRadius: 14
  },
  buttonDanger: {
    borderColor: '#8B0000',
    backgroundColor: '#FFEBEE'
  },
  buttonTextOutline: {
    color: '#5856D6',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonTextDanger: {
    color: '#8B0000'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6E6E73'
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A'
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
  logoutButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  helpText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  userListContainer: {
    marginTop: 12
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  userInfo: {
    flex: 1
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1
  },
  userRoleBadge: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  userRoleBadgeAdmin: {
    backgroundColor: '#8B0000'
  },
  userRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  userEmail: {
    fontSize: 14,
    color: '#6E6E73',
    marginBottom: 4
  },
  userDate: {
    fontSize: 12,
    color: '#8E8E93'
  },
  statusButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  statusButtonInactive: {
    backgroundColor: '#8E8E93'
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
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
    backgroundColor: '#8B0000'
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
  }
});
