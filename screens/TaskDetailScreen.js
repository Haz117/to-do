// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, Alert, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTask, updateTask, deleteTask } from '../services/tasks';
import { getAllUsersNames } from '../services/roles';
import { scheduleNotificationForTask, cancelNotification, notifyAssignment } from '../services/notifications';
import { getCurrentSession } from '../services/authFirestore';
import Toast from '../components/Toast';
import ShakeInput from '../components/ShakeInput';
import LoadingIndicator from '../components/LoadingIndicator';
import PressableButton from '../components/PressableButton';
import PomodoroTimer from '../components/PomodoroTimer';
import TagInput from '../components/TagInput';
import { useTheme } from '../contexts/ThemeContext';
import { savePomodoroSession } from '../services/pomodoro';
import { AREAS } from '../config/areas';

// Importar DateTimePicker solo en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function TaskDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  // Si route.params.task está presente, estamos editando; si no, creamos nueva
  const editingTask = route.params?.task || null;

  // Función para obtener mañana a las 9am por defecto
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };

  const [title, setTitle] = useState(editingTask ? editingTask.title : '');
  const [description, setDescription] = useState(editingTask ? editingTask.description : '');
  const [assignedTo, setAssignedTo] = useState(editingTask ? editingTask.assignedTo : '');
  const [area, setArea] = useState(editingTask ? editingTask.area : 'Jurídica');
  const [priority, setPriority] = useState(editingTask ? editingTask.priority : 'media');
  const [status, setStatus] = useState(editingTask ? editingTask.status : 'pendiente');
  const [dueAt, setDueAt] = useState(editingTask ? new Date(editingTask.dueAt) : getDefaultDate());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editingTask ? editingTask.isRecurring || false : false);
  const [recurrencePattern, setRecurrencePattern] = useState(editingTask ? editingTask.recurrencePattern || 'daily' : 'daily');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dueAt);
  const [peopleNames, setPeopleNames] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  
  // Modal de selección de usuario
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [saveProgress, setSaveProgress] = useState(null);
  
  // Pomodoro & Tags state
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [tags, setTags] = useState(editingTask?.tags || []);
  const [estimatedHours, setEstimatedHours] = useState(editingTask?.estimatedHours?.toString() || '');
  
  // Expandir opciones avanzadas automáticamente si hay datos
  useEffect(() => {
    if (editingTask && (editingTask.tags?.length > 0 || editingTask.estimatedHours || editingTask.isRecurring)) {
      setShowAdvancedOptions(true);
    }
  }, [editingTask]);
  
  // Refs para inputs
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  
  // Animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const priorities = ['baja', 'media', 'alta'];
  const statuses = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

  // Mapeo de áreas a departamentos (usar useMemo para evitar recrear objetos)
  const areaToDepMap = useMemo(() => ({
    'Jurídica': 'juridica',
    'Obras': 'obras',
    'Tesorería': 'tesoreria',
    'Administración': 'administracion',
    'Recursos Humanos': 'rrhh'
  }), []);

  const depToAreaMap = useMemo(() => ({
    'juridica': 'Jurídica',
    'obras': 'Obras',
    'tesoreria': 'Tesorería',
    'administracion': 'Administración',
    'rrhh': 'Recursos Humanos'
  }), []);

  // Filtrar usuarios según búsqueda
  const filteredPeople = useMemo(() => {
    if (!assigneeSearchQuery.trim()) return peopleNames;
    const query = assigneeSearchQuery.toLowerCase();
    return peopleNames.filter(person => 
      person.toLowerCase().includes(query) || 
      person.split('@')[0].toLowerCase().includes(query)
    );
  }, [peopleNames, assigneeSearchQuery]);

  useEffect(() => {
    navigation.setOptions({ 
      title: editingTask ? 'Editar tarea' : 'Crear tarea',
      headerRight: () => editingTask ? (
        <TouchableOpacity 
          onPress={() => setShowPomodoroModal(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="timer" size={24} color={theme.primary} />
        </TouchableOpacity>
      ) : null
    });
  }, [editingTask, theme, navigation]);

  useEffect(() => {
    loadUserNames();
    checkPermissions();
    
    // Animar entrada del formulario
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUserNames = async () => {
    const names = await getAllUsersNames();
    setPeopleNames(names);
  };

  const checkPermissions = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session);
      const userRole = result.session.role;
      
      // Admin y jefe pueden editar todo
      // Operativo solo puede cambiar el status de tareas asignadas a él
      if (userRole === 'admin' || userRole === 'jefe') {
        setCanEdit(true);
      } else if (userRole === 'operativo' && editingTask && editingTask.assignedTo === result.session.email) {
        setCanEdit(false); // Solo puede cambiar status, no editar completo
      } else {
        setCanEdit(false);
      }
    }
  };

  const onChangeDate = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        // En Android, mostrar el time picker después de seleccionar la fecha
        setTimeout(() => setShowTimePicker(true), 100);
      } else {
        // En iOS, actualizar directamente
        const newDate = new Date(dueAt);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDueAt(newDate);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  }, [dueAt]);

  const onChangeTime = useCallback((event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      // Combinar fecha de tempDate con la hora seleccionada
      const finalDate = new Date(tempDate);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setDueAt(finalDate);
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  }, [tempDate]);

  const save = async () => {
    if (isSaving) return; // Prevenir doble clic
    
    // Validaciones de campos
    if (!title.trim()) {
      titleInputRef.current?.shake();
      setToastMessage('El título es obligatorio');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (title.trim().length < 3) {
      titleInputRef.current?.shake();
      setToastMessage('El título debe tener al menos 3 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (title.trim().length > 100) {
      titleInputRef.current?.shake();
      setToastMessage('El título no puede tener más de 100 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!description.trim()) {
      descriptionInputRef.current?.shake();
      setToastMessage('La descripción es obligatoria');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (description.trim().length < 10) {
      descriptionInputRef.current?.shake();
      setToastMessage('La descripción debe tener al menos 10 caracteres');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    if (!assignedTo) {
      setToastMessage('Debes asignar la tarea a alguien');
      setToastType('error');
      setToastVisible(true);
      return;
    }

    // Validar que la fecha no sea demasiado en el pasado
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hora atrás
    if (!editingTask && dueAt.getTime() < oneHourAgo) {
      Alert.alert(
        'Fecha en el pasado',
        '¿Estás seguro de crear una tarea con fecha vencida?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => proceedWithSave() }
        ]
      );
      return;
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    
    // Simular progreso
    const progressInterval = setInterval(() => {
      setSaveProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);
    
    try {
      // Validar permisos
      if (!currentUser) {
        Alert.alert('Error', 'No estás autenticado');
        setIsSaving(false);
        return;
      }

      // Operativos solo pueden actualizar status
      if (currentUser.role === 'operativo' && !canEdit && editingTask) {
        // Solo permitir cambio de status
        if (editingTask.assignedTo !== currentUser.email) {
          Alert.alert('Sin permisos', 'No puedes modificar esta tarea');
          setIsSaving(false);
          return;
        }
        // Actualizar solo el status
        await updateTask(editingTask.id, { status });
        setIsSaving(false);
        navigation.goBack();
        return;
      }

      // Admin y jefe pueden crear/editar tareas completas
      if (currentUser.role !== 'admin' && currentUser.role !== 'jefe') {
        Alert.alert('Sin permisos', 'Solo administradores y jefes pueden crear/editar tareas');
        setIsSaving(false);
        return;
      }

      // Jefes solo pueden crear/editar tareas de su área
      if (currentUser.role === 'jefe') {
        const taskDepartment = areaToDepMap[area] || area.toLowerCase();
        if (taskDepartment !== currentUser.department) {
          Alert.alert('Sin permisos', 'Solo puedes crear/editar tareas de tu área');
          setIsSaving(false);
          return;
        }
      }

      // Animación de presión
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Construir objeto tarea
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim().toLowerCase(), // ✅ Normalizar email a minúsculas
        area,
        priority,
        status,
        dueAt: dueAt.getTime(),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null,
        lastRecurrenceCreated: isRecurring ? dueAt.getTime() : null,
        tags,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null
      };

      let taskId;
      
      if (editingTask) {
        // Actualizar tarea existente
        taskId = editingTask.id;
        
        // Cancelar notificación previa solo si existe
        if (editingTask.notificationId) {
          await cancelNotification(editingTask.notificationId);
        }
        
        setSaveProgress(60);
        await updateTask(taskId, taskData);
        setSaveProgress(100);
        
        // Mostrar toast de éxito
        setToastMessage('Tarea actualizada exitosamente');
        setToastType('success');
        setToastVisible(true);
        
        // Navegar después de un breve delay
        setTimeout(() => {
          setSaveProgress(null);
          navigation.goBack();
        }, 1000);
      } else {
        // Crear nueva tarea
        setSaveProgress(60);
        taskId = await createTask(taskData);
        setSaveProgress(100);
        
        // Mostrar toast de éxito
        setToastMessage('Tarea creada exitosamente');
        setToastType('success');
        setToastVisible(true);
        
        // Navegar después de un breve delay
        setTimeout(() => {
          setSaveProgress(null);
          navigation.goBack();
        }, 1000);
      }

      // Crear objeto task completo con ID para notificaciones
      const task = { ...taskData, id: taskId };

      // Programar notificaciones solo si la tarea no está cerrada (async, no bloquea)
      if (task.status !== 'cerrada') {
        scheduleNotificationForTask(task, { minutesBefore: 10 }).then(notifId => {
          if (notifId) {
            updateTask(taskId, { notificationId: notifId });
          }
        });
      }

      // Notificar asignación si es tarea nueva o cambió el responsable (async)
      const isNewTask = !editingTask;
      const assignedToChanged = editingTask && editingTask.assignedTo !== task.assignedTo;
      if ((isNewTask || assignedToChanged) && task.assignedTo) {
        notifyAssignment(task);
      }
      
      setIsSaving(false);
      setSaveProgress(null);
    } catch (e) {
      clearInterval(progressInterval);
      setIsSaving(false);
      setSaveProgress(null);
      
      // Mostrar toast de error
      setToastMessage(`Error al guardar: ${e.message || 'Error desconocido'}`);
      setToastType('error');
      setToastVisible(true);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Tarea',
      '¿Estás seguro que deseas eliminar esta tarea? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await deleteTask(editingTask.id);
              setToastMessage('Tarea eliminada correctamente');
              setToastType('success');
              setToastVisible(true);
              setTimeout(() => navigation.goBack(), 1000);
            } catch (error) {
              setToastMessage('Error al eliminar la tarea');
              setToastType('error');
              setToastVisible(true);
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Memoizar handlers para evitar recrearlos en cada render
  const handleAssignedToChange = useCallback((name) => {
    if (canEdit) setAssignedTo(name);
  }, [canEdit]);

  const handleAreaChange = useCallback((a) => {
    const areaDep = areaToDepMap[a] || a.toLowerCase();
    const canSelectArea = canEdit && (currentUser?.role === 'admin' || areaDep === currentUser?.department);
    if (canSelectArea) setArea(a);
  }, [canEdit, currentUser, areaToDepMap]);

  const handlePriorityChange = useCallback((p) => {
    if (canEdit) setPriority(p);
  }, [canEdit]);

  const handleStatusChange = useCallback((s) => {
    setStatus(s);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { backgroundColor: '#9F2241' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons 
            name={editingTask ? 'pencil' : 'sparkles'} 
            size={20} 
            color="#FFFFFF" 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.headerTitle}>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</Text>
        </View>
        {editingTask && currentUser?.role === 'admin' && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!editingTask && <View style={{ width: 40 }} />}
      </View>
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN BÁSICA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <Ionicons name="document-text" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Información Básica</Text>
            </View>
            
            <Text style={styles.label}>TÍTULO *</Text>
            <ShakeInput
              ref={titleInputRef}
              value={title} 
              onChangeText={setTitle} 
              placeholder="¿Qué hay que hacer?" 
              placeholderTextColor="#C7C7CC" 
              style={styles.input}
              editable={canEdit}
              error={!title.trim() && title.length > 0}
            />

            <Text style={styles.label}>DESCRIPCIÓN *</Text>
            <ShakeInput
              ref={descriptionInputRef}
              value={description} 
              onChangeText={setDescription} 
              placeholder="Detalles de la tarea..." 
              placeholderTextColor="#C7C7CC" 
              style={[styles.input, {height:80}]} 
              multiline
              editable={canEdit}
              error={!description.trim() && description.length > 0}
            />
          </View>

          {/* SECCIÓN ASIGNACIÓN */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <Ionicons name="people" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Asignación y Área</Text>
            </View>
            
            {/* Selector de Asignado */}
            <Text style={[styles.label, { marginTop: 16, marginBottom: 12 }]}>ASIGNADO A *</Text>
            <TouchableOpacity
              onPress={() => setShowAssigneeModal(true)}
              style={[styles.assigneeSelector, { backgroundColor: theme.background, borderColor: theme.border }]}
              disabled={!canEdit}
            >
              <View style={styles.assigneeSelectorContent}>
                <View style={styles.assigneeSelectorAvatar}>
                  <Text style={styles.assigneeSelectorInitial}>
                    {assignedTo ? assignedTo.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assigneeSelectorLabel, { color: theme.textSecondary }]}>
                    Persona asignada
                  </Text>
                  <Text style={[styles.assigneeSelectorValue, { color: theme.text }]} numberOfLines={1}>
                    {assignedTo || 'Seleccionar usuario'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Selector de Área */}
            <Text style={[styles.label, { marginTop: 24, marginBottom: 12 }]}>ÁREA *</Text>
            <View style={styles.areaGrid}>
              {areas.map(a => {
                const areaDep = areaToDepMap[a] || a.toLowerCase();
                const canSelectArea = canEdit && (currentUser?.role === 'admin' || areaDep === currentUser?.department);
                const areaColors = {
                  'Jurídica': '#8B5CF6',
                  'Obras': '#F59E0B',
                  'Tesorería': '#10B981',
                  'Administración': '#3B82F6',
                  'Recursos Humanos': '#EC4899'
                };
                const areaIcons = {
                  'Jurídica': 'scale',
                  'Obras': 'construct',
                  'Tesorería': 'calculator',
                  'Administración': 'briefcase',
                  'Recursos Humanos': 'people'
                };
                const color = areaColors[a] || '#9F2241';
                const icon = areaIcons[a] || 'folder';
                
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => handleAreaChange(a)}
                    style={[
                      styles.areaCard, 
                      area === a && [styles.areaCardActive, { borderColor: color, backgroundColor: `${color}15` }],
                      !canSelectArea && styles.optionBtnDisabled
                    ]}
                    disabled={!canSelectArea}
                  >
                    <View style={[styles.areaIconBg, { backgroundColor: `${color}25` }]}>
                      <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <Text style={[styles.areaName, area === a && { color: color, fontWeight: '700' }]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Modal de Selección de Usuario */}
          <Modal
            visible={showAssigneeModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAssigneeModal(false)}
          >
            <View style={[styles.modalContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Seleccionar usuario</Text>
                  <TouchableOpacity onPress={() => setShowAssigneeModal(false)}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Search Box */}
                <View style={[styles.searchBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Ionicons name="search" size={18} color={theme.textSecondary} />
                  <TextInput
                    placeholder="Buscar por email o nombre..."
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.searchInput, { color: theme.text }]}
                    value={assigneeSearchQuery}
                    onChangeText={setAssigneeSearchQuery}
                    autoFocus
                  />
                  {assigneeSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setAssigneeSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* User List */}
                <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <TouchableOpacity
                        key={person}
                        onPress={() => {
                          handleAssignedToChange(person);
                          setShowAssigneeModal(false);
                          setAssigneeSearchQuery('');
                        }}
                        style={[
                          styles.userListItem,
                          assignedTo === person && [
                            styles.userListItemActive,
                            { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }
                          ],
                          { borderBottomColor: theme.border }
                        ]}
                      >
                        <View style={[styles.userAvatar, assignedTo === person && { backgroundColor: theme.primary }]}>
                          <Text style={[styles.userAvatarText, assignedTo === person && { color: '#FFFFFF' }]}>
                            {person.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userName, { color: theme.text }]}>
                            {person.split('@')[0]}
                          </Text>
                          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                            {person}
                          </Text>
                        </View>
                        {assignedTo === person && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="search" size={40} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                        No se encontraron usuarios
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* SECCIÓN PRIORIDAD Y FECHA */}
          <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeaderSimple}>
              <Ionicons name="flag" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Prioridad y Fecha</Text>
            </View>
            
            <Text style={styles.label}>PRIORIDAD *</Text>
            <View style={styles.pickerRow}>
              {priorities.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => handlePriorityChange(p)}
                  style={[styles.optionBtn, priority === p && styles.optionBtnActive, !canEdit && styles.optionBtnDisabled]}
                  disabled={!canEdit}
                >
                  <Text style={[styles.optionText, priority === p && styles.optionTextActive]} numberOfLines={1}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>FECHA COMPROMISO *</Text>
            <TouchableOpacity 
              style={[styles.datePickerButton, { borderColor: theme.primary, backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}10` }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.datePickerContent}>
                <View style={[styles.datePickerIcon, { backgroundColor: theme.primary }]}>
                  <Ionicons name="calendar" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.datePickerInfo}>
                  <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>
                    Fecha y hora
                  </Text>
                  <Text style={[styles.datePickerValue, { color: theme.text }]}>
                    {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <View style={styles.datePickerTime}>
                    <Ionicons name="time" size={14} color={theme.primary} />
                    <Text style={[styles.datePickerTimeText, { color: theme.textSecondary }]}>
                      {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* SECCIÓN ESTADO (solo al editar) */}
          {editingTask && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Estado</Text>
              </View>
              
              <Text style={styles.label}>ESTADO</Text>
              <View style={styles.pickerRow}>
                {statuses.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    style={[styles.optionBtn, status === s && styles.optionBtnActive]}
                  >
                    <Text style={[styles.optionText, status === s && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">
                      {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* BOTÓN OPCIONES AVANZADAS */}
          <TouchableOpacity 
            style={[styles.advancedToggle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <View style={styles.advancedToggleContent}>
              <Ionicons 
                name={showAdvancedOptions ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={theme.primary} 
              />
              <Text style={[styles.advancedToggleText, { color: theme.text }]}>
                {showAdvancedOptions ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
              </Text>
              {!showAdvancedOptions && (tags.length > 0 || estimatedHours || isRecurring) && (
                <View style={[styles.advancedBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.advancedBadgeText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.advancedToggleHint, { color: theme.textSecondary }]}>
              Etiquetas, tiempo estimado y recurrencia
            </Text>
          </TouchableOpacity>

          {/* OPCIONES AVANZADAS */}
          {showAdvancedOptions && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.sectionHeaderSimple}>
                <Ionicons name="settings" size={20} color={theme.primary} />
                <Text style={[styles.sectionTitleSimple, { color: theme.text }]}>Opciones Avanzadas</Text>
              </View>
              
              <Text style={styles.label}>TIEMPO ESTIMADO (HORAS)</Text>
              <TextInput
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                placeholder="Ej: 2.5"
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text }]}
                editable={canEdit}
              />

              <Text style={styles.label}>ETIQUETAS</Text>
              <TagInput
                tags={tags}
                onTagsChange={setTags}
                placeholder="Agregar etiquetas..."
                maxTags={10}
              />

              {/* Sección de Recurrencia */}
              <View style={[styles.formSection, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginTop: 16 }]}>
                <TouchableOpacity 
                  onPress={() => setIsRecurring(!isRecurring)}
                  disabled={!canEdit}
                  style={[styles.recurrenceHeader, { backgroundColor: isRecurring ? theme.primary + '10' : 'transparent' }]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons name="repeat" size={22} color={isRecurring ? theme.primary : theme.textSecondary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarea Recurrente</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                        {isRecurring 
                          ? recurrencePattern === 'daily' ? 'Se repite cada día' 
                            : recurrencePattern === 'weekly' ? 'Se repite cada semana'
                            : 'Se repite cada mes'
                          : 'Activar para repetir automáticamente'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.toggleSwitch, 
                    { backgroundColor: isRecurring ? theme.primary : theme.border }
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      isRecurring && styles.toggleThumbActive,
                      { backgroundColor: '#FFFFFF' }
                    ]} />
                  </View>
                </TouchableOpacity>
                
                {isRecurring && (
                  <View style={styles.recurrenceOptions}>
                    <Text style={[styles.recurrenceLabel, { color: theme.textSecondary }]}>Frecuencia:</Text>
                    {['daily', 'weekly', 'monthly'].map((pattern) => (
                      <TouchableOpacity
                        key={pattern}
                        onPress={() => setRecurrencePattern(pattern)}
                        style={[
                          styles.recurrenceOption,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          recurrencePattern === pattern && { 
                            borderColor: theme.primary, 
                            backgroundColor: theme.primary + '15',
                            borderWidth: 2
                          }
                        ]}
                        disabled={!canEdit}
                      >
                        <Ionicons 
                          name={pattern === 'daily' ? 'today' : pattern === 'weekly' ? 'calendar' : 'calendar-number'} 
                          size={24} 
                          color={recurrencePattern === pattern ? theme.primary : theme.textSecondary} 
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.recurrenceOptionText,
                            { color: recurrencePattern === pattern ? theme.primary : theme.text }
                          ]}>
                            {pattern === 'daily' ? 'Diaria' : pattern === 'weekly' ? 'Semanal' : 'Mensual'}
                          </Text>
                          <Text style={[
                            styles.recurrenceOptionDesc,
                            { color: theme.textSecondary }
                          ]}>
                            {pattern === 'daily' ? 'Se repite cada día' 
                              : pattern === 'weekly' ? 'Se repite cada 7 días'
                              : 'Se repite cada mes'}
                          </Text>
                        </View>
                        {recurrencePattern === pattern && (
                          <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          
          {Platform.OS !== 'web' && (
            <>
              {showDatePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()}
                />
              )}
              
              {showTimePicker && DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="default"
                  onChange={onChangeTime}
                  is24Hour={true}
                />
              )}
            </>
          )}

          {/* Modal de fecha y hora personalizado para web */}
          {Platform.OS === 'web' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.dateModalOverlay}>
                <View style={[styles.dateModalContent, { backgroundColor: theme.card }]}>
                  {/* Header */}
                  <View style={[styles.dateModalHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.dateModalTitle, { color: theme.text }]}>
                      Seleccionar fecha y hora
                    </Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Body */}
                  <View style={styles.dateModalBody}>
                    {/* Selector de Fecha */}
                    <View style={styles.datePickerSection}>
                      <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>
                        📅 Fecha
                      </Text>
                      <input
                        type="date"
                        value={tempDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          const [year, month, day] = e.target.value.split('-');
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                          setTempDate(newDate);
                        }}
                        style={{
                          width: '100%',
                          padding: '14px 12px',
                          fontSize: '15px',
                          borderRadius: '10px',
                          border: `2px solid ${theme.primary}`,
                          backgroundColor: theme.background,
                          color: theme.text,
                          fontFamily: 'system-ui',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      />
                      <Text style={[styles.datePreviewText, { color: theme.textSecondary, marginTop: 8 }]}>
                        {tempDate.toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>

                    {/* Selector de Hora */}
                    <View style={styles.datePickerSection}>
                      <Text style={[styles.datePickerSectionTitle, { color: theme.text }]}>
                        ⏰ Hora
                      </Text>
                      <View style={styles.timeInputContainer}>
                        <input
                          type="time"
                          value={`${String(tempDate.getHours()).padStart(2, '0')}:${String(tempDate.getMinutes()).padStart(2, '0')}`}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(tempDate);
                            newDate.setHours(parseInt(hours), parseInt(minutes), 0);
                            setTempDate(newDate);
                          }}
                          style={{
                            flex: 1,
                            padding: '14px 12px',
                            fontSize: '15px',
                            borderRadius: '10px',
                            border: `2px solid ${theme.primary}`,
                            backgroundColor: theme.background,
                            color: theme.text,
                            fontFamily: 'system-ui',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        />
                      </View>
                      <Text style={[styles.datePreviewText, { color: theme.textSecondary, marginTop: 8 }]}>
                        {tempDate.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>

                    {/* Vista previa */}
                    <View style={[styles.datePreviewCard, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
                      <Ionicons name="calendar" size={20} color={theme.primary} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.datePreviewCardDate, { color: theme.textSecondary }]}>
                          Fecha y hora seleccionada
                        </Text>
                        <Text style={[styles.datePreviewCardValue, { color: theme.text }]}>
                          {tempDate.toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })} a las {tempDate.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={[styles.dateModalFooter, { borderTopColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: `${theme.textSecondary}20` }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[styles.dateModalButtonText, { color: theme.textSecondary }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateModalButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setDueAt(tempDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Ionicons name="checkmark" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.dateModalButtonText, { color: '#FFFFFF' }]}>
                        Confirmar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          <PressableButton 
            onPress={save}
            disabled={isSaving}
            scaleValue={0.95}
            haptic={true}
          >
            <View style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              <Animated.View style={{ transform: [{ scale: buttonScale }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isSaving && <ActivityIndicator color="#FFFFFF" size="small" />}
                {!isSaving && <Ionicons name={editingTask ? "checkmark-circle" : "add-circle"} size={20} color="#FFFFFF" />}
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Guardando...' : (editingTask ? 'Guardar Cambios' : 'Crear Tarea')}
                </Text>
              </Animated.View>
            </View>
          </PressableButton>

          {editingTask && (
            <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title })}>
              <Text style={styles.chatButtonText}>Abrir Chat</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
      
      <Toast 
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
      
      {/* Pomodoro Modal */}
      {editingTask && (
        <Modal
          visible={showPomodoroModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPomodoroModal(false)}
        >
          <View style={[styles.pomodoroModal, { backgroundColor: theme.background }]}>
            <View style={styles.pomodoroHeader}>
              <Text style={[styles.pomodoroTitle, { color: theme.text }]}>Sesión de Trabajo</Text>
              <TouchableOpacity onPress={() => setShowPomodoroModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pomodoroContent}>
              <PomodoroTimer
                taskId={editingTask.id}
                taskTitle={title}
                onSessionComplete={async (session) => {
                  try {
                    const user = await getCurrentSession();
                    if (user.success) {
                      await savePomodoroSession({ 
                        ...session, 
                        userEmail: user.session.email 
                      });
                      setToastMessage('Sesión Pomodoro completada!');
                      setToastType('success');
                      setToastVisible(true);
                    }
                  } catch (error) {
                    setToastMessage('Error al guardar sesión');
                    setToastType('error');
                    setToastVisible(true);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      
      {saveProgress !== null && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{
            backgroundColor: '#FFF',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            gap: 12
          }}>
            <LoadingIndicator type="spinner" color="#9F2241" size={12} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
              {saveProgress === 100 ? '¡Completado!' : 'Guardando tarea...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  scrollContent: {
    padding: 16
  },
  label: { 
    marginTop: 14, 
    marginBottom: 6,
    color: isDark ? '#AAA' : '#1A1A1A', 
    fontWeight: '800', 
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    padding: 12, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF', 
    borderRadius: 12,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#F5DEB3',
    minHeight: 48
  },
  dateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  dateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14
  },
  dateIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  dateTextContainer: {
    flex: 1
  },
  dateLabelSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  dateText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2
  },
  timeText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600'
  },
  pickerRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 10, 
    marginBottom: 8,
    gap: 10
  },
  optionBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0', 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    maxWidth: '48%',
    flexShrink: 1
  },
  optionBtnActive: { 
    backgroundColor: '#9F2241',
    borderColor: '#9F2241',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1.02 }]
  },
  optionBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#E5E5EA'
  },
  optionText: { 
    fontSize: 15, 
    color: theme.text, 
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
    flexShrink: 1
  },
  optionTextActive: { 
    color: '#FFFFFF', 
    fontWeight: '800'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  recurrenceOptions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recurrenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recurrenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  recurrenceOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurrenceOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#9F2241',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  chatButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: isDark ? '#000' : '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3'
  },
  chatButtonText: {
    color: '#9F2241',
    fontSize: 17,
    fontWeight: '600'
  },
  webDateInputContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  webDateInput: {
    fontSize: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9F2241',
    color: '#1A1A1A',
    fontWeight: '600',
  },
  // Nuevos estilos para secciones
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitleSimple: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  advancedToggle: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  advancedToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  advancedToggleHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 34,
    fontStyle: 'italic',
  },
  advancedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pomodoroModal: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16
  },
  pomodoroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  pomodoroTitle: {
    fontSize: 24,
    fontWeight: '800'
  },
  pomodoroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Nuevos estilos para Asignación y Área
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  areaCard: {
    flex: 1,
    minWidth: '45%',
    flexBasis: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(159, 34, 65, 0.05)',
    borderWidth: 2.5,
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(159, 34, 65, 0.15)',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    transition: 'all 0.2s ease',
  },
  areaCardActive: {
    borderWidth: 2.5,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  areaIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  userListItemActive: {
    borderWidth: 1.5,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9F2241',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  assigneeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  assigneeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assigneeSelectorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(159, 34, 65, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(159, 34, 65, 0.4)',
  },
  assigneeSelectorInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9F2241',
  },
  assigneeSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assigneeSelectorValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  // Estilos para el botón de fecha
  datePickerButton: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    justifyContent: 'center',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerInfo: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  datePickerTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Estilos del modal de fecha
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  dateModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  datePickerSection: {
    gap: 10,
  },
  datePickerSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  datePreviewText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  datePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  datePreviewCardDate: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePreviewCardValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  dateModalButton: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
