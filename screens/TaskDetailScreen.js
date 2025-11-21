// screens/TaskDetailScreen.js
// Formulario para crear o editar una tarea. Incluye DateTimePicker y programación de notificación.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createTask, updateTask } from '../services/tasks';
import { getAllUsersNames } from '../services/roles';
import { scheduleNotificationForTask, cancelNotification, cancelNotifications, scheduleDailyReminders, notifyAssignment } from '../services/notifications';

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

  const areas = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
  const priorities = ['baja', 'media', 'alta'];
  const statuses = ['pendiente', 'en_proceso', 'en_revision', 'cerrada'];

  useEffect(() => {
    navigation.setOptions({ title: editingTask ? 'Editar tarea' : 'Crear tarea' });
    loadUserNames();
  }, [editingTask]);

  const loadUserNames = async () => {
    const names = await getAllUsersNames();
    setPeopleNames(names);
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setTempDate(selectedDate);
        // Después de seleccionar fecha, mostrar selector de hora
        setTimeout(() => setShowTimePicker(true), 100);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const onChangeTime = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) {
        // Combinar fecha de tempDate con la hora seleccionada
        const finalDate = new Date(tempDate);
        finalDate.setHours(selectedTime.getHours());
        finalDate.setMinutes(selectedTime.getMinutes());
        setDueAt(finalDate);
      }
    } else {
      if (selectedTime) {
        const finalDate = new Date(tempDate);
        finalDate.setHours(selectedTime.getHours());
        finalDate.setMinutes(selectedTime.getMinutes());
        setDueAt(finalDate);
      }
    }
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Validación', 'El título es obligatorio');
      return;
    }

    try {
      // Construir objeto tarea
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        area,
        priority,
        status,
        dueAt: dueAt.getTime()
      };

      let taskId;
      
      if (editingTask) {
        // Actualizar tarea existente
        taskId = editingTask.id;
        
        // Cancelar notificaciones previas
        if (editingTask.notificationId) await cancelNotification(editingTask.notificationId);
        if (editingTask.dailyReminderIds) await cancelNotifications(editingTask.dailyReminderIds);
        
        await updateTask(taskId, taskData);
      } else {
        // Crear nueva tarea
        taskId = await createTask(taskData);
      }

      // Programar notificaciones
      const task = { ...taskData, id: taskId };
      
      // Programar nueva notificación (10 min antes)
      const notifId = await scheduleNotificationForTask(task, { minutesBefore: 10 });
      if (notifId) {
        await updateTask(taskId, { notificationId: notifId });
      }

      // Programar recordatorios diarios (solo si no está cerrada)
      if (task.status !== 'cerrada') {
        const dailyIds = await scheduleDailyReminders(task);
        if (dailyIds.length > 0) {
          await updateTask(taskId, { dailyReminderIds: dailyIds });
        }
      }

      // Notificar asignación si es tarea nueva o cambió el responsable
      const isNewTask = !editingTask;
      const assignedToChanged = editingTask && editingTask.assignedTo !== task.assignedTo;
      if ((isNewTask || assignedToChanged) && task.assignedTo) {
        await notifyAssignment(task);
      }
      
      // Mostrar confirmación
      Alert.alert('Éxito', editingTask ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error guardando tarea:', e);
      Alert.alert('Error', `No se pudo guardar la tarea: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#8B0000', '#6B0000']} 
        style={styles.headerBar}
      >
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
        <View style={{ width: 40 }} />
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>TÍTULO</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Título corto" placeholderTextColor="#C7C7CC" style={styles.input} />

      <Text style={styles.label}>DESCRIPCIÓN</Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Descripción" placeholderTextColor="#C7C7CC" style={[styles.input, {height:80}]} multiline />

      <Text style={styles.label}>ASIGNADO A</Text>
      <View style={styles.pickerRow}>
        {peopleNames.map(name => (
          <TouchableOpacity
            key={name}
            onPress={() => setAssignedTo(name)}
            style={[styles.optionBtn, assignedTo === name && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, assignedTo === name && styles.optionTextActive]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>ÁREA</Text>
      <View style={styles.pickerRow}>
        {areas.map(a => (
          <TouchableOpacity
            key={a}
            onPress={() => setArea(a)}
            style={[styles.optionBtn, area === a && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, area === a && styles.optionTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>PRIORIDAD</Text>
      <View style={styles.pickerRow}>
        {priorities.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            style={[styles.optionBtn, priority === p && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, priority === p && styles.optionTextActive]}>
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
            <Text style={[styles.optionText, status === s && styles.optionTextActive]}>
              {s === 'en_proceso' ? 'En proceso' : s === 'en_revision' ? 'En revisión' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>FECHA COMPROMISO</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <LinearGradient
          colors={['#8B0000', '#6B0000']}
          style={styles.dateButtonGradient}
        >
          <View style={styles.dateIconContainer}>
            <Ionicons name="calendar" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabelSmall}>Fecha seleccionada</Text>
            <Text style={styles.dateText}>{dueAt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.timeText}>{dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
          minimumDate={new Date()}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={onChangeTime}
          is24Hour={true}
        />
      )}

      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>{editingTask ? 'Guardar Cambios' : 'Crear Tarea'}</Text>
      </TouchableOpacity>

      {editingTask && (
        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('TaskChat', { taskId: editingTask.id, taskTitle: editingTask.title })}>
          <Text style={styles.chatButtonText}>Abrir Chat</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
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
    shadowColor: '#8B0000',
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
    marginTop: 24, 
    marginBottom: 10,
    color: '#6E6E73', 
    fontWeight: '700', 
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: { 
    padding: 16, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 12,
    color: '#1A1A1A',
    fontSize: 17,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  dateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B0000',
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
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2
  },
  timeText: {
    fontSize: 16,
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
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  optionBtnActive: { 
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  optionText: { 
    fontSize: 15, 
    color: '#1A1A1A', 
    fontWeight: '600',
    letterSpacing: 0.2
  },
  optionTextActive: { 
    color: '#fff', 
    fontWeight: '700'
  },
  saveButton: {
    backgroundColor: '#8B0000',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 36,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
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
    color: '#8B0000',
    fontSize: 17,
    fontWeight: '600'
  }
});
