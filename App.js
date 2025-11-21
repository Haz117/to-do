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
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import TaskChatScreen from './screens/TaskChatScreen';
import MyInboxScreen from './screens/MyInboxScreen';
import KanbanScreen from './screens/KanbanScreen';
import ReportScreen from './screens/ReportScreen';
import AdminScreen from './screens/AdminScreen';
import { onAuthChange, signOut } from './services/auth';
import { getExpoPushToken, registerDeviceToken, unregisterDeviceToken, configureNotifications } from './services/fcm';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configurar handler de notificaciones con FCM
configureNotifications();

const Stack = createNativeStackNavigator();

// Componente de navegación por tabs personalizado

function CustomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { name: 'Tareas', icon: 'checkbox-outline', screen: 'Home' },
    { name: 'Kanban', icon: 'grid-outline', screen: 'Kanban' },
    { name: 'Bandeja', icon: 'mail-outline', screen: 'MyInbox' },
    { name: 'Reportes', icon: 'stats-chart-outline', screen: 'Report' },
    { name: 'Admin', icon: 'settings-outline', screen: 'Admin' }
  ];

  return (
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
  );
}

// Navegador principal
function MainNavigator({ navigation }) {
  const [activeTab, setActiveTab] = useState('Home');

  const renderScreen = () => {
    const screenProps = { navigation };
    
    switch (activeTab) {
      case 'Home':
        return <HomeScreen {...screenProps} />;
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
      <CustomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </View>
  );
}

export default function App() {
  const navigationRef = useRef();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  
  useEffect(() => {
    // Observar cambios en autenticación
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Usuario inició sesión: registrar token de push notifications
        const token = await getExpoPushToken();
        if (token) {
          setExpoPushToken(token);
          await registerDeviceToken(token);
          console.log('✅ Token de push registrado para usuario:', currentUser.email);
        }
      } else {
        // Usuario cerró sesión: eliminar token
        if (expoPushToken) {
          await unregisterDeviceToken(expoPushToken);
          setExpoPushToken(null);
          console.log('✅ Token de push eliminado');
        }
      }
    });

    return () => unsubscribe();
  }, [expoPushToken]);
  
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
            console.log('Permisos de notificación denegados');
          } else {
            console.log('✅ Permisos de notificación concedidos');
          }
        } catch (error) {
          // Silenciar error en Expo Go donde push notifications no están disponibles
          console.log('Notificaciones no disponibles en Expo Go');
        }
      }
    })();

    // Listener para notificaciones recibidas cuando la app está en foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notificación recibida:', notification.request.content.title);
    });

    // Listener para cuando el usuario interactúa con una notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Usuario interactuó con notificación:', data);
      
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

  // Pantalla de carga mientras verifica autenticación
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si no hay usuario autenticado, mostrar LoginScreen
  if (!user) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LoginScreen />
      </GestureHandlerRootView>
    );
  }

  // Usuario autenticado, mostrar app principal
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_bottom',
            presentation: 'modal',
            contentStyle: { backgroundColor: '#FAFAFA' }
          }}
        >
          <Stack.Screen 
            name="MainTabs" 
            component={MainNavigator}
            options={{ headerShown: false }}
          />
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
              presentation: 'card',
              animation: 'slide_from_right'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
