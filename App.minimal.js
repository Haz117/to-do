// App.js - VERSION MINIMA PARA DEBUG
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log('🚀 App MINIMA iniciando');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ APP FUNCIONANDO</Text>
      <Text style={styles.subtitle}>Si ves esto, la app carga correctamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9F2241',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
});
