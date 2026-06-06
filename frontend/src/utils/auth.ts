import { User } from '../types';

export const getToken = () => localStorage.getItem('token');
export const setToken = (token: string) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

export const getUser = (): User | null => {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export const setUser = (user: User) => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('user');

export const hasRole = (...roles: string[]) => {
  const user = getUser();
  return user ? roles.includes(user.role) : false;
};

export const isAdmin = () => hasRole('admin');
export const isFinance = () => hasRole('finance');
export const isProjectManager = () => hasRole('project_manager');
