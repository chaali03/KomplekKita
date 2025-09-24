<?php

namespace App\Services\Utils;

use App\Models\User;
use App\Models\Complex;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    protected $apiClient;
    
    public function __construct(ApiClientService $apiClient)
    {
        $this->apiClient = $apiClient;
    }
    
    /**
     * Register a new user
     */
    public function registerUser($userData)
    {
        try {
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => Hash::make($userData['password']),
                'phone' => $userData['phone']
            ]);
            
            $token = $user->createToken('auth_token')->plainTextToken;
            
            return [
                'success' => true,
                'user' => $user,
                'token' => $token
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Login a user
     */
    public function loginUser($email, $password)
    {
        if (Auth::attempt(['email' => $email, 'password' => $password])) {
            $user = Auth::user();
            $token = $user->createToken('auth_token')->plainTextToken;
            
            return [
                'success' => true,
                'user' => $user,
                'token' => $token
            ];
        }
        
        return [
            'success' => false,
            'error' => 'Invalid credentials'
        ];
    }
    
    /**
     * Complete complex registration
     */
    public function completeComplexRegistration($complexData, $userId)
    {
        try {
            $complex = Complex::create([
                'nama_komplek' => $complexData['namaKomplek'],
                'deskripsi_komplek' => $complexData['deskripsiKomplek'],
                'profil_komplek' => $complexData['profilKomplek'],
                'lat_komplek' => $complexData['latKomplek'],
                'lng_komplek' => $complexData['lngKomplek'],
                'nama_ketua_rt' => $complexData['namaKetuaRT'],
                'ketua_phone' => $complexData['ketuaPhone'],
                'nama_bendahara' => $complexData['namaBendahara'],
                'bendahara_phone' => $complexData['bendaharaPhone'],
                'created_by' => $userId
            ]);
            
            // Update user record
            $user = User::find($userId);
            $user->has_completed_complex_registration = true;
            $user->complex_id = $complex->id;
            $user->save();
            
            return [
                'success' => true,
                'komplek' => $complex,
                'user' => $user
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get authentication status
     */
    public function getAuthStatus($token)
    {
        if (!$token) {
            return [
                'isAuthenticated' => false,
                'hasCompletedComplexRegistration' => false,
                'redirectTo' => '/login'
            ];
        }
        
        try {
            // Validate token and get user
            $user = auth('sanctum')->user();
            
            if (!$user) {
                return [
                    'isAuthenticated' => false,
                    'hasCompletedComplexRegistration' => false,
                    'redirectTo' => '/login'
                ];
            }
            
            if (!$user->has_completed_complex_registration) {
                return [
                    'isAuthenticated' => true,
                    'hasCompletedComplexRegistration' => false,
                    'redirectTo' => '/register-komplek',
                    'user' => $user
                ];
            }
            
            return [
                'isAuthenticated' => true,
                'hasCompletedComplexRegistration' => true,
                'redirectTo' => null,
                'user' => $user
            ];
        } catch (\Exception $e) {
            return [
                'isAuthenticated' => false,
                'hasCompletedComplexRegistration' => false,
                'redirectTo' => '/login',
                'error' => $e->getMessage()
            ];
        }
    }
}