// Validation utilities for KomplekKita

// List of inappropriate words and animal names that should be blocked
const PROFANITY_LIST = [
  // Indonesian profanity
  'anjing', 'babi', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot', 'bego', 'goblok', 'tolol',
  'bajing', 'babi', 'anjing', 'kucing', 'tikus', 'ular', 'buaya', 'harimau', 'singa', 'gajah',
  'kerbau', 'sapi', 'kambing', 'domba', 'ayam', 'bebek', 'angsa', 'burung', 'ikan', 'udang',
  'kepiting', 'lobster', 'cumi', 'gurita', 'paus', 'lumba', 'hiu', 'ikan', 'kodok', 'katak',
  'kadal', 'cicak', 'tokek', 'bunglon', 'komodo', 'buaya', 'kura', 'penyu', 'kepiting', 'lobster',
  
  // English profanity
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'bastard', 'motherfucker', 'fucker', 'shithead', 'dumbass', 'idiot', 'moron',
  
  // Animal names that might be used as insults
  'monkey', 'ape', 'gorilla', 'chimpanzee', 'orangutan', 'baboon', 'macaque', 'lemur', 'sloth',
  'pig', 'swine', 'hog', 'boar', 'sow', 'dog', 'bitch', 'puppy', 'mutt', 'cur', 'hound',
  'cat', 'kitten', 'tomcat', 'tabby', 'mouser', 'rat', 'mouse', 'rodent', 'vermin', 'pest',
  'snake', 'serpent', 'viper', 'cobra', 'python', 'anaconda', 'rattlesnake', 'mamba', 'asp',
  'crocodile', 'alligator', 'caiman', 'gator', 'lizard', 'gecko', 'iguana', 'chameleon',
  'turtle', 'tortoise', 'terrapin', 'frog', 'toad', 'tadpole', 'bullfrog', 'treefrog',
  
  // Additional inappropriate terms
  'stupid', 'dumb', 'retard', 'retarded', 'imbecile', 'fool', 'clown', 'joker', 'loser',
  'freak', 'weirdo', 'creep', 'pervert', 'psycho', 'crazy', 'insane', 'mental', 'nuts'
];

// List of common complex names that might be duplicated
const COMMON_COMPLEX_NAMES = [
  'griya', 'harmoni', 'asri', 'indah', 'permai', 'sejahtera', 'makmur', 'sentosa', 'bahagia',
  'mulia', 'utama', 'prima', 'elite', 'exclusive', 'premium', 'luxury', 'villa', 'residence',
  'apartment', 'condominium', 'townhouse', 'cluster', 'estate', 'garden', 'park', 'green',
  'hill', 'valley', 'lake', 'river', 'ocean', 'beach', 'mountain', 'forest', 'meadow'
];

/**
 * Check if text contains profanity or inappropriate words
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  const words = normalizedText.split(' ');
  
  return words.some(word => {
    // Check exact matches
    if (PROFANITY_LIST.includes(word)) return true;
    
    // Check partial matches (for compound words)
    return PROFANITY_LIST.some(profanity => 
      word.includes(profanity) || profanity.includes(word)
    );
  });
}

/**
 * Check if complex name is too generic or common
 */
export function isGenericComplexName(name: string): boolean {
  if (!name) return false;
  
  const normalizedName = name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check if name contains only common words
  const words = normalizedName.split(' ');
  const commonWordCount = words.filter(word => 
    COMMON_COMPLEX_NAMES.includes(word)
  ).length;
  
  // If more than 70% of words are common, consider it generic
  return (commonWordCount / words.length) > 0.7;
}

/**
 * Validate complex name uniqueness
 */
export async function validateComplexNameUniqueness(name: string): Promise<{
  isUnique: boolean;
  message?: string;
}> {
  try {
    // Check against existing complex names in database
    const response = await fetch('http://127.0.0.1:8000/api/check-complex-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { isUnique: false, message: 'Gagal memvalidasi nama komplek' };
    }
    
    return {
      isUnique: !data.exists,
      message: data.exists ? 'Nama komplek sudah digunakan' : undefined
    };
  } catch (error) {
    console.error('Error validating complex name:', error);
    return { isUnique: false, message: 'Gagal memvalidasi nama komplek' };
  }
}

