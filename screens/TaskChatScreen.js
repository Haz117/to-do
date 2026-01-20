// screens/TaskChatScreen.js
// Chat simple por tarea usando Firestore. Colección: tasks/{taskId}/messages
// Requiere que configures firebase.js con tu proyecto.
// Funcionalidad mínima: lista de mensajes en tiempo real + enviar mensaje de texto.

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, getServerTimestamp } from '../firebase';
import { getCurrentSession } from '../services/authFirestore';
import { notifyNewComment } from '../services/fcm';

export default function TaskChatScreen({ route, navigation }) {
  const { taskId, taskTitle } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [taskData, setTaskData] = useState(null);
  const flatRef = useRef();

  // Cargar usuario actual y verificar acceso a la tarea
  useEffect(() => {
    loadCurrentUserAndCheckAccess();
  }, []);

  const loadCurrentUserAndCheckAccess = async () => {
    const result = await getCurrentSession();
    if (result.success) {
      setCurrentUser(result.session.displayName || result.session.email || 'Usuario');
      setCurrentUserId(result.session.userId);
      
      // Cargar datos de la tarea para verificar acceso
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (taskDoc.exists()) {
          const task = taskDoc.data();
          setTaskData(task);
          
          // Verificar acceso según rol
          const userRole = result.session.role;
          const userEmail = result.session.email;
          const userDepartment = result.session.department;
          
          if (userRole === 'admin') {
            setHasAccess(true);
          } else if (userRole === 'jefe' && task.area === userDepartment) {
            setHasAccess(true);
          } else if (userRole === 'operativo' && task.assignedTo === userEmail) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        }
      } catch (error) {
        console.error('Error cargando tarea:', error);
        setHasAccess(false);
      }
    } else {
      setCurrentUser('Usuario');
      setCurrentUserId(null);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    // Solo escuchar mensajes si tiene acceso
    if (!hasAccess) return;
    
    // Listener en tiempo real de la colección de mensajes de la tarea
    const q = query(collection(db, 'tasks', taskId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setMessages(arr);
    }, (err) => console.warn('Error listener chat', err));

    return () => unsub();
  }, [taskId, hasAccess]);

  const send = async () => {
    if (!text.trim() || !hasAccess) return;
    try {
      // 1. Enviar mensaje al chat
      await addDoc(collection(db, 'tasks', taskId, 'messages'), {
        text: text.trim(),
        author: currentUser || 'Usuario',
        createdAt: getServerTimestamp()
      });
      
      // 2. Actualizar lastMessageAt en la tarea para ordenar por actividad
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          lastMessageAt: getServerTimestamp(),
          lastMessageBy: currentUser || 'Usuario'
        });
      } catch (updateError) {
        console.warn('Error actualizando timestamp del mensaje:', updateError);
      }
      
      setText('');
      // scroll opcional
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    } catch (e) {
      console.warn('Error enviando mensaje', e);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ios:'padding', android:undefined})}>
      <View style={[styles.headerBar, { backgroundColor: '#9F2241' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{taskTitle || 'Chat'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!hasAccess ? (
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={80} color="#C7C7CC" />
          <Text style={styles.noAccessTitle}>Sin acceso</Text>
          <Text style={styles.noAccessText}>
            No tienes permisos para ver este chat
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.messagesContainer}
            renderItem={({ item }) => (
              <View style={styles.msgRow}>
                <Text style={styles.msgAuthor}>{item.author}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.msgTime}>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ''}</Text>
              </View>
            )}
          />

          <View style={styles.composer}>
            <TextInput
              placeholder="Mensaje..."
              placeholderTextColor="#C7C7CC"
              value={text}
              onChangeText={setText}
              style={styles.input}
            />
            <TouchableOpacity style={styles.sendButton} onPress={send}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5
  },
  messagesContainer: {
    padding: 20
  },
  msgRow: { 
    marginBottom: 16, 
    backgroundColor: '#FFFAF0', 
    padding: 16, 
    borderRadius: 20,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  msgAuthor: { 
    fontWeight: '700', 
    marginBottom: 6, 
    color: '#9F2241',
    fontSize: 14,
    letterSpacing: 0.2
  },
  msgText: { 
    color: '#1A1A1A',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400'
  },
  msgTime: { 
    marginTop: 8, 
    fontSize: 12, 
    color: '#AEAEB2',
    fontWeight: '500'
  },
  composer: { 
    flexDirection: 'row', 
    padding: 16, 
    alignItems: 'center', 
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E5EA',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8
  },
  input: { 
    flex: 1, 
    padding: 12, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 24,
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '400',
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9F2241',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  noAccessTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.8
  },
  noAccessText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500'
  }
});
