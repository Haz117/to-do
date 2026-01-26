// App.js - VERSIÓN COMPLETA CON TABS - Compatible con web
import './polyfills'; // Debe ser lo primero
import 'react-native-gesture-handler';

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { getGestureHandlerRootView } from './utils/platformComponents';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import KanbanScreen from './screens/KanbanScreen';
import CalendarScreen from './screens/CalendarScreen';
import ReportScreen from './screens/ReportScreen';
import AdminScreen from './screens/AdminScreen';
import MyInboxScreen from './screens/MyInboxScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import TaskChatScreen from './screens/TaskChatScreen';
import DashboardScreen from './screens/DashboardScreen';
import { getCurrentSession, logoutUser } from './services/authFirestore';
import { startConnectivityMonitoring } from './services/offlineQueue';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GestureHandlerRootView = getGestureHandlerRootView();

// Referencia global de navegación
let globalNavigationRef = null;

// Tab Navigator con todas las pantallas
function MainTabs({ onLogout }) {
  const { theme, isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Obtener sesión actual solo una vez al montar
  useEffect(() => {
    let mounted = true;
    getCurrentSession().then((result) => {
      if (result.success && mounted) {
        setCurrentUser(result.session);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Suscribirse a tareas solo cuando currentUser esté disponible
  useEffect(() => {
    if (!currentUser) return;

    let mounted = true;
    const { subscribeToTasks } = require('./services/tasks');
    
    const unsubscribe = subscribeToTasks((tasks) => {
      if (!mounted) return;
      
      let userOverdue = [];
      if (currentUser.role === 'admin') {
        userOverdue = tasks.filter(t => t.dueAt < Date.now() && t.status !== 'cerrada');
      } else {
        userOverdue = tasks.filter(t => 
          t.dueAt < Date.now() && 
          t.status !== 'cerrada' && 
          t.assignedTo === currentUser.email
        );
      }
      
      const newCount = userOverdue.length;
      setOverdueCount(newCount);
      
      // Actualizar badge de app (solo si cambió)
      try {
        const Notifications = require('expo-notifications');
        Notifications.default?.setBadgeCountAsync(newCount).catch(() => {});
      } catch (error) {
        // Ignorar si no está disponible
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser?.email, currentUser?.role]);

  const isAdmin = currentUser?.role === 'admin';
  const isJefeOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'jefe';

  return (
    <View style={{ flex: 1 }}>
      {/* Header con usuario y botón de logout */}
      {currentUser && (
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.roleBadge, currentUser.role === 'admin' && styles.roleBadgeAdmin]}>
              <Ionicons 
                name={currentUser.role === 'admin' ? 'shield-checkmark' : 'person'} 
                size={12} 
                color="#FFFFFF" 
                style={{ marginRight: 4 }}
              />
              <Text style={styles.roleBadgeText}>
                {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'jefe' ? 'Jefe' : 'Operativo'}
              </Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{currentUser.displayName || currentUser.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('🔴 BOTÓN SALIR PRESIONADO');
              console.log('🔴 onLogout existe?', typeof onLogout);
              
              if (!onLogout) {
                console.error('❌ ERROR: onLogout no está definido!');
                alert('Error: No se puede cerrar sesión');
                return;
              }
              
              console.log('✅ Llamando onLogout directamente...');
              onLogout();
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#9F2241" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Kanban') iconName = focused ? 'apps' : 'apps-outline';
            else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
            else if (route.name === 'Dashboard') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            else if (route.name === 'Reports') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            else if (route.name === 'Admin') iconName = focused ? 'settings' : 'settings-outline';
            else if (route.name === 'Inbox') iconName = focused ? 'mail' : 'mail-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          // Animaciones entre tabs
          tabBarHideOnKeyboard: true,
          animation: 'fade',
          animationDuration: 250,
        })}
      >
      <Tab.Screen 
        name="Home" 
        options={{ 
          title: 'Inicio',
        }}
      >
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Kanban" 
        options={{ title: 'Tablero' }} 
        component={KanbanScreen} 
      />
      
      <Tab.Screen 
        name="Calendar" 
        options={{ title: 'Calendario' }} 
        component={CalendarScreen} 
      />
      
      <Tab.Screen 
        name="Inbox" 
        options={{ 
          title: 'Bandeja',
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', color: '#FFFFFF' }
        }} 
        component={MyInboxScreen} 
      />
      
      {isJefeOrAdmin && (
        <Tab.Screen 
          name="Dashboard" 
          options={{ title: 'Dashboard' }} 
          component={DashboardScreen} 
        />
      )}
      
      {isJefeOrAdmin && (
        <Tab.Screen 
          name="Reports" 
          options={{ title: 'Reportes' }} 
          component={ReportScreen} 
        />
      )}
      
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          options={{ title: 'Admin' }}
        >
          {(props) => <AdminScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const navigationRef = useRef(null);
  
  // Función de logout que maneja todo el proceso
  const handleLogout = async () => {
    try {
      console.log('🔴 LOGOUT: Iniciando proceso de cierre de sesión');
      
      // Limpiar sesión de AsyncStorage
      await logoutUser();
      console.log('✅ LOGOUT: Sesión eliminada de AsyncStorage');
      
      // Forzar actualización completa
      setIsAuthenticated(false);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
      
      console.log('✅ LOGOUT: Estado actualizado, regresando a Login');
      
      // Toast de confirmación
      Toast.show({
        type: 'success',
        text1: 'Sesión cerrada',
        text2: 'Has cerrado sesión exitosamente',
        position: 'top'
      });
      
    } catch (error) {
      console.error('❌ LOGOUT ERROR:', error);
      // Forzar logout incluso con error
      setIsAuthenticated(false);
      setIsLoading(false);
      setForceUpdate(prev => prev + 1);
    }
  };
  
  useEffect(() => {
    let mounted = true;
    
    // Iniciar monitoreo de conectividad para sincronización offline
    const unsubscribeConnectivity = startConnectivityMonitoring();
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('⏱️ Timeout alcanzado');
        setIsLoading(false);
      }
    }, 2000);
    
    getCurrentSession()
      .then((result) => {
        if (mounted) {
          setIsAuthenticated(result.success);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      });
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribeConnectivity) unsubscribeConnectivity();
    };
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }
  
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} key={`navigation-${forceUpdate}`}>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 250,
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen 
                name="Login"
                options={{ animation: 'fade' }}
              >
                {(props) => (
                  <LoginScreen 
                    {...props} 
                    onLogin={() => {
                      console.log('✅ LOGIN: Autenticación exitosa');
                      setIsAuthenticated(true);
                      setForceUpdate(prev => prev + 1);
                    }} 
                  />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen 
                  name="Main"
                  options={{ animation: 'fade' }}
                >
                  {(props) => (
                    <MainTabs 
                      {...props}
                      onLogout={handleLogout}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskDetail" 
                  component={TaskDetailScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                />
                <Stack.Screen 
                  name="TaskChat" 
                  component={TaskChatScreen}
                  options={{ 
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <Toast />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9F2241',
    fontWeight: '600'
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 45,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  roleBadgeAdmin: {
    backgroundColor: '#9F2241'
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  userName: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  logoutText: {
    fontSize: 12,
    color: '#9F2241',
    fontWeight: '700'
  }
});
