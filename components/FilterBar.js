// components/FilterBar.js
// Barra de filtros y búsqueda reutilizable. Permite filtrar por área, responsable, prioridad, vencidas y buscar por título.
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const FilterBar = memo(function FilterBar({ onFilterChange }) {
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const debounceTimer = useRef(null);

  const areas = ['Jurídica', 'Obras', 'Tesorería', 'Administración', 'Recursos Humanos'];
  const priorities = ['alta', 'media', 'baja'];

  const applyFilters = useCallback((updates = {}) => {
    const filters = {
      searchText: updates.searchText !== undefined ? updates.searchText : searchText,
      area: updates.area !== undefined ? updates.area : selectedArea,
      responsible: updates.responsible !== undefined ? updates.responsible : selectedResponsible,
      priority: updates.priority !== undefined ? updates.priority : selectedPriority,
      overdue: updates.overdue !== undefined ? updates.overdue : showOverdue
    };
    onFilterChange && onFilterChange(filters);
  }, [searchText, selectedArea, selectedResponsible, selectedPriority, showOverdue, onFilterChange]);

  const handleSearchChange = (text) => {
    setSearchText(text);
    
    // Limpiar el timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Aplicar filtro después de 300ms de inactividad
    debounceTimer.current = setTimeout(() => {
      applyFilters({ searchText: text });
    }, 300);
  };

  // Limpiar el timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const toggleArea = (area) => {
    const newArea = selectedArea === area ? '' : area;
    setSelectedArea(newArea);
    applyFilters({ area: newArea });
  };

  const togglePriority = (priority) => {
    const newPriority = selectedPriority === priority ? '' : priority;
    setSelectedPriority(newPriority);
    applyFilters({ priority: newPriority });
  };

  const toggleOverdue = () => {
    const newOverdue = !showOverdue;
    setShowOverdue(newOverdue);
    applyFilters({ overdue: newOverdue });
  };

  const clearAll = () => {
    setSearchText('');
    setSelectedArea('');
    setSelectedResponsible('');
    setSelectedPriority('');
    setShowOverdue(false);
    onFilterChange && onFilterChange({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  };

  return (
    <View style={styles.container}>
      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar por título..."
        value={searchText}
        onChangeText={handleSearchChange}
        style={styles.searchInput}
      />

      {/* Filtros por área */}
      <View style={styles.section}>
        <Text style={styles.label}>Área:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {areas.map(area => (
            <TouchableOpacity
              key={area}
              onPress={() => toggleArea(area)}
              style={[styles.chip, selectedArea === area && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedArea === area && styles.chipTextActive]}>{area}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtros por prioridad y vencidas */}
      <View style={styles.section}>
        <Text style={styles.label}>Prioridad:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {priorities.map(priority => (
            <TouchableOpacity
              key={priority}
              onPress={() => togglePriority(priority)}
              style={[styles.chip, selectedPriority === priority && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedPriority === priority && styles.chipTextActive]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={toggleOverdue}
            style={[styles.chip, showOverdue && styles.chipOverdue]}
          >
            <Text style={[styles.chipText, showOverdue && styles.chipTextActive]}>Vencidas</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Botón limpiar */}
      <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
        <Text style={styles.clearText}>Limpiar filtros</Text>
      </TouchableOpacity>
    </View>
  );
});

export default FilterBar;

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#FAFAFA', 
    padding: 20,
    paddingBottom: 16
  },
  searchInput: { 
    padding: 14, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 12, 
    marginBottom: 16,
    color: '#1A1A1A',
    fontSize: 16,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  section: { marginBottom: 16 },
  label: { 
    fontSize: 12, 
    color: '#6E6E73', 
    marginBottom: 10, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  chipRow: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#FFFAF0', 
    borderRadius: 20, 
    borderWidth: 1.5,
    borderColor: '#F5DEB3'
  },
  chipActive: { 
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  chipOverdue: { 
    backgroundColor: '#8B0000',
    borderColor: '#8B0000'
  },
  chipText: { 
    fontSize: 14, 
    color: '#1A1A1A', 
    fontWeight: '600',
    letterSpacing: 0.2
  },
  chipTextActive: { 
    color: '#fff', 
    fontWeight: '700'
  },
  clearBtn: { 
    marginTop: 8, 
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  clearText: { 
    color: '#8B0000', 
    fontSize: 15, 
    fontWeight: '600',
    letterSpacing: 0.1
  }
});
