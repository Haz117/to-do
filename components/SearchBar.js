import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../utils/feedback';

/**
 * SearchBar component with debounce functionality
 * 
 * @param {function} onSearch - Callback when search text changes (debounced)
 * @param {string} placeholder - Placeholder text
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 100)
 */
const SearchBar = ({ onSearch, placeholder = 'Buscar tareas...', debounceMs = 100 }) => {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(searchText);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [searchText, debounceMs, onSearch]);

  const handleClear = useCallback(() => {
    hapticLight();
    setSearchText('');
    onSearch('');
  }, [onSearch]);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.searchBackground,
        borderColor: isFocused ? theme.primary : theme.searchBorder,
        borderWidth: isFocused ? 2 : 1,
      }
    ]}>
      <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {searchText.length > 0 && (
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default React.memo(SearchBar);
