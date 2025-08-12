import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
}


