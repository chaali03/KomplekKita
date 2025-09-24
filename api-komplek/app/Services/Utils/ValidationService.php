<?php

namespace App\Services\Utils;

class ValidationService
{
    // Daftar kata-kata tidak pantas dan nama hewan yang harus diblokir
    private $profanityList = [
        // Indonesian profanity
        'anjing', 'babi', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot', 'bego', 'goblok', 'tolol',
        // English profanity
        'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock', 'pussy',
        'whore', 'slut', 'bastard', 'motherfucker', 'fucker', 'shithead', 'dumbass', 'idiot', 'moron',
    ];

    // Daftar nama kompleks umum yang mungkin diduplikasi
    private $commonComplexNames = [
        'griya', 'harmoni', 'asri', 'indah', 'permai', 'sejahtera', 'makmur', 'sentosa', 'bahagia',
        'mulia', 'utama', 'prima', 'elite', 'exclusive', 'premium', 'luxury', 'villa', 'residence',
    ];

    /**
     * Memeriksa apakah teks mengandung kata-kata tidak pantas
     */
    public function containsProfanity($text)
    {
        if (!$text) return false;
        
        $normalizedText = strtolower($text);
        $normalizedText = preg_replace('/[^\w\s]/', ' ', $normalizedText);
        $normalizedText = preg_replace('/\s+/', ' ', $normalizedText);
        $normalizedText = trim($normalizedText);
        
        $words = explode(' ', $normalizedText);
        
        foreach ($words as $word) {
            if (in_array($word, $this->profanityList)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Validasi email
     */
    public function validateEmail($email)
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                'valid' => false,
                'message' => 'Format email tidak valid'
            ];
        }
        
        return ['valid' => true];
    }

    /**
     * Validasi password
     */
    public function validatePassword($password)
    {
        if (strlen($password) < 8) {
            return [
                'valid' => false,
                'message' => 'Password harus minimal 8 karakter'
            ];
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password harus mengandung minimal 1 huruf kapital'
            ];
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password harus mengandung minimal 1 angka'
            ];
        }
        
        return ['valid' => true];
    }

    /**
     * Validasi nama kompleks
     */
    public function validateComplexName($name)
    {
        if (strlen($name) < 5) {
            return [
                'valid' => false,
                'message' => 'Nama kompleks terlalu pendek'
            ];
        }
        
        if ($this->containsProfanity($name)) {
            return [
                'valid' => false,
                'message' => 'Nama kompleks mengandung kata tidak pantas'
            ];
        }
        
        return ['valid' => true];
    }
}