/**
 * Validate user data for profanity and duplicates
 */
export function validateUserData(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check first name
  if (data.firstName && containsProfanity(data.firstName)) {
    errors.push('Nama depan mengandung kata yang tidak pantas');
  }
  
  // Check last name
  if (data.lastName && containsProfanity(data.lastName)) {
    errors.push('Nama belakang mengandung kata yang tidak pantas');
  }
  
  // Check email for profanity in local part
  if (data.email) {
    const emailLocal = data.email.split('@')[0];
    if (containsProfanity(emailLocal)) {
      errors.push('Email mengandung kata yang tidak pantas');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate complex data for profanity and duplicates
 */
export async function validateComplexData(data: {
  nama?: string;
  deskripsi?: string;
  profil?: string;
  ketua?: string;
  bendahara?: string;
}): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check complex name
  if (data.nama) {
    if (containsProfanity(data.nama)) {
      errors.push('Nama komplek mengandung kata yang tidak pantas');
    }
    
    if (isGenericComplexName(data.nama)) {
      errors.push('Nama komplek terlalu umum, gunakan nama yang lebih spesifik');
    }
    
    // Check uniqueness
    const uniquenessCheck = await validateComplexNameUniqueness(data.nama);
    if (!uniquenessCheck.isUnique) {
      errors.push(uniquenessCheck.message || 'Nama komplek sudah digunakan');
    }
  }
  
  // Check description
  if (data.deskripsi && containsProfanity(data.deskripsi)) {
    errors.push('Deskripsi komplek mengandung kata yang tidak pantas');
  }
  
  // Check profile
  if (data.profil && containsProfanity(data.profil)) {
    errors.push('Profil komplek mengandung kata yang tidak pantas');
  }
  
  // Check chairman name
  if (data.ketua && containsProfanity(data.ketua)) {
    errors.push('Nama ketua mengandung kata yang tidak pantas');
  }
  
  // Check treasurer name
  if (data.bendahara && containsProfanity(data.bendahara)) {
    errors.push('Nama bendahara mengandung kata yang tidak pantas');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Real-time validation for input fields
 */
export function setupRealTimeValidation(input: HTMLInputElement, validationType: 'user' | 'complex'): void {
  let timeoutId: NodeJS.Timeout;
  
  input.addEventListener('input', () => {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(async () => {
      const value = input.value.trim();
      if (!value) return;
      
      let isValid = true;
      let errorMessage = '';
      
      if (validationType === 'user') {
        const validation = validateUserData({ 
          [input.name]: value 
        });
        isValid = validation.isValid;
        errorMessage = validation.errors[0] || '';
      } else if (validationType === 'complex') {
        if (input.name === 'namaKomplek') {
          if (containsProfanity(value)) {
            isValid = false;
            errorMessage = 'Nama komplek mengandung kata yang tidak pantas';
          } else if (isGenericComplexName(value)) {
            isValid = false;
            errorMessage = 'Nama komplek terlalu umum';
          } else {
            const uniquenessCheck = await validateComplexNameUniqueness(value);
            if (!uniquenessCheck.isUnique) {
              isValid = false;
              errorMessage = uniquenessCheck.message || 'Nama komplek sudah digunakan';
            }
          }
        } else {
          const validation = await validateComplexData({ 
            [input.name]: value 
          });
          isValid = validation.isValid;
          errorMessage = validation.errors[0] || '';
        }
      }
      
      // Show validation feedback
      showValidationFeedback(input, isValid, errorMessage);
    }, 500); // Debounce for 500ms
  });
}

/**
 * Show validation feedback on input field
 */
function showValidationFeedback(input: HTMLInputElement, isValid: boolean, message: string): void {
  const container = input.closest('.input-container') || input.parentElement;
  if (!container) return;
  
  // Remove existing feedback
  const existingFeedback = container.querySelector('.validation-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Remove existing classes
  container.classList.remove('valid', 'invalid');
  
  if (input.value.trim()) {
    if (isValid) {
      container.classList.add('valid');
    } else {
      container.classList.add('invalid');
      
      // Add error message
      const feedback = document.createElement('div');
      feedback.className = 'validation-feedback error';
      feedback.textContent = message;
      container.appendChild(feedback);
    }
  }
}
