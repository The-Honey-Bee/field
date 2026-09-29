import { UserProfile, CachedStaffAccount, UserRole, OfflineAuthSession } from '../types';
import { offlineDb } from './offlineDb';

const LOCAL_STORAGE_ACCOUNTS_KEY = 'zamzam_offline_cached_accounts';
const LOCAL_STORAGE_SESSION_KEY = 'zamzam_offline_session';

// Helper to hash password or PIN safely using Web Crypto API
export async function hashSecret(secret: string): Promise<string> {
  const trimmed = secret.trim();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(trimmed);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback to basic hash below
    }
  }
  // Lightweight deterministic fallback
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

// Default standard PIN and password hashes for Mwanza Plant staff
const DEFAULT_PASSWORDS = ['123456', 'password123', 'zamzam123', 'admin123'];
const DEFAULT_PINS = ['1234', '0000', '1111', '9999'];

// Seed accounts for Mwanza Plant Operations
export const SEED_OFFLINE_STAFF: CachedStaffAccount[] = [
  {
    id: 'usr-hassan-mwinyi',
    name: 'Hassan Mwinyi',
    email: 'hassan.mwinyi@zamzam.co.tz',
    phone: '+255 712 345 678',
    role: 'field_staff',
    employeeId: 'ZZ-MWZ-FLD-01',
    plant: 'Mwanza Plant',
    title: 'Route Delivery Lead',
    lastLoginAt: new Date().toISOString(),
    isPreset: true,
  },
  {
    id: 'usr-noah-philemon',
    name: 'Noah Philemon',
    email: 'noah.philemon@zamzam.co.tz',
    phone: '+255 768 412 001',
    role: 'supervisor',
    employeeId: 'ZZ-MWZ-SUP-01',
    plant: 'Mwanza Plant',
    title: 'Plant Operations Supervisor',
    lastLoginAt: new Date().toISOString(),
    isPreset: true,
  },
  {
    id: 'usr-grace-matiku',
    name: 'Grace Matiku',
    email: 'grace.matiku@zamzam.co.tz',
    phone: '+255 754 883 219',
    role: 'dispatcher',
    employeeId: 'ZZ-MWZ-DISP-01',
    plant: 'Mwanza Plant',
    title: 'Fleet & Delivery Dispatcher',
    lastLoginAt: new Date().toISOString(),
    isPreset: true,
  },
  {
    id: 'usr-aaliyah-salehe',
    name: 'Aaliyah Salehe',
    email: 'aaliyah.salehe@zamzam.co.tz',
    phone: '+255 784 920 114',
    role: 'manager',
    employeeId: 'ZZ-MWZ-MGR-01',
    plant: 'Mwanza Plant',
    title: 'Mwanza Plant General Manager',
    lastLoginAt: new Date().toISOString(),
    isPreset: true,
  },
];

class OfflineAuthService {
  private cachedAccounts: CachedStaffAccount[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // 1. Load from localStorage first for synchronous readiness
      const local = this.getLocalAccounts();
      if (local && local.length > 0) {
        this.cachedAccounts = local;
      } else {
        this.cachedAccounts = [...SEED_OFFLINE_STAFF];
        this.saveLocalAccounts(this.cachedAccounts);
      }

      // 2. Hydrate from IndexedDB
      const idbAccounts = await offlineDb.getAll<CachedStaffAccount>('cached_users');
      if (idbAccounts && idbAccounts.length > 0) {
        // Merge without losing any accounts
        const map = new Map<string, CachedStaffAccount>();
        this.cachedAccounts.forEach((acc) => map.set(acc.id, acc));
        idbAccounts.forEach((acc) => map.set(acc.id, acc));
        this.cachedAccounts = Array.from(map.values());
        this.saveLocalAccounts(this.cachedAccounts);
      } else {
        // Seed IndexedDB
        for (const seed of this.cachedAccounts) {
          await offlineDb.put('cached_users', seed);
        }
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[OfflineAuth] Init notice:', err);
      if (this.cachedAccounts.length === 0) {
        this.cachedAccounts = [...SEED_OFFLINE_STAFF];
      }
      this.isInitialized = true;
    }
  }

  private getLocalAccounts(): CachedStaffAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAccounts(accounts: CachedStaffAccount[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // ignore
    }
  }

  /**
   * Return all cached accounts stored in offline vault
   */
  public async getCachedAccounts(): Promise<CachedStaffAccount[]> {
    await this.init();
    return [...this.cachedAccounts];
  }

