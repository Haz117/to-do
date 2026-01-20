// App.minimal.test.js - Versión ultra mínima para testing
import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const Stack = createNativeStackNavigator();

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email && password) {
      Alert.alert('Éxito', 'Login funcionando', [
        { text: 'OK', onPress: onLogin }
      ]);
    } else {
      Alert.alert('Error', 'Completa los campos');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Minimal</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ onLogout }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Minimal</Text>
      <Text style={styles.subtitle}>¡App funcionando correctamente! ✅</Text>
      <TouchableOpacity style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={() => setIsAuthenticated(true)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Home">
              {(props) => (
                <HomeScreen 
                  {...props} 
                  onLogout={async () => {
                    setIsAuthenticated(false);
                    props.navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }} 
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9F2241',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#9F2241',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
