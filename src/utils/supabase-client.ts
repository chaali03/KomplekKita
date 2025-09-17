// Supabase client integration for KomplekKita
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define types for our options and parameters
type AuthCredentials = {
  email: string;
  password: string;
};

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

type OrderOptions = {
  column: string;
  ascending?: boolean;
};

type QueryOptions = {
  select?: string;
  filters?: Record<string, any>;
  pagination?: PaginationOptions;
  order?: OrderOptions;
};

// Initialize the Supabase client with environment variables
const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://iduumftxjnplvgafihlq.supabase.co';
const supabaseKey = import.meta.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXVtZnR4am5wbHZnYWZpaGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0MDk0NjAsImV4cCI6MjAyNDk4NTQ2MH0.eMdFFbjosNRoZDNlg6udnRtZ09-OF4fqwYQDVby6U';

// Create a single supabase client for interacting with your database
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase API wrapper for KomplekKita
 * Provides methods for interacting with Supabase tables and authentication
 */
export const supabaseClient = {
  // Authentication methods
  auth: {
    /**
     * Sign up a new user
     * @param userData - User data including email and password
     * @returns Supabase response
     */
    signUp: async (userData: AuthCredentials) => {
      return await supabase.auth.signUp(userData);
    },

    /**
     * Sign in a user
     * @param credentials - User credentials
     * @returns Supabase response
     */
    signIn: async (credentials: AuthCredentials) => {
      return await supabase.auth.signInWithPassword(credentials);
    },

    /**
     * Sign out the current user
     * @returns Supabase response
     */
    signOut: async () => {
      return await supabase.auth.signOut();
    },

    /**
     * Get the current user session
     * @returns Supabase response with session data
     */
    getSession: async () => {
      return await supabase.auth.getSession();
    },

    /**
     * Get the current user
     * @returns Supabase response with user data
     */
    getUser: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  },

  // Database methods
  db: {
    /**
     * Get data from a table with optional filters
     * @param table - Table name
     * @param options - Query options (filters, pagination, etc)
     * @returns Supabase response
     */
    get: async (table: string, options: QueryOptions = {}) => {
      let query = supabase.from(table).select(options.select || '*');

      // Apply filters if provided
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          query = query.eq(key, value);
        }
      }

      // Apply pagination if provided
      if (options.pagination) {
        const { page = 1, pageSize = 10 } = options.pagination;
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        query = query.range(start, end);
      }

      // Apply ordering if provided
      if (options.order) {
        const { column, ascending = true } = options.order;
        query = query.order(column, { ascending });
      }

      return await query;
    },

    /**
     * Insert data into a table
     * @param table - Table name
     * @param data - Data to insert (object or array of objects)
     * @returns Supabase response
     */
    insert: async <T>(table: string, data: T | T[]) => {
      return await supabase.from(table).insert(data);
    },

    /**
     * Update data in a table
     * @param table - Table name
     * @param data - Data to update
     * @param match - Column to match for the update
     * @returns Supabase response
     */
    update: async <T>(table: string, data: Partial<T>, match: Record<string, any>) => {
      let query = supabase.from(table).update(data);
      
      // Apply match conditions
      for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value);
      }
      
      return await query;
    },

    /**
     * Delete data from a table
     * @param table - Table name
     * @param match - Column to match for deletion
     * @returns Supabase response
     */
    delete: async (table: string, match: Record<string, any>) => {
      let query = supabase.from(table).delete();
      
      // Apply match conditions
      for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value);
      }
      
      return await query;
    }
  },

  // Storage methods
  storage: {
    /**
     * Upload a file to storage
     * @param bucket - Storage bucket name
     * @param path - File path in the bucket
     * @param file - File to upload
     * @param options - Upload options
     * @returns Supabase response
     */
    upload: async (bucket: string, path: string, file: File, options?: { cacheControl?: string }) => {
      return await supabase.storage.from(bucket).upload(path, file, options);
    },

    /**
     * Download a file from storage
     * @param bucket - Storage bucket name
     * @param path - File path in the bucket
     * @returns Supabase response
     */
    download: async (bucket: string, path: string) => {
      return await supabase.storage.from(bucket).download(path);
    },

    /**
     * Get a public URL for a file
     * @param bucket - Storage bucket name
     * @param path - File path in the bucket
     * @returns Public URL string
     */
    getPublicUrl: (bucket: string, path: string) => {
      return supabase.storage.from(bucket).getPublicUrl(path);
    },

    /**
     * Remove a file from storage
     * @param bucket - Storage bucket name
     * @param paths - File paths to remove
     * @returns Supabase response
     */
    remove: async (bucket: string, paths: string[]) => {
      return await supabase.storage.from(bucket).remove(paths);
    },

    /**
     * List all files in a bucket with optional prefix
     * @param bucket - Storage bucket name
     * @param options - List options
     * @returns Supabase response
     */
    list: async (bucket: string, options?: { limit?: number; offset?: number; sortBy?: { column: string; order: 'asc' | 'desc' }; prefix?: string }) => {
      return await supabase.storage.from(bucket).list(options?.prefix || '', options);
    }
  }
};

// Default export for convenience
export default supabaseClient;