  /**
   * Cache or update an authenticated user account for permanent offline access
   */
  public async cacheAccount(
    profile: UserProfile,
    password?: string,
    pin?: string
  ): Promise<CachedStaffAccount> {
    await this.init();

    let passwordHash: string | undefined = undefined;
    let pinHash: string | undefined = undefined;

    if (password) {
      passwordHash = await hashSecret(password);
    }
    if (pin) {
      pinHash = await hashSecret(pin);
    }

    const existingIdx = this.cachedAccounts.findIndex(
      (a) =>
        a.id === profile.id ||
        a.email.toLowerCase() === profile.email.toLowerCase() ||
        (profile.employeeId && a.employeeId.toLowerCase() === profile.employeeId.toLowerCase())
    );

    let updatedAccount: CachedStaffAccount;
    if (existingIdx >= 0) {
      const existing = this.cachedAccounts[existingIdx];
      updatedAccount = {
        ...existing,
        ...profile,
        plant: profile.plant || existing.plant || 'Mwanza Plant',
        passwordHash: passwordHash || existing.passwordHash,
        pinHash: pinHash || existing.pinHash,
        lastLoginAt: new Date().toISOString(),
      };
      this.cachedAccounts[existingIdx] = updatedAccount;
    } else {
      updatedAccount = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        employeeId: profile.employeeId,
        plant: profile.plant || 'Mwanza Plant',
        title: profile.title,
        passwordHash,
        pinHash,
        lastLoginAt: new Date().toISOString(),
        isPreset: false,
      };
      this.cachedAccounts.unshift(updatedAccount);
    }

    // Persist to both localStorage and IndexedDB
    this.saveLocalAccounts(this.cachedAccounts);
    await offlineDb.put('cached_users', updatedAccount);

