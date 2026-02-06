# 🎨 GUÍA RÁPIDA DE DISEÑO - M2 TODO APP

## 📏 SISTEMA DE ESPACIADO

```
SPACING = {
  xs:   4px    (micro spacers, icons margins)
  sm:   8px    (small gaps, tight layouts)
  md:   12px   (default, most common)
  lg:   16px   (comfortable, card padding)
  xl:   24px   (section spacing)
  xxl:  32px   (major sections)
  xxxl: 48px   (full screen margins)
}
```

### Touch Targets (WCAG AA)
| Tamaño | Uso |
|--------|-----|
| 44px | Mínimo absoluto (small buttons) |
| 48px | **Recomendado** (buttons, tabs) |
| 56px | Grande (primary actions) |

---

## 🔤 TIPOGRAFÍA

### Tamaños Base
| Nivel | Desktop | Tablet | Móvil |
|-------|---------|--------|-------|
| H1 - Titulo | 32px | 28px | 24px |
| H2 - Subtitle | 28px | 24px | 20px |
| H3 - Heading | 24px | 20px | 18px |
| Body | 16px | 15px | 14px |
| Small | 14px | 13px | 12px |
| Caption | 12px | 12px | 11px |

### Pesos
- **Bold (700)**: Títulos, CTA prominentes
- **SemiBold (600)**: Subtítulos, labels
- **Regular (400)**: Body text
- **Medium (500)**: Accents, small titles

### Line Height
- **Títulos**: 1.2x-1.3x (Normal / Tight)
- **Body**: 1.5x-1.6x (Comfortable Reading)

---

## 🎨 PALETA DE COLORES

### Primario
| Nombre | Valor | Uso |
|--------|-------|-----|
| Primary | #9F2241 | Botones, accents |
| Primary Light | #B8314F | Hover, backgrounds |
| Primary Dark | #7A1A32 | Dark mode, pressed |

### Estados
| Estado | Color | Background |
|--------|-------|------------|
| ✅ Success | #10B981 | rgba(16, 185, 129, 0.1) |
| ⚠️ Warning | #F59E0B | rgba(245, 158, 11, 0.1) |
| ❌ Error | #EF4444 | rgba(239, 68, 68, 0.15) |
| ℹ️ Info | #3B82F6 | rgba(59, 130, 246, 0.15) |

### Grayscale (Tema Claro)
| Nivel | Color | Uso |
|-------|-------|-----|
| Text | #18181B | Primary text |
| Text Secondary | #6B7280 | Secondary text |
| Text Tertiary | #9CA3AF | Hints, disabled |
| Border | #E5E7EB | Dividers |
| Surface | #F3F4F6 | Backgrounds |
| Card | #FFFFFF | Cards, elevated |

---

## 🎯 BREAKPOINTS

```javascript
BREAKPOINTS = {
  mobile: 0,              // < 375px (iPhone SE)
  mobileLarge: 375,       // iPhone 12/13 (375px)
  tablet: 768,            // iPad (768px+)
  desktop: 1024,          // iPad Pro / Desktop
  desktopLarge: 1440,     // 4K / Large Desktop
}
```

### Estrategia Responsiva
- **Mobile First**: Diseñar para móvil primero
- **1 Columna**: < 768px
- **2 Columnas**: 768px - 1024px
- **3 Columnas**: 1024px - 1440px
- **4 Columnas**: > 1440px

---

## 🔘 COMPONENTES CORE

### Button
```javascript
// Variantes
variant="primary"    // Acción principal (gradiente)
variant="secondary"  // Acción secundaria (fondo sutil)
variant="ghost"      // Link-like (solo borde)
variant="danger"     // Acciones destructivas (rojo)

// Tamaños
size="small"      // Acciones menores (44px)
size="medium"     // Default (48px) ✅
size="large"      // Prominente (56px)

// Estados
loading={true}    // Muestra "Cargando..."
disabled={true}   // Deshabilitado
fullWidth={true}  // Ancho completo
```

### Card
```javascript
// Variantes
variant="elevated"  // Sombra (default)
variant="flat"      // Sin sombra, fondo plano
variant="glass"     // Glassmorphism
variant="outlined"  // Solo borde

// Propiedades
padding={16}      // Padding interno
animated={true}   // Scale animation on press
onPress={fn}      // Hacer clickeable
```

### Input
```javascript
// Propiedades
label="Email"           // Label flotante
icon="mail"             // Ionicons name
error="Campo requerido" // Mensaje de error
success={true}          // Checkmark si válido
disabled={false}        // Deshabilitado
multiline={false}       // Para textarea
```

