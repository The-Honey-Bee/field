import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UKFlag, TanzaniaFlag } from '../components/FlagIcons';
import { storageService } from '../services/storage';
import {
  webAuthnService,
  getBiometricPlatformLabel,
  isMobileDevice,
  getMobileDeviceInfo,
} from '../services/webauthn';
import { BiometricCredential, UserRole } from '../types';
import {
  User,
  KeyRound,
  Bell,
  HardDrive,
  LogOut,
  CheckCircle2,
  RefreshCw,
  Shield,
  Smartphone,
  Fingerprint,
  Trash2,
  AlertCircle,
  Sparkles,
  Sun,
  ShieldCheck,
  Check,
  AlertTriangle,
  X,
  Globe,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

interface AccountManagementScreenProps {
  onNavigate: (view: string) => void;
}

export const AccountManagementScreen: React.FC<AccountManagementScreenProps> = ({ onNavigate }) => {
  const { user, role, setRole, updateProfile, registerBiometrics, logout } = useAuth();
  const { language, setLanguage, isSwahili } = useLanguage();
  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');

  // Notifications
  const [notifDelivery, setNotifDelivery] = useState<boolean>(true);
  const [notifSync, setNotifSync] = useState<boolean>(true);
  const [notifApproval, setNotifApproval] = useState<boolean>(true);
  const [notifMessage, setNotifMessage] = useState<boolean>(true);

  // Storage
  const [storageLimit, setStorageLimit] = useState<number>(100);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Biometric / WebAuthn State
  const [biometricsSupported, setBiometricsSupported] = useState<boolean>(false);
  const [platformLabel, setPlatformLabel] = useState<string>('Biometric Sensor');
  const [registeredCredentials, setRegisteredCredentials] = useState<BiometricCredential[]>([]);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [deviceNick, setDeviceNick] = useState<string>('');
  const [biometricFeedback, setBiometricFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof getMobileDeviceInfo>>({
    isMobile: false,
    os: 'other',
    deviceModel: 'Mobile Phone',
    biometricType: 'Fingerprint / Face ID',
    label: 'Mobile Sensor',
  });

  useEffect(() => {
    const checkPlatform = async () => {
      const supported = webAuthnService.isSupported();
      const hasHardware = await webAuthnService.isPlatformAuthenticatorAvailable();
      setBiometricsSupported(supported && hasHardware);
      setPlatformLabel(getBiometricPlatformLabel());
      setIsMobile(isMobileDevice());
      setDeviceInfo(getMobileDeviceInfo());
      refreshCredentials();
    };
    checkPlatform();
  }, [user]);

  const refreshCredentials = () => {
    if (user?.id) {
      const list = webAuthnService.getCredentials(user.id);
      setRegisteredCredentials(list);
    } else {
      setRegisteredCredentials(storageService.getBiometricCredentials());
    }
  };

  const handleEnrollBiometrics = async () => {
    if (!user) return;
    setIsEnrolling(true);
    setBiometricFeedback(null);

    const defaultLabel = deviceNick.trim() || `${platformLabel} (${new Date().toLocaleDateString()})`;
    const res = await registerBiometrics(defaultLabel);

    if (res.success) {
      setBiometricFeedback({
        text: `Successfully enrolled ${defaultLabel}! You can now use biometric one-tap sign in.`,
        isError: false,
      });
      setDeviceNick('');
      refreshCredentials();
    } else {
      setBiometricFeedback({
        text: res.error || 'Biometric enrollment failed or was cancelled.',
        isError: true,
      });
    }
    setIsEnrolling(false);
  };

  const handleTestBiometrics = async () => {
    if (!user) return;
    setIsTesting(true);
    setBiometricFeedback(null);

    const res = await webAuthnService.authenticateWithBiometrics(user.email);
    if (res.success) {
      setBiometricFeedback({
        text: `Biometric sensor test passed! Authenticated as ${res.user?.name || user.name}.`,
        isError: false,
      });
    } else {
      setBiometricFeedback({
        text: res.error || 'Biometric verification test failed.',
        isError: true,
      });
    }
    setIsTesting(false);
  };

  const handleRemoveCredential = (credId: string) => {
    if (confirm('Remove this biometric credential from device?')) {
      webAuthnService.removeCredential(credId);
      refreshCredentials();
      setBiometricFeedback({
        text: 'Biometric credential removed successfully.',
        isError: false,
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, phone });
    setFeedback('Profile details updated successfully');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleClearCache = () => {
    if (confirm('Clear local offline cached records?')) {
      localStorage.removeItem('zamzam_offline_queue');
      setFeedback('Offline buffer cleared');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleForceSync = async () => {
    try {
      const synced = await storageService.syncPendingQueue();
      setFeedback(`Force sync complete (${synced} records pushed)`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('Sync failed: currently offline');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="border-b border-[#243447] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#00C46A]" />
          <span>Account & Device Preferences</span>
        </h1>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Manage staff profile credentials, notification alerts, and offline caching parameters.
        </p>
      </div>

      {feedback && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-3 rounded-xl flex items-center gap-2 text-xs text-white animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Profile Details */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00C46A]" />
          <span>Operator Identity</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Employee ID</label>
              <input
                type="text"
                disabled
                value={user?.employeeId || 'ZZ-2024-001'}
                className="w-full bg-[#142416] border border-[#243447] rounded-xl px-3.5 py-2 text-xs text-[#8899AA] font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#006B3C] hover:bg-[#008F50] text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              {isSwahili ? 'Sasisha Taarifa' : 'Update Information'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Language & Regional Localization (EN / SW) */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243447] pb-3">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00C46A]" />
              <span>{isSwahili ? 'Lugha na Eneo' : 'Language & Regional Localization'}</span>
            </h2>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              {isSwahili
                ? 'Chagua lugha inayotumiwa kwenye mfumo mzima (Kiingereza au Kiswahili).'
                : 'Select the operational language used throughout navigation, forms, and dispatch reports.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A2E1C] border border-[#3A5068] text-xs font-mono text-[#00C46A]">
            <span className="text-[10px] text-[#8899AA]">Variable:</span>
            <span className="font-bold">isSwahili = {isSwahili ? 'true' : 'false'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* English Option */}
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              language === 'en'
                ? 'bg-[#006B3C]/20 border-[#00C46A] shadow-md ring-1 ring-[#00C46A]/50'
                : 'bg-[#1A2E1C]/60 border-[#3A5068]/60 hover:bg-[#1A2E1C] hover:border-[#3A5068]'
            }`}
          >
            <div className="flex items-center gap-3">
              <UKFlag className="w-7 h-5" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>English (EN)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                    United Kingdom
                  </span>
                </div>
                <div className="text-[11px] text-[#8899AA] mt-0.5">International English</div>
              </div>
            </div>
            {language === 'en' && <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />}
          </button>

          {/* Kiswahili Option */}
          <button
            type="button"
            onClick={() => setLanguage('sw')}
            className={`p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              language === 'sw'
                ? 'bg-[#006B3C]/20 border-[#00C46A] shadow-md ring-1 ring-[#00C46A]/50'
                : 'bg-[#1A2E1C]/60 border-[#3A5068]/60 hover:bg-[#1A2E1C] hover:border-[#3A5068]'
            }`}
          >
            <div className="flex items-center gap-3">
              <TanzaniaFlag className="w-7 h-5" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Kiswahili (SW)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00C46A]/20 text-[#00C46A] font-mono">
                    Tanzania
                  </span>
                </div>
                <div className="text-[11px] text-[#8899AA] mt-0.5">Lugha ya Kiswahili Sanifu</div>
              </div>
            </div>
            {language === 'sw' && <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />}
          </button>
        </div>
      </div>

      {/* 3. Operational Role Switcher */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243447] pb-3">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00C46A]" />
              <span>{isSwahili ? 'Wadhifa wa Uendeshaji' : 'Operational Role & Access Tier'}</span>
            </h2>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              {isSwahili
                ? 'Badilisha wadhifa wako wa kufanya kazi ili kupata idhini husika.'
                : 'Switch your active operational privilege tier to test or execute role-specific duties.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['field_staff', 'supervisor', 'manager'] as UserRole[]).map((r) => {
            const isActive = role === r;
            const labels = {
              field_staff: { title: isSwahili ? 'Mfanyakazi wa Nyanjani' : 'Field Staff', desc: isSwahili ? 'Mauzo na usambazaji' : 'Deliveries, POS & EOD' },
              supervisor: { title: isSwahili ? 'Msimamizi wa Eneo' : 'Supervisor', desc: isSwahili ? 'Idhini ya maagizo na timu' : 'Approvals & Live Map' },
              manager: { title: isSwahili ? 'Meneja wa Uendeshaji' : 'Manager', desc: isSwahili ? 'Takwimu kamili na stoo' : 'Full Analytics & Control' },
            };
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-[#006B3C]/20 border-[#00C46A] shadow-md ring-1 ring-[#00C46A]/50'
                    : 'bg-[#1A2E1C]/60 border-[#3A5068]/60 hover:bg-[#1A2E1C]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-[#00C46A]' : 'text-white'}`}>
                    {labels[r].title}
                  </span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00C46A]" />}
                </div>
                <p className="text-[11px] text-[#8899AA] mt-1">{labels[r].desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. WebAuthn Biometric & Passkey Security */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243447] pb-3">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[#00C46A]" />
              <span>Biometric & WebAuthn Passkeys</span>
            </h2>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              Authenticate rapidly in the field using device fingerprint, Face ID, or Windows Hello.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                biometricsSupported
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>
                {biometricsSupported
                  ? `${isMobile ? deviceInfo.deviceModel : platformLabel} Supported`
                  : 'Platform Sensor Not Detected'}
              </span>
            </span>
          </div>
        </div>

        {/* Mobile Phone Biometrics Status Banner */}
        <div className="bg-[#1A2E1C] p-3.5 rounded-xl border border-[#3A5068]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/30 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {deviceInfo.deviceModel} Biometrics
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/30 font-semibold uppercase">
                  Mobile Allowed
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA] mt-0.5">
                Sensor: <strong className="text-white">{deviceInfo.biometricType}</strong> &bull; Compatible with Android Fingerprint & Apple Face ID
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setDeviceNick(`${deviceInfo.deviceModel} (${deviceInfo.biometricType})`);
                handleEnrollBiometrics();
              }}
              disabled={isEnrolling}
              className="bg-gradient-to-r from-[#006B3C] to-[#00C46A] hover:from-[#008F50] hover:to-[#00D674] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Enroll This Phone</span>
            </button>
          </div>
        </div>

        {biometricFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
              biometricFeedback.isError
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {biometricFeedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{biometricFeedback.text}</span>
          </div>
        )}

        {/* Registered Biometric Devices List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#D0E8F0] block">
            Enrolled Biometric Credentials ({registeredCredentials.length})
          </label>

          {registeredCredentials.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#1A2E1C]/60 border border-[#3A5068]/40 text-center space-y-1">
              <Fingerprint className="w-8 h-8 text-[#8899AA] mx-auto opacity-50" />
              <p className="text-xs font-medium text-white">No biometrics enrolled on this device</p>
              <p className="text-[11px] text-[#8899AA]">
                Register your fingerprint or Face ID below for ultra-fast, secure sign in while operating delivery trucks.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {registeredCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1A2E1C] border border-[#3A5068]/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{cred.deviceLabel || 'Field Staff Authenticator'}</span>
                        <span className="text-[9px] bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                          Active
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8899AA] flex items-center gap-2 mt-0.5">
                        <span>Enrolled: {new Date(cred.createdAt).toLocaleDateString()}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-[9px] text-[#64748B]">
                          ID: {cred.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCredential(cred.id)}
                    title="Remove credential"
                    className="p-1.5 text-[#8899AA] hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enrollment & Testing Controls */}
        <div className="pt-2 border-t border-[#243447]/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder={`Device nickname (e.g. Staff Handheld / ${platformLabel})`}
                value={deviceNick}
                onChange={(e) => setDeviceNick(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <button
              type="button"
              id="btn-enroll-biometric"
              onClick={handleEnrollBiometrics}
              disabled={isEnrolling}
              className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-60"
            >
              {isEnrolling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enroll Device</span>
                </>
              )}
            </button>
          </div>

          {registeredCredentials.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#8899AA]">
                Verify sensor responsiveness before starting your shift:
              </span>
              <button
                type="button"
                id="btn-test-biometric"
                onClick={handleTestBiometrics}
                disabled={isTesting}
                className="text-xs text-[#00C46A] hover:text-[#008F50] font-semibold flex items-center gap-1 bg-[#1A2E1C] hover:bg-[#223B25] px-3 py-1.5 rounded-lg border border-[#3A5068] transition-colors"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Fingerprint className="w-3.5 h-3.5" />
                )}
                <span>Test Biometric Sensor</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Display & Environment Contrast (Sunlight vs Dark Mode) */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243447] pb-3">
          <div>
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#00C46A]" />
              <span>Display & Environment Contrast</span>
            </h2>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              Switch display modes based on working environment: high-contrast sunlight for street deliveries, or dark theme for night and warehouse shifts.
            </p>
          </div>
        </div>

        <ThemeToggle variant="card" />

        <div className="p-3 bg-[#1A2E1C] rounded-xl border border-[#3A5068]/40 text-[11px] text-[#8899AA] space-y-1">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
            Quick Toggle Shortcut Available Everywhere:
          </span>
          <p>
            You can also toggle between Outdoor Sunlight Mode and Dark Mode instantly from the top navigation bar at any time without navigating to this screen.
          </p>
        </div>
      </div>

      {/* 4. Notification Preferences */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00C46A]" />
          <span>Operational Push Notifications</span>
        </h2>

        <div className="space-y-3">
          {[
            { label: 'Delivery Route Alerts', desc: 'Real-time next stop notifications and route changes', state: notifDelivery, set: setNotifDelivery },
            { label: 'Database Sync Feedback', desc: 'Alerts when offline orders sync successfully', state: notifSync, set: setNotifSync },
            { label: 'Supervisor Approvals', desc: 'Instant status changes for your submitted orders', state: notifApproval, set: setNotifApproval },
            { label: 'Field Chat Messages', desc: 'Notifications for incoming dispatch messages', state: notifMessage, set: setNotifMessage },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#1A2E1C] border border-[#3A5068]/40">
              <div>
                <div className="text-xs font-bold text-white">{item.label}</div>
                <div className="text-[10px] text-[#8899AA]">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={item.state}
                onChange={(e) => item.set(e.target.checked)}
                className="w-4 h-4 accent-[#00C46A] cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Offline Storage & Cache */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#00C46A]" />
          <span>Offline Buffer & Cache Management</span>
        </h2>

        <div className="p-3 bg-[#1A2E1C] rounded-xl border border-[#3A5068]/40 space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#8899AA]">Offline Queue Limit:</span>
            <span className="font-mono text-white font-bold">{storageLimit} MB</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleForceSync}
              className="flex-1 py-2 bg-[#006B3C] hover:bg-[#008F50] text-white rounded-xl font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Sync Queue</span>
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 border border-[#3A5068] text-[#8899AA] hover:text-white rounded-xl font-semibold"
            >
              Clear Buffer
            </button>
          </div>
        </div>
      </div>

      {/* 4. Log Out */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          id="btn-signout-trigger"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 p-3 rounded-xl border border-red-900/40 hover:bg-red-950/40 transition-colors shadow-sm active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Session</span>
        </button>
      </div>

      {/* Logout Confirmation Dialog Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div
            className="bg-[#122010] border border-red-900/60 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#2A5038] flex items-center justify-between bg-red-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="logout-dialog-title" className="text-sm font-bold text-white">
                    Confirm Sign Out
                  </h3>
                  <span className="text-[11px] text-[#8899AA]">
                    End current field staff session
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-8 h-8 rounded-lg bg-[#1A2E1C] hover:bg-[#253D28] text-[#8899AA] hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-[#D0E8F0] leading-relaxed">
                Are you sure you want to sign out? You will need your password or enrolled biometric passkey to log back in.
              </p>

              {/* Staff Profile Card */}
              <div className="p-3 bg-[#1A2E1C] rounded-xl border border-[#3A5068]/40 space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{user?.name || 'Field Staff'}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/30">
                    {user?.role || 'operator'}
                  </span>
                </div>
                <div className="text-[11px] text-[#8899AA]">
                  ID: <span className="font-mono text-white">{user?.employeeId || 'N/A'}</span> &bull; {user?.email}
                </div>
              </div>

              {/* Offline buffer notice if pending items exist */}
              {(() => {
                const pendingCount = storageService.getPendingSyncCount();
                if (pendingCount > 0) {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-[11px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Notice: You have <strong>{pendingCount} unsynced record{pendingCount > 1 ? 's' : ''}</strong> in device storage. They will be preserved locally and will sync once reconnected.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#2A5038] bg-[#0A1A0F]/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-cancel-logout"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8899AA] hover:text-white bg-[#1A2E1C] hover:bg-[#253D28] border border-[#3A5068] transition-all"
              >
                Cancel & Stay Signed In
              </button>

              <button
                type="button"
                id="btn-confirm-logout"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
