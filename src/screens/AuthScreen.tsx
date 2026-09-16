import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, signUp, quickLogin } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('field_staff');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (!name || !email) return;
      signUp(name, email, phone, selectedRole);
    } else {
      login(email, selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1A0F] text-[#D0E8F0] flex flex-col items-center justify-center p-4">
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
            Mobile Dispatch, Offline Sync & Field Operations
          </p>
        </div>

        {/* Quick Demo One-Click Access Card */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] space-y-2.5">
          <div className="text-[11px] font-bold text-[#00C46A] uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Demo Switcher (One-Click)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => quickLogin('field_staff')}
              className="p-2.5 rounded-xl bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#3A5068] hover:border-[#00C46A] text-left transition-all"
            >
              <div className="font-bold text-white">Field Staff</div>
              <div className="text-[10px] text-[#8899AA] mt-0.5 font-mono">ZZ-2024-001</div>
            </button>
            <button
              onClick={() => quickLogin('supervisor')}
              className="p-2.5 rounded-xl bg-[#1A2E1C] hover:bg-blue-900 border border-[#3A5068] hover:border-blue-500 text-left transition-all"
            >
              <div className="font-bold text-white">Supervisor</div>
              <div className="text-[10px] text-[#8899AA] mt-0.5 font-mono">ZZ-2024-050</div>
            </button>
            <button
              onClick={() => quickLogin('manager')}
              className="p-2.5 rounded-xl bg-[#1A2E1C] hover:bg-purple-900 border border-[#3A5068] hover:border-purple-500 text-left transition-all"
            >
              <div className="font-bold text-white">Manager</div>
              <div className="text-[10px] text-[#8899AA] mt-0.5 font-mono">ZZ-2024-100</div>
            </button>
          </div>
        </div>

        {/* Auth Box */}
        <div className="bg-[#122010] p-6 rounded-2xl border border-[#2A5038] shadow-2xl space-y-4">
          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isSignUp ? 'bg-[#006B3C] text-white' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Staff Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSignUp ? 'bg-[#006B3C] text-white' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>

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
                      placeholder="e.g. Ali Hassan"
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
              <label className="text-xs text-[#8899AA] block mb-1">Email / Staff Login</label>
              <div className="flex items-center gap-2 bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3 py-2 text-xs">
                <Mail className="w-4 h-4 text-[#8899AA]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="field.staff@zamzam.com"
                  className="w-full bg-transparent text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#8899AA] block mb-1">PIN / Password</label>
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
              className="w-full mt-2 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <span>{isSignUp ? 'Create Staff Account' : 'Authenticate Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
