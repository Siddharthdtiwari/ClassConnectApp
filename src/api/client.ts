import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Uses the environment variable if provided, otherwise defaults to production
const API_URL = process.env.EXPO_PUBLIC_CLASSCONNECT_API_URL || 'https://tuitionhub.vercel.app/api/v1';

const client = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to attach the JWT token
client.interceptors.request.use(
  async (config) => {
    let token = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem('userToken');
    } else {
      token = await SecureStore.getItemAsync('userToken');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
