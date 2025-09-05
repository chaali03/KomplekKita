// Authentication utilities for KomplekKita
// Updated to use PHP API instead of localStorage

import { apiClient } from './api-client';

// User registration
export async function registerUser(userData) {
    try {
        const response = await apiClient.register({
            name: `${userData.firstName} ${userData.lastName}`.trim(),
            email: userData.email,
            password: userData.password,
            phone: userData.phone
        });

        if (response.success) {
            return { success: true, user: response.data.user };
        } else {
            return { success: false, error: response.error };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// User login
export async function loginUser(email, password) {
    try {
        const response = await apiClient.login(email, password);

        if (response.success) {
            return { success: true, user: response.data.user };
        } else {
            return { success: false, error: response.error };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check authentication status
export function getAuthStatus() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    
    if (!token || !userData) {
        return {
            isAuthenticated: false,
            hasCompletedComplexRegistration: false,
            redirectTo: '/login'
        };
    }

    try {
        const user = JSON.parse(userData);
        
        if (!user.has_completed_complex_registration) {
            return {
                isAuthenticated: true,
                hasCompletedComplexRegistration: false,
                redirectTo: '/register-komplek',
                user: user
            };
        }

        return {
            isAuthenticated: true,
            hasCompletedComplexRegistration: true,
            redirectTo: null,
            user: user
        };
    } catch (error) {
        return {
            isAuthenticated: false,
            hasCompletedComplexRegistration: false,
            redirectTo: '/login'
        };
    }
}

// Complete complex registration
export async function completeComplexRegistration(complexData) {
    try {
        const response = await apiClient.registerKomplek({
            namaKomplek: complexData.namaKomplek,
            deskripsiKomplek: complexData.deskripsiKomplek,
            profilKomplek: complexData.profilKomplek,
            latKomplek: complexData.latKomplek,
            lngKomplek: complexData.lngKomplek,
            namaKetuaRT: complexData.namaKetuaRT,
            ketuaPhone: complexData.ketuaPhone,
            namaBendahara: complexData.namaBendahara,
            bendaharaPhone: complexData.bendaharaPhone
        });

        if (response.success) {
            // Update user data in localStorage
            const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
            userData.has_completed_complex_registration = true;
            userData.complex_id = response.data.komplek.id;
            localStorage.setItem('auth_user', JSON.stringify(userData));
            
            return { success: true, complex: response.data.komplek };
        } else {
            return { success: false, error: response.error };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Logout
export async function logout() {
    try {
        await apiClient.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }
}

// Get current user
export function getCurrentUser() {
    const userData = localStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
}

// Get user's complex
export async function getUserComplex() {
    try {
        const response = await apiClient.getMe();
        if (response.success && response.data?.complex_id) {
            // You might want to add a specific endpoint for getting complex details
            return { id: response.data.complex_id };
        }
        return null;
    } catch (error) {
        console.error('Error getting user complex:', error);
        return null;
    }
}

// Authentication middleware for protected routes
export function requireAuth() {
    const authStatus = getAuthStatus();
    
    if (!authStatus.isAuthenticated) {
        window.location.href = '/login';
        return false;
    }
    
    if (!authStatus.hasCompletedComplexRegistration) {
        window.location.href = '/register-komplek';
        return false;
    }
    
    return true;
}

// Check if user should be redirected
export function checkAuthRedirect() {
    const authStatus = getAuthStatus();
    const currentPath = window.location.pathname;
    
    // If user is on login/register pages but already authenticated
    if (authStatus.isAuthenticated && (currentPath === '/login' || currentPath === '/register')) {
        if (authStatus.hasCompletedComplexRegistration) {
            window.location.href = '/dashboard';
        } else {
            window.location.href = '/register-komplek';
        }
        return;
    }
    
    // If user is on register-komplek but already completed
    if (authStatus.hasCompletedComplexRegistration && currentPath === '/register-komplek') {
        window.location.href = '/dashboard';
        return;
    }
    
    // If user is on protected routes but not authenticated
    const protectedRoutes = ['/dashboard', '/admin'];
    if (protectedRoutes.some(route => currentPath.startsWith(route))) {
        if (!authStatus.isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        if (!authStatus.hasCompletedComplexRegistration) {
            window.location.href = '/register-komplek';
            return;
        }
    }
}
