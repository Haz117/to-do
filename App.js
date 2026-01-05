// App.js
// Punto de entrada: configura Navigation con Bottom Tabs, expo-notifications y permisos básicos.
// Navegación principal por pestañas + Stack para modales (TaskDetail, TaskChat)

// IMPORTANTE: Este import debe estar PRIMERO antes de cualquier otro
import 'react-native-gesture-handler';

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import TaskChatScreen from './screens/TaskChatScreen';
import MyInboxScreen from './screens/MyInboxScreen';
import KanbanScreen from './screens/KanbanScreen';
import ReportScreen from './screens/ReportScreen';
import AdminScreen from './screens/AdminScreen';
import CalendarScreen from './screens/CalendarScreen';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getCurrentSession } from './services/authFirestore';
import { ThemeProvider } from './contexts/ThemeContext';

// Configurar handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

// Componente de navegación por tabs personalizado

function CustomTabBar({ activeTab, setActiveTab, userRole, userName, onLogout }) {
  const allTabs = [
    { name: 'Tareas', icon: 'checkbox-outline', screen: 'Home' },
    { name: 'Calendario', icon: 'calendar-outline', screen: 'Calendar' },
    { name: 'Kanban', icon: 'grid-outline', screen: 'Kanban' },
    { name: 'Reportes', icon: 'stats-chart-outline', screen: 'Report' },
    { name: 'Admin', icon: 'settings-outline', screen: 'Admin' }
  ];

  // Filtrar tabs según rol:
  // - Operativo: Solo Tareas, Calendario y Kanban
  // - Jefe/Admin: Todos los tabs (Admin solo para admin)
  let tabs = allTabs;
  if (userRole === 'operativo') {
    tabs = allTabs.filter(tab => ['Home', 'Calendar', 'Kanban'].includes(tab.screen));
  } else if (userRole !== 'admin') {
    tabs = allTabs.filter(tab => tab.screen !== 'Admin');
  }

  return (
    <View>
      {/* Indicador de rol */}
      {userRole && (
        <View style={styles.roleIndicator}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.roleBadge, userRole === 'admin' && styles.roleBadgeAdmin]}>
              <Ionicons 
                name={userRole === 'admin' ? 'shield-checkmark' : 'person'} 
                size={14} 
                color="#FFFFFF" 
                style={{ marginRight: 4 }}
              />
              <Text style={styles.roleBadgeText}>
                {userRole === 'admin' ? 'Admin' : userRole === 'jefe' ? 'Jefe' : 'Operativo'}
              </Text>
            </View>
            {userName && (
              <Text style={styles.userNameText}>{userName}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={20} color="#8B0000" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.screen}
          style={styles.tabItem}
          onPress={() => setActiveTab(tab.screen)}
        >
          <Ionicons 
            name={activeTab === tab.screen ? tab.icon.replace('-outline', '') : tab.icon} 
            size={activeTab === tab.screen ? 28 : 24} 
            color={activeTab === tab.screen ? '#8B0000' : '#8E8E93'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.screen && styles.tabLabelActive
          ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
      </View>
    </View>
  );
}

// Navegador principal
function MainNavigator({ navigation, onLogout }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setUserRole(result.session.role);
      setUserName(result.session.displayName);
    }
  };

  const renderScreen = () => {
    const screenProps = { navigation, onLogout };
    
    switch (activeTab) {
      case 'Home':
        return <HomeScreen {...screenProps} />;
      case 'Calendar':
        return <CalendarScreen {...screenProps} />;
      case 'Kanban':
        return <KanbanScreen {...screenProps} />;
      case 'MyInbox':
        return <MyInboxScreen {...screenProps} />;
      case 'Report':
        return <ReportScreen {...screenProps} />;
      case 'Admin':
        return <AdminScreen {...screenProps} />;
      default:
        return <HomeScreen {...screenProps} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      <CustomTabBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
        userName={userName} 
        onLogout={onLogout}
      />
    </View>
  );
}

export default function App() {
  const navigationRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const result = await getCurrentSession();
    setIsAuthenticated(result.success);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    const { logoutUser } = require('./services/authFirestore');
    await logoutUser();
    setIsAuthenticated(false);
  };
  
  useEffect(() => {
    (async () => {
      // Pedir permiso para notificaciones (solo funciona en development build, no en Expo Go)
      if (Device.isDevice) {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            console.log('[Notifications] Permisos de notificación denegados');
          } else {
            console.log('[Notifications] Permisos de notificación concedidos');
          }
        } catch (error) {
          // Silenciar error en Expo Go donde push notifications no están disponibles
          console.log('[Notifications] No disponibles en Expo Go');
        }
      }
    })();

    // Listener para notificaciones recibidas cuando la app está en foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Recibida:', notification.request.content.title);
    });

    // Listener para cuando el usuario interactúa con una notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Usuario interactuó:', data);
      
      // Navegar a la tarea si se proporciona el ID
      if (data.taskId && navigationRef.current) {
        navigationRef.current.navigate('TaskDetail', { taskId: data.taskId });
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
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
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              // Transiciones nativas optimizadas
              animation: 'default',
              presentation: 'card',
              contentStyle: { backgroundColor: '#FAFAFA' },
              // Configuración de animación sutil
              animationDuration: 250, // Rápido pero visible
              gestureEnabled: true, // Swipe back habilitado
              gestureDirection: 'horizontal',
              // Optimización crítica
              animationTypeForReplace: 'push',
              // Customización de transición
              customAnimationOnGesture: true,
              fullScreenGestureEnabled: true,
            }}
          >
            {!isAuthenticated ? (
              <Stack.Screen 
                name="Login" 
                options={{ 
                  headerShown: false,
                  animation: 'fade', // Fade-in suave para login
                  animationDuration: 200,
                  gestureEnabled: false // No swipe en login
                }}
              >
                {(props) => <LoginScreen {...props} onLogin={() => setIsAuthenticated(true)} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen 
                  name="Main"
                  options={{ 
                    headerShown: false,
                    animation: 'fade',
                    animationDuration: 200,
                  }}
                >
                  {(props) => <MainNavigator {...props} onLogout={handleLogout} />}
                </Stack.Screen>
                <Stack.Screen 
                  name="TaskDetail" 
                  component={TaskDetailScreen}
                  options={{ 
                    presentation: 'card',
                    animation: 'slide_from_right', // iOS style
                    animationDuration: 250,
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                    fullScreenGestureEnabled: true,
                  }}
                />
                <Stack.Screen 
                  name="TaskChat" 
                  component={TaskChatScreen}
                  options={{ 
                    presentation: 'modal', // Modal style para chat
                    animation: 'slide_from_bottom',
                    animationDuration: 300, // Un poco más lento para modal
                    gestureEnabled: true,
                    gestureDirection: 'vertical', // Swipe down para cerrar
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
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.1)'
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  roleBadgeAdmin: {
    backgroundColor: '#8B0000'
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  userNameText: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '600',
    marginLeft: 8
  },
  logoutButton: {
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
    color: '#8B0000',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    height: 85,
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  tabIcon: {
    marginBottom: 3
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.2
  },
  tabLabelActive: {
    color: '#8B0000',
    fontWeight: '700'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B0000',
    fontWeight: '600'
  }
});