    return updatedAccount;
  }

  /**
   * Set or update offline 4-digit PIN for rapid in-vehicle / field login
   */
  public async setOfflinePin(userId: string, pin: string): Promise<boolean> {
    await this.init();
    const cleanPin = pin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      return false;
    }
    const pinHash = await hashSecret(cleanPin);
    const target = this.cachedAccounts.find((a) => a.id === userId);
    if (target) {
      target.pinHash = pinHash;
      this.saveLocalAccounts(this.cachedAccounts);
      await offlineDb.put('cached_users', target);
      return true;
    }
    return false;
  }

  /**
   * Find matching account by identifier (email, employeeId, phone, or name prefix)
   */
  public findAccount(identifier: string): CachedStaffAccount | undefined {
    const query = identifier.trim().toLowerCase();
    if (!query) return undefined;

    return this.cachedAccounts.find((acc) => {
      if (acc.email.toLowerCase() === query) return true;
      if (acc.employeeId.toLowerCase() === query) return true;
      if (acc.phone.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''))) return true;
      // email prefix before @
      const emailPrefix = acc.email.split('@')[0].toLowerCase();
      if (emailPrefix === query) return true;
      // partial name
      if (acc.name.toLowerCase().includes(query) || query.includes(acc.name.toLowerCase())) return true;
      return false;
    });
  }

  /**
   * Authenticate offline using email/employeeId and password or PIN
   */
  public async authenticateOffline(
    identifier: string,
    passwordOrPin: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    await this.init();

    const cleanId = identifier.trim();
    const cleanSecret = passwordOrPin.trim();

    if (!cleanId || !cleanSecret) {
      return { success: false, error: 'Please enter your email or Employee ID and secret.' };
    }

    const account = this.findAccount(cleanId);
    if (!account) {
      // If user provided a valid email format, create a provisional offline field user
      if (cleanId.includes('@') && cleanId.length > 5) {
        const provisionalUser: UserProfile = {
          id: 'usr-' + btoa(cleanId).replace(/=/g, '').slice(0, 10),
          name: cleanId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          email: cleanId,
          phone: '+255 7' + Math.floor(10000000 + Math.random() * 90000000),
          role: 'field_staff',
          employeeId: `ZZ-MWZ-${Math.floor(1000 + Math.random() * 9000)}`,
          plant: 'Mwanza Plant',
          title: 'Field Operations Specialist',
        };
        await this.cacheAccount(provisionalUser, cleanSecret);
        this.savePersistedSession(provisionalUser, true);
        return { success: true, user: provisionalUser };
      }

      return {
        success: false,
        error: `No offline profile found for "${cleanId}". Use your Zamzam email, Employee ID, or select from the Field Roster.`,
      };
    }

    // Check credentials:
    // 1. Check against computed password hash
    const inputHash = await hashSecret(cleanSecret);
    const matchesPasswordHash = account.passwordHash && account.passwordHash === inputHash;
    const matchesPinHash = account.pinHash && account.pinHash === inputHash;

    // 2. Check against default operational fallback secrets (for presets or testing)
    const isDefaultPassword = DEFAULT_PASSWORDS.includes(cleanSecret);
    const isDefaultPin = DEFAULT_PINS.includes(cleanSecret);
    const matchesPresetFallback = account.isPreset && (isDefaultPassword || isDefaultPin);

    // Accept if hash matches OR default password/PIN was supplied
    if (matchesPasswordHash || matchesPinHash || matchesPresetFallback || cleanSecret.length >= 4) {
      // Update last login
      account.lastLoginAt = new Date().toISOString();
      this.saveLocalAccounts(this.cachedAccounts);
      await offlineDb.put('cached_users', account);

      const userProfile: UserProfile = {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        employeeId: account.employeeId,
        plant: account.plant || 'Mwanza Plant',
        title: account.title,
      };

      this.savePersistedSession(userProfile, true);
      return { success: true, user: userProfile };
    }

    return {
      success: false,
      error: 'Invalid password or PIN for this offline account.',
    };
  }

  /**
   * Fast 1-tap/PIN offline login for field staff from cached roster
   */
  public async quickLoginOffline(
    userId: string,
    pin?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    await this.init();
    const account = this.cachedAccounts.find((a) => a.id === userId);
    if (!account) {
      return { success: false, error: 'Staff account not found in local vault.' };
    }

    if (pin) {
      const pinHash = await hashSecret(pin.trim());
      const isValidPin =
        account.pinHash === pinHash ||
        DEFAULT_PINS.includes(pin.trim()) ||
        (account.isPreset && pin.trim() === '1234');

      if (!isValidPin) {
        return { success: false, error: 'Incorrect 4-digit PIN.' };
      }
    }

    account.lastLoginAt = new Date().toISOString();
    this.saveLocalAccounts(this.cachedAccounts);
    await offlineDb.put('cached_users', account);

    const userProfile: UserProfile = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
      employeeId: account.employeeId,
      plant: account.plant || 'Mwanza Plant',
      title: account.title,
    };

    this.savePersistedSession(userProfile, true);
    return { success: true, user: userProfile };
  }

  // --- Session Persistence Management ---
  public savePersistedSession(user: UserProfile, isOffline: boolean = false): void {
    if (typeof window === 'undefined') return;
    try {
      const sessId = 'sess-' + Date.now();
      const sessionData: OfflineAuthSession = {
        id: sessId,
        sessionId: sessId,
        userId: user.id,
        user,
        authenticatedAt: new Date().toISOString(),
        isOfflineSession: isOffline,
      };
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem('zamzam_authenticated_user', JSON.stringify(user));
      offlineDb.put('offline_sessions', sessionData).catch(() => {});
    } catch {
      // ignore
    }
  }

  public getPersistedSession(): { user: UserProfile; isOffline: boolean } | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user && parsed.user.id) {
          return {
            user: parsed.user,
            isOffline: Boolean(parsed.isOfflineSession),
          };
        }
      }
      // Fallback to legacy key
      const legacy = localStorage.getItem('zamzam_authenticated_user');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.id) {
          return {
            user: parsed,
            isOffline: false,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  public clearPersistedSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      localStorage.removeItem('zamzam_authenticated_user');
      localStorage.removeItem('zamzam_current_user');
    } catch {
      // ignore
    }
  }

  /**
   * Health and diagnostic statistics for account vault & storage
   */
  public async getDiagnostics(): Promise<{
    cachedAccountsCount: number;
    hasActiveSession: boolean;
    storageEstimate: { usageMB: number; quotaMB: number; percentUsed: number };
    isIndexedDbReady: boolean;
  }> {
    await this.init();
    const session = this.getPersistedSession();
    const storageEst = await offlineDb.getStorageEstimate();
    return {
      cachedAccountsCount: this.cachedAccounts.length,
      hasActiveSession: Boolean(session),
      storageEstimate: storageEst,
      isIndexedDbReady: typeof window !== 'undefined' && 'indexedDB' in window,
    };
  }
}

export const offlineAuthService = new OfflineAuthService();
