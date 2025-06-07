import React, { useState } from 'react';
import { TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '@/lib/api';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { saveAccessToken, saveUserEmail } from '@/lib/tokenStorage';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleLogin = async () => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const accessToken = res.data.access_token;
      
      // Save both token and email
      await Promise.all([
        saveAccessToken(accessToken),
        saveUserEmail(email)
      ]);
      
      setMessage('Logged in successfully!');
      console.log("Access Token and Email Saved!");
      router.push('/(medications)/add');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error logging in');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        
        <TextInput 
          style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
          placeholder='Email' 
          value={email} 
          onChangeText={setEmail}
          placeholderTextColor={colors.tabIconDefault}
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
          placeholder='Password'
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.tabIconDefault}
        />
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.tint }]} 
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  input: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
    color: '#E74C3C',
  },
});
