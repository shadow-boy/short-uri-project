import axios from 'axios';
import { getToken } from './auth';

const baseURL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

export interface Link {
  id: string;
  slug: string;
  destinationUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

export interface ClickAnalytics {
  totalClicks: number;
  linkId: string;
}

// Global loading HUD management via interceptors
let inflightRequests = 0;
const listeners = new Set<(loading: boolean) => void>();

function emitLoading() {
  const isLoading = inflightRequests > 0;
  listeners.forEach((cb) => cb(isLoading));
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  inflightRequests += 1;
  emitLoading();
  return config;
});

api.interceptors.response.use(
  (response) => {
    inflightRequests = Math.max(0, inflightRequests - 1);
    emitLoading();
    return response;
  },
  (error) => {
    inflightRequests = Math.max(0, inflightRequests - 1);
    emitLoading();
    return Promise.reject(error);
  }
);

export function onLoadingChange(cb: (loading: boolean) => void): () => void {
  listeners.add(cb);
  // call once with current state
  cb(inflightRequests > 0);
  return () => listeners.delete(cb);
}



