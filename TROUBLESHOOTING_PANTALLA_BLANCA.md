# 🔍 Troubleshooting - Pantalla en Blanco después del Login

## Problema Reportado
- ✅ Login funciona correctamente
- ❌ Después del login, la pantalla queda en blanco/gris
- No se ve el HomeScreen con la lista de tareas

## Soluciones Implementadas

### 1. ✅ Agregada prop `navigation` a MainNavigator
**Archivo:** `App.js`
```javascript
function MainNavigator({ navigation, onLogout }) {
  return (
    <View style={{ flex: 1 }}>
      <HomeScreen navigation={navigation} onLogout={onLogout} />
    </View>
  );
}
```

### 2. ✅ GestureHandlerRootView compatible con web
**Archivo:** `App.js`
```javascript
import { getGestureHandlerRootView } from './utils/platformComponents';
const GestureHandlerRootView = getGestureHandlerRootView();
```

### 3. ✅ Imports faltantes en HomeScreen
**Archivo:** `screens/HomeScreen.js`
Agregados imports:
- ShimmerEffect
- SkeletonLoader
- LoadingIndicator

## Posibles Causas Restantes

### A. Firebase no está cargando tareas
**Verificar:**
1. Abrir consola del navegador (F12)
2. Buscar errores de Firebase
3. Verificar que subscribeToTasks esté funcionando

**Solución temporal:** Agregar console.log para debugging

### B. ThemeContext causando error
**Verificar:**
1. Ver si hay errores relacionados con `useTheme()`
2. Verificar que ThemeProvider esté envolviendo correctamente

### C. Componentes incompatibles con web
**Verificar:**
1. ShimmerEffect
2. SkeletonLoader
3. AnimatedBadge
4. FloatingActionButton

## 🛠️ Debugging Paso a Paso

### Paso 1: Abrir Console del Navegador
```
F12 → Console tab
```
Buscar errores en rojo.

### Paso 2: Verificar que HomeScreen se monta
Agregar en HomeScreen después de exports:
```javascript
console.log('🏠 HomeScreen montado');
```

### Paso 3: Verificar carga de tareas
En el useEffect de subscribeToTasks:
```javascript
subscribeToTasks((updatedTasks) => {
  console.log('📦 Tareas recibidas:', updatedTasks.length);
  setTasks(updatedTasks);
  // ...
});
```

### Paso 4: Verificar ThemeContext
En HomeScreen:
```javascript
const { theme, isDark } = useTheme();
console.log('🎨 Tema:', isDark ? 'Oscuro' : 'Claro');
```

## 🚀 Solución Rápida

Si nada funciona, crear versión mínima de HomeScreen:

```javascript
export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, color: theme.text }}>Home Screen</Text>
      <Text style={{ fontSize: 16, color: theme.textSecondary }}>¡Funciona!</Text>
    </View>
  );
}
```

## 📱 Alternativa: Usar en Móvil

Si web sigue dando problemas:
```bash
# Android
npx expo start --android

# iOS
npx expo start --ios
```

## ✅ Checklist de Verificación

- [x] App.js pasa navigation a HomeScreen
- [x] GestureHandlerRootView compatible con web
- [x] Imports completos en HomeScreen
- [ ] Firebase funcionando correctamente
- [ ] No hay errores en consola del navegador
- [ ] ThemeContext funcionando
- [ ] Componentes rendering correctamente

## 🔄 Próximos Pasos

1. **Revisar consola del navegador** (F12) - buscar errores
2. **Verificar Network tab** - ver si Firebase se está conectando
3. **Simplificar HomeScreen** - quitar componentes complejos temporalmente
4. **Probar en móvil** - verificar que funcione ahí

## 📞 Información Adicional Necesaria

Para diagnosticar mejor, necesitamos saber:
- ¿Hay algún mensaje de error en la consola del navegador?
- ¿La pantalla está completamente en blanco o se ve algún elemento (header, por ejemplo)?
- ¿Funciona correctamente en el emulador de Android/iOS?
- ¿Firebase tiene datos de tareas?

---

**Última actualización:** Enero 2026
**Estado:** 🔍 En investigación
