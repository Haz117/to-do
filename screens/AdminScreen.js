// screens/AdminScreen.js
// Pantalla de configuración y administración
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ensurePermissions, getAllScheduledNotifications, cancelAllNotifications } from '../services/notifications';
import { getCurrentUser, getCurrentUserName, getCurrentUserUID, signOut } from '../services/auth';
import { getUserProfile, ROLES, DEPARTMENTS } from '../services/roles';
import { generateTaskReport, generateMonthlyReport } from '../services/reports';
import * as Notifications from 'expo-notifications';

export default function AdminScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    loadNotificationCount();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await getUserProfile();
    setUserProfile(profile);
  };

  const loadNotificationCount = async () => {
    const notifications = await getAllScheduledNotifications();
    setNotificationCount(notifications.length);
  };

  const logout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión: ' + error.message);
            }
          }
        }
      ]
    );
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
      
      // Actualizar contador
      setTimeout(() => loadNotificationCount(), 100);
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
            setNotificationCount(0);
            Alert.alert('✅ Listo', 'Todas las notificaciones han sido canceladas');
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
              await generateTaskReport();
              Alert.alert('✅ Reporte Generado', 'El reporte ha sido exportado exitosamente');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        },
        {
          text: 'Estadísticas Mensuales',
          onPress: async () => {
            const now = new Date();
            try {
              await generateMonthlyReport(now.getFullYear(), now.getMonth() + 1);
              Alert.alert('✅ Reporte Generado', 'Las estadísticas han sido exportadas');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const getRoleLabel = (role) => {
    const labels = {
      [ROLES.ADMIN]: 'Administrador',
      [ROLES.JEFE]: 'Jefe de Área',
      [ROLES.OPERATIVO]: 'Operativo'
    };
    return labels[role] || 'Sin rol';
  };

  const getDepartmentLabel = (dept) => {
    const labels = {
      [DEPARTMENTS.PRESIDENCIA]: 'Presidencia',
      [DEPARTMENTS.JURIDICA]: 'Jurídica',
      [DEPARTMENTS.OBRAS]: 'Obras Públicas',
      [DEPARTMENTS.TESORERIA]: 'Tesorería',
      [DEPARTMENTS.RRHH]: 'Recursos Humanos',
      [DEPARTMENTS.ADMINISTRACION]: 'Administración'
    };
    return labels[dept] || 'Sin departamento';
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
            <Text style={styles.heading}>Configuración</Text>
            <Text style={styles.subheading}>Preferencias y ajustes</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
        
        {currentUser && (
          <View style={styles.currentUserBanner}>
            <Ionicons name="person-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.currentUserText}>
              {getCurrentUserName() || currentUser.email}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Usuario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Cuenta</Text>
          
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['#5856D6', '#4842C2']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {getCurrentUserName()?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{getCurrentUserName() || 'Usuario'}</Text>
              <Text style={styles.userEmail}>{currentUser?.email || 'No disponible'}</Text>
              
              {userProfile && (
                <>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, userProfile.role === ROLES.ADMIN && styles.badgeAdmin]}>
                      <Ionicons 
                        name={userProfile.role === ROLES.ADMIN ? 'shield-checkmark' : userProfile.role === ROLES.JEFE ? 'person-circle' : 'person'} 
                        size={12} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.badgeText}>{getRoleLabel(userProfile.role)}</Text>
                    </View>
                    
                    {userProfile.department && (
                      <View style={[styles.badge, styles.badgeDepartment]}>
                        <Ionicons name="business" size={12} color="#FFFFFF" />
                        <Text style={styles.badgeText}>{getDepartmentLabel(userProfile.department)}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
              
              <View style={styles.uidBadge}>
                <Text style={styles.uidLabel}>UID:</Text>
                <Text style={styles.uidText}>{getCurrentUserUID()?.substring(0, 12)}...</Text>
              </View>
            </View>
          </View>
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

        {/* Reportes (solo para Jefe y Admin) */}
        {userProfile && (userProfile.role === ROLES.ADMIN || userProfile.role === ROLES.JEFE) && (
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
              Los reportes se exportan en formato CSV (compatible con Excel) y TXT para estadísticas.
            </Text>
          </View>
        )}

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
        </View>

        {/* Botón de Cerrar Sesión Grande */}
        <TouchableOpacity style={styles.logoutButtonLarge} onPress={logout}>
          <LinearGradient colors={['#8B0000', '#6B0000']} style={styles.buttonGradient}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    letterSpacing: -0.5,
    marginBottom: 16
  },
  infoCard: {
    flexDirection: 'row',
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
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8
  },
  uidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  uidLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E6E73',
    marginRight: 6
  },
  uidText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#8B0000'
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  badgeAdmin: {
    backgroundColor: '#8B0000'
  },
  badgeDepartment: {
    backgroundColor: '#007AFF'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
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
  }
});
