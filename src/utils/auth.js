// Authentication utilities for KomplekKita
// Handles user registration, login, and complex registration flow

// Mock database - in production, replace with actual database calls
let users = JSON.parse(localStorage.getItem('komplekKita_users') || '[]');
let complexes = JSON.parse(localStorage.getItem('komplekKita_complexes') || '[]');
let currentUser = JSON.parse(localStorage.getItem('komplekKita_currentUser') || 'null');

// Save data to localStorage (mock database)
function saveUsers() {
    localStorage.setItem('komplekKita_users', JSON.stringify(users));
}

function saveComplexes() {
    localStorage.setItem('komplekKita_complexes', JSON.stringify(complexes));
}

function saveCurrentUser() {
    localStorage.setItem('komplekKita_currentUser', JSON.stringify(currentUser));
}

// User registration
export async function registerUser(userData) {
    try {
        // Check if user already exists
        const existingUser = users.find(user => user.email === userData.email);
        if (existingUser) {
            throw new Error('Email sudah terdaftar');
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            password: userData.password, // In production, hash this
            hasCompletedComplexRegistration: false,
            complexId: null,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers();

        return { success: true, user: newUser };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// User login
export async function loginUser(email, password) {
    try {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error('Email atau password salah');
        }

        currentUser = user;
        saveCurrentUser();

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check authentication status
export function getAuthStatus() {
    if (!currentUser) {
        return {
            isAuthenticated: false,
            hasCompletedComplexRegistration: false,
            redirectTo: '/login'
        };
    }

    if (!currentUser.hasCompletedComplexRegistration) {
        return {
            isAuthenticated: true,
            hasCompletedComplexRegistration: false,
            redirectTo: '/register-komplek',
            user: currentUser
        };
    }

    return {
        isAuthenticated: true,
        hasCompletedComplexRegistration: true,
        redirectTo: null,
        user: currentUser
    };
}

// Complete complex registration
export async function completeComplexRegistration(complexData) {
    try {
        if (!currentUser) {
            throw new Error('User tidak terautentikasi');
        }

        // Create new complex
        const newComplex = {
            id: Date.now().toString(),
            userId: currentUser.id,
            name: complexData.namaKomplek,
            description: complexData.deskripsiKomplek,
            profile: complexData.profilKomplek,
            address: complexData.alamatKomplek,
            latitude: complexData.latKomplek,
            longitude: complexData.lngKomplek,
            ketuaRT: {
                name: complexData.namaKetuaRT,
                phone: complexData.ketuaPhone
            },
            bendahara: {
                name: complexData.namaBendahara,
                phone: complexData.bendaharaPhone
            },
            residents: complexData.residents || [],
            finances: complexData.finances || [],
            createdAt: new Date().toISOString()
        };

        complexes.push(newComplex);
        saveComplexes();

        // Update user status
        currentUser.hasCompletedComplexRegistration = true;
        currentUser.complexId = newComplex.id;
        
        // Update user in users array
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            saveUsers();
        }
        
        saveCurrentUser();

        return { success: true, complex: newComplex };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Logout
export function logout() {
    currentUser = null;
    localStorage.removeItem('komplekKita_currentUser');
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Get user's complex
export function getUserComplex() {
    if (!currentUser || !currentUser.complexId) return null;
    return complexes.find(c => c.id === currentUser.complexId);
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
