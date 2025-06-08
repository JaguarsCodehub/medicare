import axios from 'axios';
import { getAccessToken } from './tokenStorage';

export const api = axios.create({
  baseURL: 'http://192.168.1.4:5000/api', // Your backend URL
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log("API Intercepted for Access Token", token)
  return config;
});