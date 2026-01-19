// App.debug.js - Versión simplificada para debug
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>App funcionando ✅</Text>
      <Text style={styles.subtext}>Si ves esto, el problema está en otro archivo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9F2241',
    marginBottom: 16
  },
  subtext: {
    fontSize: 16,
    color: '#666'
  }
});
