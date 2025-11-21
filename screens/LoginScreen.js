// screens/LoginScreen.js
// Pantalla de login y registro con Firebase Auth
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signIn, signUp } from '../services/auth';
import { DEPARTMENTS } from '../services/roles';

export default function LoginScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [showDepartments, setShowDepartments] = useState(false);
  const [loading, setLoading] = useState(false);

  const departmentOptions = [
    { value: DEPARTMENTS.PRESIDENCIA, label: 'Presidencia' },
    { value: DEPARTMENTS.JURIDICA, label: 'Jurídica' },
    { value: DEPARTMENTS.OBRAS, label: 'Obras Públicas' },
    { value: DEPARTMENTS.TESORERIA, label: 'Tesorería' },
    { value: DEPARTMENTS.RRHH, label: 'Recursos Humanos' },
    { value: DEPARTMENTS.ADMINISTRACION, label: 'Administración' }
  ];

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }
      if (!displayName.trim()) {
        Alert.alert('Error', 'Por favor ingresa tu nombre');
        return;
      }
      if (!department) {
        Alert.alert('Error', 'Por favor selecciona tu departamento');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        // La navegación se maneja en App.js con onAuthChange
      } else {
        await signUp(email.trim(), password, displayName.trim(), department);
        Alert.alert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setDepartment('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#8B0000', '#6B0000', '#4A0000']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-done" size={60} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>TodoApp</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#8B0000" style={styles.inputIcon} />
                <TextInput
                  placeholder="Nombre completo"
                  placeholderTextColor="#C7C7CC"
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            )}

            {!isLogin && (
              <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => setShowDepartments(!showDepartments)}
              >
                <Ionicons name="business-outline" size={20} color="#8B0000" style={styles.inputIcon} />
                <Text style={[styles.input, !department && styles.placeholder]}>
                  {department ? departmentOptions.find(d => d.value === department)?.label : 'Selecciona tu departamento'}
                </Text>
                <Ionicons name={showDepartments ? "chevron-up" : "chevron-down"} size={20} color="#8B0000" />
              </TouchableOpacity>
            )}

            {!isLogin && showDepartments && (
              <View style={styles.dropdownContainer}>
                {departmentOptions.map((dept) => (
                  <TouchableOpacity
                    key={dept.value}
                    style={[
                      styles.dropdownItem,
                      department === dept.value && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setDepartment(dept.value);
                      setShowDepartments(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownText,
                      department === dept.value && styles.dropdownTextSelected
                    ]}>
                      {dept.label}
                    </Text>
                    {department === dept.value && (
                      <Ionicons name="checkmark-circle" size={20} color="#8B0000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#C7C7CC"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="#C7C7CC"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#8B0000" style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#C7C7CC"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Botón principal */}
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#999', '#777'] : ['#FFFFFF', '#F8F9FA']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <Text style={styles.buttonText}>Cargando...</Text>
                ) : (
                  <>
                    <Ionicons 
                      name={isLogin ? 'log-in-outline' : 'person-add-outline'} 
                      size={20} 
                      color="#8B0000" 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={styles.buttonText}>
                      {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Toggle Login/Registro */}
            <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.toggleTextBold}>
                  {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info adicional */}
          <View style={styles.footer}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.featureText}>Tus datos están protegidos</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="cloud-done" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.featureText}>Sincronización en tiempo real</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  gradient: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -2
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    letterSpacing: 0.3
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center'
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
  button: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B0000',
    letterSpacing: 0.5
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12
  },
  toggleText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500'
  },
  toggleTextBold: {
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500'
  },
  placeholder: {
    color: '#C7C7CC'
  },
  dropdownContainer: {
    backgroundColor: '#FFFAF0',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F5DEB3',
    overflow: 'hidden'
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5DEB3'
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(139, 0, 0, 0.05)'
  },
  dropdownText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500'
  },
  dropdownTextSelected: {
    color: '#8B0000',
    fontWeight: '700'
  }
});
