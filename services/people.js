// services/people.js
// Servicio para gestionar personas del equipo
import AsyncStorage from '@react-native-async-storage/async-storage';

const PEOPLE_KEY = '@todo_people_v1';

// Cargar lista de personas
export async function loadPeople() {
  try {
    const data = await AsyncStorage.getItem(PEOPLE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Lista inicial por defecto
    const defaultPeople = [
      { id: '1', name: 'Juan Pérez', email: 'juan@empresa.com', role: 'ADMIN', createdAt: Date.now() },
      { id: '2', name: 'María García', email: 'maria@empresa.com', role: 'MEMBER', createdAt: Date.now() }
    ];
    await savePeople(defaultPeople);
    return defaultPeople;
  } catch (error) {
    console.error('Error cargando personas:', error);
    return [];
  }
}

// Guardar lista de personas
export async function savePeople(people) {
  try {
    await AsyncStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  } catch (error) {
    console.error('Error guardando personas:', error);
  }
}

// Obtener nombres de personas para lista de selección
export async function getPeopleNames() {
  const people = await loadPeople();
  return people.map(p => p.name).sort();
}

// Agregar una persona
export async function addPerson(person) {
  const people = await loadPeople();
  const newPerson = {
    id: String(Date.now()),
    ...person,
    createdAt: Date.now()
  };
  people.push(newPerson);
  await savePeople(people);
  return newPerson;
}

// Eliminar una persona
export async function deletePerson(personId) {
  const people = await loadPeople();
  const filtered = people.filter(p => p.id !== personId);
  await savePeople(filtered);
}

// Actualizar una persona
export async function updatePerson(personId, updates) {
  const people = await loadPeople();
  const index = people.findIndex(p => p.id === personId);
  if (index >= 0) {
    people[index] = { ...people[index], ...updates };
    await savePeople(people);
    return people[index];
  }
  return null;
}
