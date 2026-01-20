// components/FilterBar.js
// Barra de filtros y búsqueda reutilizable. Permite filtrar por área, responsable, prioridad, vencidas y buscar por título.
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const FilterBar = memo(function FilterBar({ onFilterChange }) {
  const { theme, isDark } = useTheme();
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
    <View style={[styles.container, { backgroundColor: isDark ? theme.surface : '#FAFAFA' }]}>
      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar por título..."
        placeholderTextColor={isDark ? '#999' : '#666'}
        value={searchText}
        onChangeText={handleSearchChange}
        style={[
          styles.searchInput,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFAF0',
            color: theme.text,
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#F5DEB3'
          }
        ]}
      />

      {/* Filtros por área */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: isDark ? '#AAA' : '#6E6E73' }]}>ÁREA:</Text>
        <View style={styles.chipRow}>
          {areas.map(area => (
            <TouchableOpacity
              key={area}
              onPress={() => toggleArea(area)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedArea === area
                    ? '#9F2241'
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : '#FFFAF0',
                  borderColor: selectedArea === area
                    ? '#9F2241'
                    : isDark
                    ? 'rgba(255,255,255,0.2)'
                    : '#F5DEB3'
                },
                selectedArea === area && styles.chipActive
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selectedArea === area ? '#FFF' : theme.text
                  },
                  selectedArea === area && styles.chipTextActive
                ]}
              >
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filtros por prioridad y vencidas */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: isDark ? '#AAA' : '#6E6E73' }]}>PRIORIDAD:</Text>
        <View style={styles.chipRow}>
          {priorities.map(priority => (
            <TouchableOpacity
              key={priority}
              onPress={() => togglePriority(priority)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedPriority === priority
                    ? '#9F2241'
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : '#FFFAF0',
                  borderColor: selectedPriority === priority
                    ? '#9F2241'
                    : isDark
                    ? 'rgba(255,255,255,0.2)'
                    : '#F5DEB3'
                },
                selectedPriority === priority && styles.chipActive
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selectedPriority === priority ? '#FFF' : theme.text
                  },
                  selectedPriority === priority && styles.chipTextActive
                ]}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={toggleOverdue}
            style={[
              styles.chip,
              {
                backgroundColor: showOverdue
                  ? '#9F2241'
                  : isDark
                  ? 'rgba(255,255,255,0.1)'
                  : '#FFFAF0',
                borderColor: showOverdue
                  ? '#9F2241'
                  : isDark
                  ? 'rgba(255,255,255,0.2)'
                  : '#F5DEB3'
              },
              showOverdue && styles.chipOverdue
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: showOverdue ? '#FFF' : theme.text
                },
                showOverdue && styles.chipTextActive
              ]}
            >
              Vencidas
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    paddingBottom: 16
  },
  searchInput: { 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 16,
    fontSize: 16,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1.5,
  },
  section: { marginBottom: 16 },
  label: { 
    fontSize: 12, 
    marginBottom: 10, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  chipRow: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8
  },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 18, 
    borderWidth: 1.5,
    marginBottom: 8,
    marginRight: 4
  },
  chipActive: { 
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  chipOverdue: {},
  chipText: { 
    fontSize: 13, 
    fontWeight: '600',
    letterSpacing: 0.1
  },
  chipTextActive: { 
    fontWeight: '700'
  },
  clearBtn: { 
    marginTop: 8, 
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  clearText: { 
    color: '#9F2241', 
    fontSize: 15, 
    fontWeight: '600',
    letterSpacing: 0.1
  }
});