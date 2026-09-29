import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, BiometricCredential, CachedStaffAccount } from '../types';
import { supabase } from '../lib/supabase';
import { webAuthnService } from '../services/webauthn';
import { offlineAuthService } from '../services/offlineAuth';

export const MWANZA_PLANT_ROSTER: Record<'supervisor' | 'dispatcher' | 'manager' | 'field_staff', UserProfile> = {
  supervisor: {
    id: 'usr-noah-philemon',
    name: 'Noah Philemon',
    email: 'noah.philemon@zamzam.co.tz',
    phone: '+255 768 412 001',
    role: 'supervisor',
    employeeId: 'ZZ-MWZ-SUP-01',
    plant: 'Mwanza Plant',
    title: 'Plant Operations Supervisor',
  },
  dispatcher: {
    id: 'usr-grace-matiku',
    name: 'Grace Matiku',
    email: 'grace.matiku@zamzam.co.tz',
    phone: '+255 754 883 219',
    role: 'dispatcher',
    employeeId: 'ZZ-MWZ-DISP-01',
    plant: 'Mwanza Plant',
    title: 'Fleet & Delivery Dispatcher',
  },
  manager: {
    id: 'usr-aaliyah-salehe',
    name: 'Aaliyah Salehe',
    email: 'aaliyah.salehe@zamzam.co.tz',
    phone: '+255 784 920 114',
    role: 'manager',
    employeeId: 'ZZ-MWZ-MGR-01',
    plant: 'Mwanza Plant',
    title: 'Mwanza Plant General Manager',
  },
  field_staff: {
    id: 'usr-hassan-mwinyi',
    name: 'Hassan Mwinyi',
    email: 'hassan.mwinyi@zamzam.co.tz',
    phone: '+255 712 345 678',
    role: 'field_staff',
    employeeId: 'ZZ-MWZ-FLD-01',
    plant: 'Mwanza Plant',
    title: 'Route Delivery Lead',
  },
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  isFieldStaff: boolean;
  isDispatcher: boolean;
  isSupervisor: boolean;
  isManager: boolean;
  isOfflineMode: boolean;
  isOfflineSession: boolean;
  cachedAccounts: CachedStaffAccount[];
  refreshCachedAccounts: () => Promise<void>;
  login: (email: string, password?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  loginOffline: (identifier: string, passwordOrPin: string) => Promise<{ success: boolean; error?: string }>;
  quickOfflineLogin: (userId: string, pin?: string) => Promise<{ success: boolean; error?: string }>;
  setOfflinePin: (pin: string) => Promise<boolean>;
  loginWithBiometrics: (targetEmail?: string) => Promise<{ success: boolean; error?: string }>;
  registerBiometrics: (deviceLabel?: string) => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  signUp: (name: string, email: string, phone: string, password?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  setRole: (role: UserRole) => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  switchMwanzaPreset: (presetKey: 'supervisor' | 'dispatcher' | 'manager' | 'field_staff') => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'zamzam_authenticated_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOfflineSession, setIsOfflineSession] = useState<boolean>(() => {
    return offlineAuthService.getPersistedSession()?.isOffline ?? false;
  });

  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  const [cachedAccounts, setCachedAccounts] = useState<CachedStaffAccount[]>([]);

  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check if user was previously authenticated and saved
    try {
      const persisted = offlineAuthService.getPersistedSession();
      if (persisted && persisted.user && persisted.user.id) {
        return persisted.user;
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email) {
          return {
            ...parsed,
            plant: parsed.plant || 'Mwanza Plant',
          };
        }
      }
    } catch {
      // ignore
    }
    // Default primary profile: Noah Philemon (Supervisor - Mwanza Plant)
    return MWANZA_PLANT_ROSTER.supervisor;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Hydrate cached accounts from local vault
  const refreshCachedAccounts = useCallback(async () => {
    try {
      const accounts = await offlineAuthService.getCachedAccounts();
      setCachedAccounts(accounts);
    } catch (err) {
      console.warn('Failed to refresh cached accounts:', err);
    }
  }, []);

  useEffect(() => {
    refreshCachedAccounts();
  }, [refreshCachedAccounts]);

  // Fetch or upsert profile in Supabase database
  const syncUserProfileFromDatabase = useCallback(async (userId: string, email?: string, metadata?: any): Promise<UserProfile | null> => {
    try {
      // 1. Try querying the 'profiles' table
      const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile && !dbError) {
        const syncedUser: UserProfile = {
          id: profile.id,
          name: profile.full_name || profile.name || metadata?.full_name || email?.split('@')[0] || 'Staff User',
          email: profile.email || email || '',
          phone: profile.phone || metadata?.phone || '',
          role: (profile.role as UserRole) || (metadata?.role as UserRole) || 'field_staff',
          employeeId: profile.employee_id || metadata?.employee_id || `ZZ-${profile.id.slice(0, 6).toUpperCase()}`,
        };
        return syncedUser;
      }

      // 2. If profile doesn't exist in table yet, create it via upsert
      const generatedEmpId = metadata?.employee_id || `ZZ-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackRole: UserRole = (metadata?.role as UserRole) || 'field_staff';
      const fullName = metadata?.full_name || metadata?.name || email?.split('@')[0] || 'Staff User';
      const phoneNum = metadata?.phone || '';

      const newRecord = {
        id: userId,
        email: email || '',
        full_name: fullName,
        phone: phoneNum,
        role: fallbackRole,
        employee_id: generatedEmpId,
        updated_at: new Date().toISOString(),
      };

      // Attempt database upsert (non-blocking if table is read-only)
      try {
        await supabase.from('profiles').upsert(newRecord);
      } catch {
        // non-blocking
      }

      return {
        id: userId,
        name: fullName,
        email: email || '',
        phone: phoneNum,
        role: fallbackRole,
        employeeId: generatedEmpId,
      };
    } catch (err) {
      console.warn('Database profile sync notice:', err);
      return null;
    }
  }, []);

  // Initialize Supabase Auth session listener
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
        const session = sessionRes?.data?.session;

        if (session?.user) {
          const profile = await syncUserProfileFromDatabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );

          if (isMounted && profile) {
            setUser(profile);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.warn('Initial session check notice:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to real-time auth state changes
    let unsubscribeAuth: (() => void) | null = null;
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await syncUserProfileFromDatabase(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );
          if (isMounted && profile) {
            setUser(profile);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
          }
        }
      });
      unsubscribeAuth = () => authListener?.subscription?.unsubscribe();
    } catch {
      // Supabase auth subscription fallback
    }

    return () => {
      isMounted = false;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [syncUserProfileFromDatabase]);

  // Persist current authenticated user to local storage for offline resilience
  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [user]);

  const role: UserRole = user?.role || 'field_staff';

  // Login implementation with Supabase Auth and database sync, with resilient offline fallback
  const login = async (
    email: string,
    password?: string,
    specifiedRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    const pwd = password || '123456';
    const targetRole = specifiedRole || 'field_staff';

    // 0. If explicitly offline, perform immediate offline vault authentication
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineRes = await offlineAuthService.authenticateOffline(email, pwd);
      if (offlineRes.success && offlineRes.user) {
        setUser(offlineRes.user);
        setIsOfflineSession(true);
        offlineAuthService.savePersistedSession(offlineRes.user, true);
        await refreshCachedAccounts();
        setLoading(false);
        return { success: true };
      } else {
        const errMsg = offlineRes.error || 'Offline credentials verification failed.';
        setError(errMsg);
        setLoading(false);
        return { success: false, error: errMsg };
      }
    }

    try {
      // 1. Authenticate with Supabase Auth when online
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pwd,
      });

      if (!authErr && data?.user) {
        // Sync user profile from remote Supabase database
        const profile = await syncUserProfileFromDatabase(
          data.user.id,
          data.user.email,
          data.user.user_metadata
        );

        const authenticatedProfile: UserProfile = profile || {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          email: data.user.email || email,
          phone: data.user.user_metadata?.phone || '',
          role: (data.user.user_metadata?.role as UserRole) || targetRole,
          employeeId: data.user.user_metadata?.employee_id || `ZZ-${data.user.id.slice(0, 6).toUpperCase()}`,
        };

        setUser(authenticatedProfile);
        setIsOfflineSession(false);
        // Securely cache account into local vault for future offline logins
        await offlineAuthService.cacheAccount(authenticatedProfile, pwd);
        offlineAuthService.savePersistedSession(authenticatedProfile, false);
        await refreshCachedAccounts();
        setLoading(false);
        return { success: true };
      }

      // If remote Supabase rejected with network error or invalid API key or connection timeout
      if (authErr) {
        // Check offline vault first before failing
        const offlineRes = await offlineAuthService.authenticateOffline(email, pwd);
        if (offlineRes.success && offlineRes.user) {
          setUser(offlineRes.user);
          setIsOfflineSession(true);
          offlineAuthService.savePersistedSession(offlineRes.user, true);
          await refreshCachedAccounts();
          setLoading(false);
          return { success: true };
        }

        const msg = authErr.message || 'Authentication failed';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      // Network failure or unreachable backend: fallback to offline vault
      const offlineRes = await offlineAuthService.authenticateOffline(email, pwd);
      if (offlineRes.success && offlineRes.user) {
        setUser(offlineRes.user);
        setIsOfflineSession(true);
        offlineAuthService.savePersistedSession(offlineRes.user, true);
        await refreshCachedAccounts();
        setLoading(false);
        return { success: true };
      }

      const errMsg = err?.message || 'Network error during sign in';
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  // Explicit offline authentication method
  const loginOffline = async (
    identifier: string,
    passwordOrPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    try {
      const res = await offlineAuthService.authenticateOffline(identifier, passwordOrPin);
      if (res.success && res.user) {
        setUser(res.user);
        setIsOfflineSession(true);
        offlineAuthService.savePersistedSession(res.user, true);
        await refreshCachedAccounts();
        setLoading(false);
        return { success: true };
      }
      const err = res.error || 'Offline login failed';
      setError(err);
      setLoading(false);
      return { success: false, error: err };
    } catch (err: any) {
      const msg = err?.message || 'Offline authentication error';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  // Quick 1-tap/PIN offline login from cached staff roster
  const quickOfflineLogin = async (
    userId: string,
    pin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    try {
      const res = await offlineAuthService.quickLoginOffline(userId, pin);
      if (res.success && res.user) {
        setUser(res.user);
        setIsOfflineSession(true);
        offlineAuthService.savePersistedSession(res.user, true);
        await refreshCachedAccounts();
        setLoading(false);
        return { success: true };
      }
      const err = res.error || 'Quick offline login failed';
      setError(err);
      setLoading(false);
      return { success: false, error: err };
    } catch (err: any) {
      const msg = err?.message || 'Quick login error';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  // Set offline 4-digit PIN for rapid field login
  const setOfflinePin = async (pin: string): Promise<boolean> => {
    if (!user) return false;
    const ok = await offlineAuthService.setOfflinePin(user.id, pin);
    if (ok) {
      await refreshCachedAccounts();
    }
    return ok;
  };

  // Biometric / WebAuthn Sign In
  const loginWithBiometrics = async (
    targetEmail?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    try {
      const result = await webAuthnService.authenticateWithBiometrics(targetEmail);

      if (!result.success || !result.user) {
        const err = result.error || 'Biometric authentication was cancelled or failed.';
        setError(err);
        setLoading(false);
        return { success: false, error: err };
      }

      setUser(result.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(result.user));
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Biometric authentication error.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  // Biometric / WebAuthn Registration
  const registerBiometrics = async (
    deviceLabel?: string
  ): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be signed in to register biometric credentials.',
      };
    }

    try {
      const result = await webAuthnService.registerBiometricCredential(user, deviceLabel);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, credential: result.credential };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Biometric registration encountered an error.',
      };
    }
  };

  // Sign up implementation with Supabase Auth and database insert
  const signUp = async (
    name: string,
    email: string,
    phone: string,
    password?: string,
    selectedRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    const pwd = password || '123456';
    const targetRole = selectedRole || 'field_staff';
    const employeeId = `ZZ-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Register with Supabase Auth
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: pwd,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            role: targetRole,
            employee_id: employeeId,
          },
        },
      });

      const userId = data?.user?.id || 'usr-' + Date.now().toString(36);

      // 2. Insert into Supabase database 'profiles' table
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          email: email.trim(),
          full_name: name.trim(),
          phone: phone.trim(),
          role: targetRole,
          employee_id: employeeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Database profiles insert notice:', dbErr);
      }

      const newUser: UserProfile = {
        id: userId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: targetRole,
        employeeId,
      };

      setUser(newUser);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      // Fallback create local user
      const newUser: UserProfile = {
        id: 'usr-' + Date.now().toString(36),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: targetRole,
        employeeId,
      };
      setUser(newUser);
      setLoading(false);
      return { success: true };
    }
  };

  // Switch role and sync with Supabase database
  const setRole = async (newRole: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);

      // Update in Supabase database
      try {
        await supabase
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Database role update notice:', err);
      }
    }
  };

  // Update profile details and sync with Supabase database
  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updated };
    setUser(updatedUser);

    // Update in Supabase database
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: updated.name ?? user.name,
          phone: updated.phone ?? user.phone,
          role: updated.role ?? user.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (err) {
      console.warn('Database profile update notice:', err);
    }
  };

  // Fast switch to official Mwanza Plant roster members
  const switchMwanzaPreset = async (presetKey: 'supervisor' | 'dispatcher' | 'manager' | 'field_staff') => {
    const selected = MWANZA_PLANT_ROSTER[presetKey];
    if (selected) {
      setUser(selected);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(selected));
      await offlineAuthService.cacheAccount(selected, '123456', '1234');
      offlineAuthService.savePersistedSession(selected, isOfflineMode);
      await refreshCachedAccounts();
    }
  };

  // Sign out from Supabase Auth and clear local session while preserving offline account vault
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setUser(null);
      setIsOfflineSession(false);
      offlineAuthService.clearPersistedSession();
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem('zamzam_current_user');
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        isFieldStaff: role === 'field_staff',
        isDispatcher: role === 'dispatcher' || role === 'supervisor' || role === 'manager',
        isSupervisor: role === 'supervisor' || role === 'manager',
        isManager: role === 'manager',
        isOfflineMode,
        isOfflineSession,
        cachedAccounts,
        refreshCachedAccounts,
        login,
        loginOffline,
        quickOfflineLogin,
        setOfflinePin,
        loginWithBiometrics,
        registerBiometrics,
        signUp,
        setRole,
        updateProfile,
        switchMwanzaPreset,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

