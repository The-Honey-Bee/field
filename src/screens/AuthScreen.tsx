import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { webAuthnService, getBiometricPlatformLabel } from '../services/webauthn';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Fingerprint,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const AuthScreen: React.FC = () => {
  const { login, loginWithBiometrics, signUp, loading, error, clearError } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('field_staff');
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [localSuccessMsg, setLocalSuccessMsg] = useState<string | null>(null);

  // Biometric state
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [hasRegisteredBiometrics, setHasRegisteredBiometrics] = useState<boolean>(false);
  const [platformLabel, setPlatformLabel] = useState<string>('Biometric');

  useEffect(() => {
    const checkBiometrics = async () => {
      const supported = webAuthnService.isSupported();
      const hasHardware = await webAuthnService.isPlatformAuthenticatorAvailable();
      setIsBiometricSupported(supported && hasHardware);
      setHasRegisteredBiometrics(webAuthnService.hasRegisteredCredentials());
      setPlatformLabel(getBiometricPlatformLabel());
    };
    checkBiometrics();
  }, []);

  // Check if specific email has biometrics enrolled
  const emailHasBiometrics = email ? webAuthnService.hasRegisteredCredentials(email) : false;

  const handleBiometricSignIn = async () => {
    setLocalMsg(null);
    setLocalSuccessMsg(null);
    clearError();
    setIsBiometricLoading(true);

    try {
      // If user has entered an email, pass it to filter credentials, otherwise try resident or any local credential
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
      setLocalMsg('Please provide both email and password.');
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setLocalMsg('Please enter your full name.');
        return;
      }
      const res = await signUp(name, email, phone, password, selectedRole);
      if (!res.success && res.error) {
        setLocalMsg(res.error);
      }
    } else {
      const res = await login(email, password, selectedRole);
      if (!res.success && res.error) {
        setLocalMsg(res.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1A0F] text-[#D0E8F0] flex flex-col items-center justify-center p-4 relative">
      {/* Top Bar with Outdoor Sunlight Mode Switch */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="compact" showLabel={true} />
      </div>

      <div className="max-w-md w-full space-y-6">
        {/* Brand Logo & Name */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#122010] border border-[#2A5038] shadow-xl">
            <img
              src="/assets/images/Picture1-1789308473747.png"
              alt="Zamzam Logo"
              className="h-14 w-auto object-contain rounded-lg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wider">
            ZAMZAM FIELD
          </h1>
          <p className="text-xs text-[#8899AA]">
            Mobile Dispatch, Cloud Sync & Field Operations
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-[#122010] p-6 rounded-2xl border border-[#2A5038] shadow-2xl space-y-4">
          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setLocalMsg(null);
                setLocalSuccessMsg(null);
                clearError();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                !isSignUp ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Staff Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setLocalMsg(null);
                setLocalSuccessMsg(null);
                clearError();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                isSignUp ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Register Account
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

          {/* WebAuthn Biometric Instant Sign In */}
          {!isSignUp && (
            <div className="space-y-2">
              <button
                type="button"
                id="btn-biometric-login"
                onClick={handleBiometricSignIn}
                disabled={loading || isBiometricLoading}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-[#006B3C] via-[#008F50] to-[#00C46A] hover:from-[#008F50] hover:to-[#00D674] text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-[#006B3C]/30 border border-[#00C46A]/40 transition-all active:scale-[0.98] disabled:opacity-60"
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
                      {hasRegisteredBiometrics
                        ? `Sign In with ${platformLabel}`
                        : `One-Tap ${platformLabel} Sign In`}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-[#8899AA] px-1">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-[#00C46A]" />
                  <span>WebAuthn Biometric API</span>
                </span>
                {emailHasBiometrics ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Enrolled on device
                  </span>
                ) : (
                  <span className="text-[#64748B]">Fingerprint / Face ID</span>
                )}
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#243447]"></div>
                <span className="flex-shrink mx-3 text-[10px] text-[#8899AA] uppercase tracking-wider">
                  Or continue with password
                </span>
                <div className="flex-grow border-t border-[#243447]"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <>
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
              </>
            )}

            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Email / Staff ID</label>
              <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                <Mail className="w-4 h-4 text-[#8899AA]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@zamzam.com"
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
                <option value="field_staff">Field Staff (Mobile Delivery)</option>
                <option value="supervisor">Supervisor (Approval & Fleet)</option>
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
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Staff Account' : 'Authenticate Session'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-[#8899AA] flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>Hardware Passkey & FIDO2 WebAuthn Protected</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


