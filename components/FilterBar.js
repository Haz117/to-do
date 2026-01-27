// components/FilterBar.js
// Barra de filtros y búsqueda reutilizable. Permite filtrar por área, responsable, prioridad, vencidas y buscar por título.
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const FilterBar = memo(function FilterBar({ onFilterChange }) {
  const { theme, isDark } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showOverdue, setShowOverdue] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    setIsExpanded(false);
    onFilterChange && onFilterChange({ searchText: '', area: '', responsible: '', priority: '', overdue: false });
  };

  const hasActiveFilters = selectedArea || selectedPriority || showOverdue;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.surface : '#FAFAFA' }]}>
      {/* Barra compacta con búsqueda y botón de filtros */}
      <View style={styles.compactBar}>
        <View style={[styles.searchContainer, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA'
        }]}>
          <Ionicons name="search" size={18} color={isDark ? '#999' : '#666'} />
          <TextInput
            placeholder="Buscar tareas..."
            placeholderTextColor={isDark ? '#999' : '#666'}
            value={searchText}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#999' : '#666'} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={[styles.filterButton, { 
            backgroundColor: hasActiveFilters ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
            borderColor: hasActiveFilters ? theme.primary : (isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA')
          }]}
        >
          <Ionicons 
            name="filter" 
            size={18} 
            color={hasActiveFilters ? '#FFFFFF' : (isDark ? '#999' : '#666')} 
          />
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {[selectedArea, selectedPriority, showOverdue].filter(Boolean).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Panel de filtros expandible */}
      {isExpanded && (
        <View style={styles.expandedFilters}>
          {/* Áreas */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ÁREA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {areas.map(area => (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[
                      styles.compactChip,
                      {
                        backgroundColor: selectedArea === area ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
                        borderColor: selectedArea === area ? theme.primary : (isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA')
                      }
                    ]}
                  >
                    <Text style={[
                      styles.compactChipText,
                      { color: selectedArea === area ? '#FFFFFF' : theme.text }
                    ]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Prioridades */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PRIORIDAD</Text>
            <View style={styles.chipRow}>
              {priorities.map(priority => (
                <TouchableOpacity
                  key={priority}
                  onPress={() => togglePriority(priority)}
                  style={[
                    styles.compactChip,
                    {
                      backgroundColor: selectedPriority === priority ? theme.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
                      borderColor: selectedPriority === priority ? theme.primary : (isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA')
                    }
                  ]}
                >
                  <Text style={[
                    styles.compactChipText,
                    { color: selectedPriority === priority ? '#FFFFFF' : theme.text }
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {/* Vencidas */}
              <TouchableOpacity
                onPress={toggleOverdue}
                style={[
                  styles.compactChip,
                  {
                    backgroundColor: showOverdue ? '#DC2626' : (isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
                    borderColor: showOverdue ? '#DC2626' : (isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA')
                  }
                ]}
              >
                <Text style={[
                  styles.compactChipText,
                  { color: showOverdue ? '#FFFFFF' : theme.text }
                ]}>
                  Vencidas
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón limpiar */}
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
              <Ionicons name="close-circle" size={16} color={theme.primary} />
              <Text style={[styles.clearButtonText, { color: theme.primary }]}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  compactBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  expandedFilters: {
    marginTop: 12,
    gap: 12,
  },
  filterSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FilterBar;