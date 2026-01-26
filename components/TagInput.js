// components/TagInput.js
// Input para agregar tags con chips
import React, { useState, memo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../utils/haptics';

const TagInput = memo(function TagInput({ 
  tags = [], 
  onTagsChange, 
  placeholder = "Agregar etiqueta...",
  maxTags = 10
}) {
  const { theme, isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');
  
  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    
    if (!trimmed) return;
    
    if (tags.length >= maxTags) {
      return;
    }
    
    if (tags.includes(trimmed)) {
      setInputValue('');
      return;
    }
    
    hapticLight();
    onTagsChange([...tags, trimmed]);
    setInputValue('');
  };
  
  const removeTag = (tagToRemove) => {
    hapticLight();
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ',') {
      e.preventDefault();
      addTag();
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Tags existentes */}
      {tags.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {tags.map((tag, index) => (
            <View
              key={`${tag}-${index}`}
              style={[styles.tagChip, { backgroundColor: isDark ? theme.surface : '#F3F4F6' }]}
            >
              <Text style={[styles.tagChipText, { color: theme.text }]}>
                #{tag}
              </Text>
              <TouchableOpacity
                onPress={() => removeTag(tag)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      
      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={addTag}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
              color: theme.text,
              borderColor: theme.border
            }
          ]}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: inputValue.trim() ? theme.primary : theme.buttonSecondaryBg },
            !inputValue.trim() && styles.addButtonDisabled
          ]}
          onPress={addTag}
          disabled={!inputValue.trim()}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="add" 
            size={20} 
            color={inputValue.trim() ? '#FFF' : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Helper text */}
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        {tags.length}/{maxTags} etiquetas • Presiona Enter o coma para agregar
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
});

export default TagInput;
