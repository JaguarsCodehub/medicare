// lib/tokenStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'access_token';
const USER_EMAIL_KEY = 'user_email';

export const saveAccessToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving access token:', error);
  }
};

export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

export const saveUserEmail = async (email: string) => {
  try {
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
  } catch (error) {
    console.error('Error saving user email:', error);
  }
};

export const getUserEmail = async () => {
  try {
    return await AsyncStorage.getItem(USER_EMAIL_KEY);
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};
