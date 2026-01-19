// components/Input.js
// Input moderno con animaciones y validación visual
import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Input({ 
  label = '',
  placeholder = '',
  value = '',
  onChangeText = () => {},
  icon = null,
  error = '',
  success = false,
  disabled = false,
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  style,
}) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const labelScaleAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(borderColorAnim, {
      toValue: isFocused ? 1 : error ? 2 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, error]);

  useEffect(() => {
    Animated.timing(labelScaleAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, value]);

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [theme.inputBorder, theme.inputBorderFocused, theme.error],
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.Text
          style={[
            styles.label,
            {
              color: error ? theme.error : isFocused ? theme.primary : theme.textSecondary,
              opacity: labelScaleAnim,
              transform: [
                {
                  translateY: labelScaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBackground,
            borderColor: borderColor,
            borderWidth: 2,
          },
          disabled && styles.inputDisabled,
          multiline && { height: 100, alignItems: 'flex-start' },
        ]}
      >
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons 
              name={icon} 
              size={20} 
              color={error ? theme.error : isFocused ? theme.primary : theme.textSecondary} 
            />
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            { color: theme.inputText },
            multiline && { height: 80, textAlignVertical: 'top' },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />

        {(error || success) && (
          <View style={styles.statusIcon}>
            <Ionicons 
              name={error ? "alert-circle" : "checkmark-circle"} 
              size={20} 
              color={error ? theme.error : theme.success} 
            />
          </View>
        )}
      </Animated.View>

      {error && (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
  },
  statusIcon: {
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});
