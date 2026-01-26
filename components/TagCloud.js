// components/TagCloud.js
// Nube de tags con tamaños proporcionales a su frecuencia
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../utils/haptics';

const TagCloud = memo(function TagCloud({ tags = [], onTagPress, selectedTags = [] }) {
  const { theme, isDark } = useTheme();
  
  // Calcular tamaño basado en frecuencia
  const getTagSize = (count, maxCount) => {
    const minSize = 12;
    const maxSize = 24;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };
  
  const maxCount = Math.max(...tags.map(t => t.count), 1);
  
  // Colores de tags
  const tagColors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899', '#F97316'
  ];
  
  const getTagColor = (index) => {
    return tagColors[index % tagColors.length];
  };
  
  if (tags.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No hay etiquetas aún. Agrega tags a tus tareas.
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cloudContainer}
      >
        {tags.map((tag, index) => {
          const fontSize = getTagSize(tag.count, maxCount);
          const isSelected = selectedTags.includes(tag.name);
          const color = getTagColor(index);
          
          return (
            <TouchableOpacity
              key={tag.name}
              style={[
                styles.tag,
                isSelected && [styles.tagSelected, { backgroundColor: color + '20', borderColor: color }]
              ]}
              onPress={() => {
                hapticLight();
                onTagPress && onTagPress(tag.name);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tagText,
                  { 
                    fontSize, 
                    color: isSelected ? color : (isDark ? '#E5E7EB' : '#4B5563'),
                    fontWeight: isSelected ? '700' : '600'
                  }
                ]}
              >
                #{tag.name}
              </Text>
              <Text style={[styles.tagCount, { color: theme.textSecondary }]}>
                {tag.count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  cloudContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  tagSelected: {
    borderWidth: 2,
  },
  tagText: {
    fontWeight: '600',
  },
  tagCount: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.6,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TagCloud;
