import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { publicAnonKey } from '../utils/supabase/info';
import { runServerInitialization } from '../utils/startup';

export interface User {
  id: string;
  email: string;
  name: string;
  department: 'Business Development' | 'Pricing' | 'Operations' | 'Accounting' | 'Executive';
  role: 'rep' | 'manager' | 'director';
  created_at: string;
  is_active: boolean;
}

interface DevRoleOverride {
  department: string;
  role: string;
  enabled: boolean;
  timestamp: string;
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  effectiveDepartment: string;
  effectiveRole: string;
  devOverride: DevRoleOverride | null;
  setDevOverride: (override: DevRoleOverride | null) => void;
  setUser: (user: User | null) => void; // Add direct user setter for dev login
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devOverride, setDevOverrideState] = useState<DevRoleOverride | null>(null);

  // Load dev override from localStorage on mount
  useEffect(() => {
    const storedOverride = localStorage.getItem('neuron_dev_role_override');
    if (storedOverride) {
      try {
        const parsed = JSON.parse(storedOverride);
        if (parsed.enabled) {
          setDevOverrideState(parsed);
        }
      } catch (error) {
        console.error('Error parsing dev override:', error);
        localStorage.removeItem('neuron_dev_role_override');
      }
    }
  }, []);

  // Wrapper to save override to localStorage
  const setDevOverride = (override: DevRoleOverride | null) => {
    setDevOverrideState(override);
    if (override) {
      localStorage.setItem('neuron_dev_role_override', JSON.stringify(override));
    } else {
      localStorage.removeItem('neuron_dev_role_override');
    }
  };

  // Computed effective values
  const effectiveDepartment = devOverride?.enabled && devOverride.department 
    ? devOverride.department 
    : user?.department || 'Operations';
    
  const effectiveRole = devOverride?.enabled && devOverride.role 
    ? devOverride.role 
    : user?.role || 'rep';

  // Check for existing session on mount and auto-seed users if needed
  useEffect(() => {
    // IMMEDIATELY check localStorage for stored user — don't block on server calls
    const storedUser = localStorage.getItem('neuron_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate department format - if old format, clear session
        if (parsedUser.department === "BD" || parsedUser.department === "PD") {
          console.log('Clearing old session with outdated department format');
          localStorage.removeItem('neuron_user');
          setUser(null);
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('neuron_user');
      }
    }
    // Set loading to false immediately — user session is resolved from localStorage
    setIsLoading(false);

    // Run server initialization in the background (non-blocking)
    runServerInitialization(() => {
      localStorage.removeItem('neuron_user');
      setUser(null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Login failed' };
      }

      // Store user in state and localStorage
      setUser(result.data);
      localStorage.setItem('neuron_user', JSON.stringify(result.data));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('neuron_user');
    // Also clear dev override on logout
    setDevOverride(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        effectiveDepartment,
        effectiveRole,
        devOverride,
        setDevOverride,
        setUser, // Add direct user setter for dev login
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}