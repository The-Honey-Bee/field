import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, CachedStaffAccount } from '../types';
import {
  webAuthnService,
  getBiometricPlatformLabel,
  isMobileDevice,
  getMobileDeviceInfo,
} from '../services/webauthn';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Fingerprint,
  Smartphone,
  CheckCircle2,
  Wifi,
  WifiOff,
  Shield,
  ShieldCheck,
  KeyRound,
  Building2,
  ChevronRight,
  Check,
  HardDrive,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

type AuthTab = 'signin' | 'roster' | 'signup';

export const AuthScreen: React.FC = () => {
  const {
    login,
    loginOffline,
    quickOfflineLogin,
    loginWithBiometrics,
    signUp,
    loading,
    error,
    clearError,
    isOfflineMode,
    cachedAccounts,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('field_staff');
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Quick PIN modal for roster login
  const [selectedRosterUser, setSelectedRosterUser] = useState<CachedStaffAccount | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [isPinLoading, setIsPinLoading] = useState<boolean>(false);

  // Biometric & Mobile state
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [hasRegisteredBiometrics, setHasRegisteredBiometrics] = useState<boolean>(false);
  const [platformLabel, setPlatformLabel] = useState<string>('Biometric');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof getMobileDeviceInfo>>({
    isMobile: false,
    os: 'other',
    deviceModel: 'Device',
    biometricType: 'Biometric Sensor',
    label: 'Biometrics',
  });

  useEffect(() => {
    const checkBiometrics = async () => {
      const supported = webAuthnService.isSupported();
      const hasHardware = await webAuthnService.isPlatformAuthenticatorAvailable();
      setIsBiometricSupported(supported && hasHardware);
      setHasRegisteredBiometrics(webAuthnService.hasRegisteredCredentials());
      setPlatformLabel(getBiometricPlatformLabel());
      setIsMobile(isMobileDevice());
      setDeviceInfo(getMobileDeviceInfo());
    };
    checkBiometrics();
  }, []);

  const handleBiometricSignIn = async () => {
    setLocalMsg(null);
    setLocalSuccessMsg(null);
    clearError();
    setIsBiometricLoading(true);

    try {
      const target = email.trim() || undefined;
      const res = await loginWithBiometrics(target);

      if (res.success) {
        setLocalSuccessMsg('Biometric authentication verified! Opening dashboard...');
      } else {
        setLocalMsg(res.error || 'Biometric verification cancelled or unavailable.');
      }
    } catch (err: any) {
      setLocalMsg(err?.message || 'Biometric sensor error.');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);
    setLocalSuccessMsg(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalMsg('Please provide both email/Employee ID and password/PIN.');
      return;
    }

    if (activeTab === 'signup') {
      if (!name.trim()) {
        setLocalMsg('Please enter your full name.');
        return;
      }
      const res = await signUp(name, email, phone, password, selectedRole);
      if (!res.success && res.error) {
        setLocalMsg(res.error);
      }
    } else {
      // If offline, use loginOffline; if online, login handles online with offline fallback
      let res;
      if (isOfflineMode) {
        res = await loginOffline(email, password);
      } else {
        res = await login(email, password, selectedRole);
      }

      if (!res.success && res.error) {
        setLocalMsg(res.error);
      }
    }
  };

  const handleRosterSelect = (account: CachedStaffAccount) => {
    setSelectedRosterUser(account);
    setPinInput('');
    setLocalMsg(null);
  };

  const handleQuickPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRosterUser) return;

    setIsPinLoading(true);
    setLocalMsg(null);
    clearError();

    try {
      const res = await quickOfflineLogin(selectedRosterUser.id, pinInput || undefined);
      if (res.success) {
        setLocalSuccessMsg(`Authenticated as ${selectedRosterUser.name}! Loading station...`);
      } else {
        setLocalMsg(res.error || 'Invalid PIN or credentials.');
      }
    } catch (err: any) {
      setLocalMsg(err?.message || 'Offline login error.');
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleFastBypassLogin = async (account: CachedStaffAccount) => {
    setIsPinLoading(true);
    setLocalMsg(null);
    clearError();

    try {
      const res = await quickOfflineLogin(account.id, '1234');
      if (res.success) {
        setLocalSuccessMsg(`Authenticated as ${account.name}! Loading station...`);
      } else {
        setSelectedRosterUser(account);
      }
    } catch (err: any) {
      setLocalMsg(err?.message || 'Login error.');
    } finally {
      setIsPinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1A0F] text-[#D0E8F0] flex flex-col items-center justify-center p-4 relative font-sans">
      {/* Top Bar with Sunlight Mode Switch */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="compact" showLabel={true} />
      </div>

      <div className="max-w-md w-full space-y-5">
        {/* Brand Logo & Name */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-2.5 rounded-2xl bg-[#122010] border border-[#2A5038] shadow-xl">
            <img
              src="/assets/images/Picture1-1789308473747.png"
              alt="Zamzam Logo"
              className="h-12 w-auto object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
            ZAMZAM FIELD
          </h1>
          <p className="text-xs text-[#8899AA]">
            Mwanza Operations • Offline Vault & Dispatch System
          </p>

          {/* Real-time Network Status & Vault Badge */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {isOfflineMode ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-medium animate-pulse">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Field Mode • Local Vault Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online • Cloud Synchronization Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Auth Box */}
        <div className="bg-[#122010] p-5 sm:p-6 rounded-2xl border border-[#2A5038] shadow-2xl space-y-4">
          {/* Navigation Tabs */}
          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setSelectedRosterUser(null);
                setLocalMsg(null);
                setLocalSuccessMsg(null);
                clearError();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'signin' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Staff Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('roster');
                setSelectedRosterUser(null);
                setLocalMsg(null);
                setLocalSuccessMsg(null);
                clearError();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'roster' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              <span>Field Roster</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-500/30">
                Offline
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setSelectedRosterUser(null);
                setLocalMsg(null);
                setLocalSuccessMsg(null);
                clearError();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'signup' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {(error || localMsg) && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error || localMsg}</span>
            </div>
          )}

          {localSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{localSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: STANDARD STAFF SIGN IN */}
          {activeTab === 'signin' && (
            <div className="space-y-4">
              {/* WebAuthn Biometric Instant Sign In */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-biometric-login"
                  onClick={handleBiometricSignIn}
                  disabled={loading || isBiometricLoading}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-[#006B3C] via-[#008F50] to-[#00C46A] hover:from-[#008F50] hover:to-[#00D674] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-[#006B3C]/30 border border-[#00C46A]/40 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isBiometricLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0A1A0F]" />
                      <span className="text-[#0A1A0F] font-extrabold">Verifying Sensor ({platformLabel})...</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1 rounded-lg bg-black/20 text-white">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <span className="text-white font-bold tracking-wide">
                        Quick Sensor Sign-in {isOfflineMode && '(Offline Enabled)'}
                      </span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#243447]"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-[#8899AA] uppercase tracking-wider">
                    Or sign in with password / PIN
                  </span>
                  <div className="flex-grow border-t border-[#243447]"></div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-[#8899AA] block mb-1">
                    Staff Email or Employee ID
                  </label>
                  <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                    <Mail className="w-4 h-4 text-[#8899AA]" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. hassan.mwinyi@zamzam.co.tz or ZZ-MWZ-FLD-01"
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#8899AA] block mb-1">
                    Password or 4-Digit Offline PIN
                  </label>
                  <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                    <Lock className="w-4 h-4 text-[#8899AA]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• or PIN 1234"
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-[#8899AA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-[#00C46A]"
                    />
                    <span>Keep me signed in offline</span>
                  </label>
                  <span className="text-[11px] text-[#00C46A] cursor-pointer hover:underline" onClick={() => setActiveTab('roster')}>
                    Fast Roster Picker →
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isOfflineMode ? 'Verifying Local Vault...' : 'Authenticating Session...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isOfflineMode ? 'Sign In (Offline Vault)' : 'Authenticate Session'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: FIELD ROSTER / OFFLINE QUICK SIGN-IN */}
          {activeTab === 'roster' && (
            <div className="space-y-3">
              <div className="bg-[#1A2E1C]/60 border border-[#2A5038] p-2.5 rounded-xl text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00C46A] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#D0E8F0] leading-tight">
                  <strong className="text-white">Mwanza Plant Field Vault:</strong> Tap your profile card for instant 1-tap or 4-digit PIN access without cellular data or Wi-Fi. Default PIN is <code className="text-[#00C46A] font-mono font-bold">1234</code>.
                </p>
              </div>

              {/* Cached Staff Cards */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {cachedAccounts.map((account) => {
                  const isSelected = selectedRosterUser?.id === account.id;
                  const roleBadgeColor =
                    account.role === 'field_staff'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : account.role === 'dispatcher'
                      ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                      : account.role === 'supervisor'
                      ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                      : 'bg-amber-950 text-amber-300 border-amber-500/40';

                  return (
                    <div
                      key={account.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#1A3320] border-[#00C46A] shadow-md'
                          : 'bg-[#162719] border-[#2A5038] hover:border-[#3A6048]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer flex-1"
                          onClick={() => handleRosterSelect(account)}
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#006B3C]/40 border border-[#00C46A]/40 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {account.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white">{account.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono font-semibold ${roleBadgeColor}`}>
                                {account.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#8899AA] flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[#00C46A]">{account.employeeId}</span>
                              <span>•</span>
                              <span>{account.plant || 'Mwanza Plant'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleFastBypassLogin(account)}
                            disabled={isPinLoading}
                            className="bg-[#006B3C] hover:bg-[#008F50] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-all active:scale-95"
                          >
                            <span>1-Tap</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded PIN form if selected */}
                      {isSelected && (
                        <form onSubmit={handleQuickPinSubmit} className="mt-3 pt-3 border-t border-[#2A5038] flex items-center gap-2 animate-fade-in">
                          <KeyRound className="w-4 h-4 text-[#00C46A] shrink-0" />
                          <input
                            type="password"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="Enter 4-Digit PIN (Default: 1234)"
                            autoFocus
                            className="flex-1 bg-[#1A2E1C] border border-[#3A5068] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C46A]"
                          />
                          <button
                            type="submit"
                            disabled={isPinLoading}
                            className="bg-[#00C46A] text-[#0A1A0F] font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1"
                          >
                            {isPinLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Enter</span>
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: REGISTER NEW ACCOUNT */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Full Name</label>
                <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                  <User className="w-4 h-4 text-[#8899AA]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Salim Bakari"
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Phone Number</label>
                <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                  <Phone className="w-4 h-4 text-[#8899AA]" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Email</label>
                <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                  <Mail className="w-4 h-4 text-[#8899AA]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@zamzam.co.tz"
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Password</label>
                <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                  <Lock className="w-4 h-4 text-[#8899AA]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Operational Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
                >
                  <option value="field_staff">Field Staff (Mobile Route Delivery)</option>
                  <option value="dispatcher">Dispatcher (Fleet & Routing)</option>
                  <option value="supervisor">Supervisor (Plant Operations & Approvals)</option>
                  <option value="manager">Operations Manager (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Seed Offline Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Offline Persistence Guarantee Footer */}
          <div className="pt-2 border-t border-[#243447]/60 flex items-center gap-2 text-[10px] text-[#8899AA]">
            <HardDrive className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
            <span>Dual-Layer Offline Persistence: IndexedDB primary + LocalStorage vault.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
