// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, Alert, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTask, updateTask, deleteTask } from '../services/tasks';
import { getAllUsersNames } from '../services/roles';
import { scheduleNotificationForTask, cancelNotification, notifyAssignment } from '../services/notifications';
import { getCurrentSession } from '../services/authFirestore';
import Toast from '../components/Toast';
import ShakeInput from '../components/ShakeInput';
import LoadingIndicator from '../components/LoadingIndicator';
import PressableButton from '../components/PressableButton';

// Importar DateTimePicker solo en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function TaskDetailScreen({ route, navigation }) {
  // Si route.params.task está presente, estamos editando; si no, creamos nueva
  const editingTask = route.params?.task || null;

  const [title, setTitle] = useState(editingTask ? editingTask.title : '');
  const [description, setDescription] = useState(editingTask ? editingTask.description : '');
  const [assignedTo, setAssignedTo] = useState(editingTask ? editingTask.assignedTo : '');
  const [area, setArea] = useState(editingTask ? editingTask.area : 'Jurídica');
  const [priority, setPriority] = useState(editingTask ? editingTask.priority : 'media');
  const [status, setStatus] = useState(editingTask ? editingTask.status : 'pendiente');
  const [dueAt, setDueAt] = useState(editingTask ? new Date(editingTask.dueAt) : new Date(Date.now() + 3600 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dueAt);
  const [peopleNames, setPeopleNames] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [saveProgress, setSaveProgress] = useState(null);
  
  // Refs para inputs
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  
  // Animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const saveSuccessAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const areas = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
  const priorities = ['baja', 'media', 'alta'];
  const statuses = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

  // Mapeo de áreas a departamentos
  const areaToDepMap = {
    'Jurídica': 'juridica',
    'Obras': 'obras',
    'Tesorería': 'tesoreria',
    'Administración': 'administracion',
    'Recursos Humanos': 'rrhh'
  };

  const depToAreaMap = {
    'juridica': 'Jurídica',
    'obras': 'Obras',
    'tesoreria': 'Tesorería',
    'administracion': 'Administración',
    'rrhh': 'Recursos Humanos'
  };

  useEffect(() => {
    navigation.setOptions({ title: editingTask ? 'Editar tarea' : 'Crear tarea' });
    loadUserNames();
    checkPermissions();
    
    // Animar entrada del formulario
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [editingTask, fadeAnim]);

  const loadUserNames = useCallback(async () => {
    const names = await getAllUsersNames();
    setPeopleNames(names);
  }, []);

  const checkPermissions = useCallback(async () => {
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
  }, [editingTask]);

  const onChangeDate = (event, selectedDate) => {
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
  };

  const onChangeTime = (event, selectedTime) => {
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
  };

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
        dueAt: dueAt.getTime()
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
      console.error('Error guardando tarea:', e);
      
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
              console.error('Error al eliminar tarea:', error);
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>TÍTULO</Text>
          <ShakeInput
            ref={titleInputRef}
            value={title} 
            onChangeText={setTitle} 
            placeholder="Título corto" 
            placeholderTextColor="#C7C7CC" 
            style={styles.input}
            editable={canEdit}
            error={!title.trim() && title.length > 0}
          />

          <Text style={styles.label}>DESCRIPCIÓN</Text>
          <ShakeInput
            ref={descriptionInputRef}
            value={description} 
            onChangeText={setDescription} 
            placeholder="Descripción" 
            placeholderTextColor="#C7C7CC" 
            style={[styles.input, {height:80}]} 
            multiline
            editable={canEdit}
            error={!description.trim() && description.length > 0}
          />

          <Text style={styles.label}>ASIGNADO A</Text>
          <View style={styles.pickerRow}>
            {peopleNames.map(name => (
              <TouchableOpacity
                key={name}
                onPress={() => canEdit && setAssignedTo(name)}
                style={[styles.optionBtn, assignedTo === name && styles.optionBtnActive, !canEdit && styles.optionBtnDisabled]}
                disabled={!canEdit}
              >
                <Text style={[styles.optionText, assignedTo === name && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>ÁREA</Text>
          <View style={styles.pickerRow}>
            {areas.map(a => {
              // Jefes solo pueden seleccionar su propia área
              const areaDep = areaToDepMap[a] || a.toLowerCase();
              const canSelectArea = canEdit && (currentUser?.role === 'admin' || areaDep === currentUser?.department);
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => canSelectArea && setArea(a)}
                  style={[
                    styles.optionBtn, 
                    area === a && styles.optionBtnActive, 
                    !canSelectArea && styles.optionBtnDisabled
                  ]}
                  disabled={!canSelectArea}
                >
                  <Text style={[styles.optionText, area === a && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">{a}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>PRIORIDAD</Text>
          <View style={styles.pickerRow}>
            {priorities.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => canEdit && setPriority(p)}
                style={[styles.optionBtn, priority === p && styles.optionBtnActive, !canEdit && styles.optionBtnDisabled]}
                disabled={!canEdit}
              >
                <Text style={[styles.optionText, priority === p && styles.optionTextActive]} numberOfLines={1}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>ESTADO</Text>
          <View style={styles.pickerRow}>
            {statuses.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.optionBtn, status === s && styles.optionBtnActive]}
              >
                <Text style={[styles.optionText, status === s && styles.optionTextActive]} numberOfLines={1} ellipsizeMode="tail">
                  {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>FECHA COMPROMISO</Text>
          
          {Platform.OS === 'web' ? (
            <View style={styles.webDateContainer}>
              <input
                type="datetime-local"
                value={dueAt.toISOString().slice(0, 16)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate.getTime())) {
                    setDueAt(newDate);
                  }
                }}
                style={{
                  width: '100%',
                  padding: 15,
                  fontSize: 16,
                  borderRadius: 12,
                  border: '2px solid #9F2241',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontFamily: 'system-ui'
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
                <Ionicons name="calendar" size={16} color="#9F2241" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: '#666' }}>
                  {dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {' a las '}
                  {dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <View style={[styles.dateButtonGradient, { backgroundColor: '#9F2241' }]}>
                  <View style={styles.dateIconContainer}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateLabelSmall}>Fecha seleccionada</Text>
                    <Text style={styles.dateText}>{dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    <Text style={styles.timeText}>{dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </TouchableOpacity>
            </>
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
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
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  scrollContent: {
    padding: 24
  },
  label: { 
    marginTop: 20, 
    marginBottom: 8,
    color: '#1A1A1A', 
    fontWeight: '800', 
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 14,
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#F5DEB3',
    minHeight: 52
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
    padding: 18,
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
    backgroundColor: '#FFFAF0', 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5DEB3',
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
    color: '#1A1A1A', 
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
    flexShrink: 1
  },
  optionTextActive: { 
    color: '#FFFFFF', 
    fontWeight: '800'
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
    backgroundColor: '#FFFAF0',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
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
  }
});