### StatCard (NUEVO)
```javascript
// Propiedades
icon="checkmark-done"
label="Completadas"
value="24"
trend={{ direction: 'up', value: '+12%' }}
variant="success"   // success|warning|error|info|default
```

### EmptyState
```javascript
// Propiedades
icon="document-outline"
title="Sin tareas"
message="Crea una tarea para comenzar"
variant="info"      // default|success|info|warning
action={<Button />} // Acción opcional
```

---

## 🎬 ANIMACIONES

### Duraciones
| Tipo | Duración | Uso |
|------|----------|-----|
| Rápida | 150ms | Feedback inmediato |
| Normal | 300ms | Transiciones |
| Lenta | 500ms | Entrada de pantalla |
| Loop | 3000ms | Animaciones continuas |

### Efectos
- **Scale**: Botones press (0.96x)
- **Fade**: Entrada de contenido
- **Slide**: Navegación
- **Float**: EmptyState
- **Spring**: Resorte suave

---

## ♿ ACCESIBILIDAD - CHECKLIST

### Contraste
- [ ] Texto primario vs fondo: 7:1 (AAA ideal)
- [ ] Texto secundario vs fondo: 4.5:1 (AA mínimo)
- [ ] Icono 18px+: 3:1 (mínimo)

### Touch Targets
- [ ] Botones: 48px mínimo
- [ ] Tabs: 48x48px
- [ ] Checkboxes: 44x44px

### Navegación
- [ ] Focus states visibles
- [ ] Keyboard navigation funcional
- [ ] Screen reader labels

---

## 📐 BORDER RADIUS

| Tamaño | Valor | Uso |
|--------|-------|-----|
| xs | 4px | Subtle, small elements |
| sm | 8px | Small buttons, chips |
| md | 12px | Cards, inputs |
| lg | 16px | Large cards, modals |
| xl | 20px | Very large elements |
| round | 9999px | Circular (avatars, badges) |

---

## 🌈 TEMA OSCURO

### Cambios Automáticos
- Text: #FFFFFF (en lugar de #18181B)
- Background: #0F0F10 (en lugar de #FAFAFA)
- Card: #1A1A1D (en lugar de #FFFFFF)
- Border: #2C2C2E (en lugar de #E5E7EB)

### Primario en Dark Mode
- Primary: #FF6B9D (más claro, más legible)
- Primary Dark: #9F2241 (mismo)

---

## 📱 MOBILE-FIRST TIPS

1. **Stack Vertical**: No hagas grid en móvil
2. **Big Touch**: 48px+ para todos los botones
3. **Readable Text**: 14px+ en móvil
4. **Full Width**: Usa máximo espacio en pequeño
5. **Meta First**: Oculta detalles secundarios
6. **Swipe**: Usa gestos para tablet+
7. **Simple**: Menos es más en móvil

---

## 🚀 PERFORMANCE TIPS

1. **Images**: Optimizar con sharp, responsive sizes
2. **Animations**: Usar `useNativeDriver: true`
3. **FlatList**: Siempre con `keyExtractor`
4. **Memoization**: React.memo en componentes pesados
5. **Lighthouse**: Aspirar a 90+ en mobile

---

## 📋 COMPONENTES DISPONIBLES (45+)

### Inputs & Forms
- Input (con estados)
- Button (variantes)
- SearchBar
- DateTimeSelector
- UserSelector (NUEVO)
- AreaSelector (NUEVO)
- TagInput

### Feedback
- Toast
- ConfirmDialog
- OverdueAlert
- LoadingIndicator
- ShimmerEffect
- SkeletonLoader

### Data Display
- Card (variantes)
- TaskItem
- StatCard (NUEVO)
- CircularProgress
- Heatmap
- TagCloud

### Navigation & Layout
- FloatingActionButton
- BottomSheet
- ContextMenu
- ParallaxHeader
- ScrollToTop

### Animations
- FadeInView
- FlipCard
- SpringCard
- PulseView
- PulsingDot
- AnimetBadge

---

## 🎯 DESIGN SYSTEM LINKS

- **Tokens**: `theme/tokens.js`
- **Theme Context**: `contexts/ThemeContext.js`
- **Responsive**: `utils/responsive.js`
- **Typography**: `utils/responsiveTypography.js` (NUEVO)
- **Colors**: 50+ colores predefinidos en ThemeContext

---

**Última Actualización:** 6 de febrero de 2026
**Versión:** 2.0 (con mejoras UX/UI)

