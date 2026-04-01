import api from '../../services/api';

export const login = async (email: string, password: string) => {
  return await api.post('/auth/login', { email, password });
};

export const signup = async (name: string, email: string, password: string) => {
  return await api.post('/auth/signup', { name, email, password });
};
