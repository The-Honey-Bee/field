import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Eye, Check } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'navbar' | 'compact' | 'card' | 'badge';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'navbar',
  className = '',
  showLabel = true,
}) => {
  const { theme, isSunlight, toggleTheme, setTheme } = useTheme();

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Low-Light Dark Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              !isSunlight
                ? 'bg-[#1A2E1C] border-[#00C46A] ring-1 ring-[#00C46A]/50 shadow-md'
                : 'bg-[#122010] border-[#3A5068]/50 hover:border-[#3A5068] opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#0A1A0F] border border-[#2A5038] text-[#00C46A]">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Low-Light Dark Mode</div>
                  <div className="text-[10px] text-[#8899AA]">Night shifts & indoor depot</div>
                </div>
              </div>
              {!isSunlight && (
                <span className="w-5 h-5 rounded-full bg-[#00C46A] text-[#0A1A0F] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-[#243447]/60 flex items-center justify-between text-[10px] text-[#8899AA]">
              <span>Background: Deep Emerald (#0A1A0F)</span>
              <span className="text-[#00C46A] font-semibold">Standard Contrast</span>
            </div>
          </button>

          {/* High-Contrast Outdoor Sunlight Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('sunlight')}
            className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
              isSunlight
                ? 'bg-[#1A2E1C] border-[#00C46A] ring-1 ring-[#00C46A]/50 shadow-md'
                : 'bg-[#122010] border-[#3A5068]/50 hover:border-[#3A5068] opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Outdoor Sunlight Mode</div>
                  <div className="text-[10px] text-[#8899AA]">High contrast for direct sun & glare</div>
                </div>
              </div>
              {isSunlight && (
                <span className="w-5 h-5 rounded-full bg-[#00C46A] text-[#0A1A0F] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-[#243447]/60 flex items-center justify-between text-[10px] text-[#8899AA]">
              <span>Background: Pure Crisp Light (#F4F6F8)</span>
              <span className="text-amber-400 font-semibold">High Sunlight Visibility</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isSunlight ? 'Switch to Dark Mode' : 'Switch to Outdoor Sunlight Mode'}
        title={isSunlight ? 'Switch to Low-Light Dark Mode' : 'Switch to High-Contrast Outdoor Sunlight Mode'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
          isSunlight
            ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200'
            : 'bg-[#122010] text-[#D0E8F0] border-[#3A5068] hover:bg-[#1A2E1C]'
        } ${className}`}
      >
        {isSunlight ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            {showLabel && <span>Sunlight Mode</span>}
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#00C46A]" />
            {showLabel && <span>Dark Mode</span>}
          </>
        )}
      </button>
    );
  }

  // Default navbar toggle
  return (
    <button
      type="button"
      id="btn-theme-toggle"
      onClick={toggleTheme}
      aria-label={isSunlight ? 'Switch to Low-Light Dark Mode' : 'Switch to High-Contrast Outdoor Sunlight Mode'}
      title={
        isSunlight
          ? 'Sunlight Mode Active (Click for Low-Light Dark Mode)'
          : 'Dark Mode Active (Click for High-Contrast Outdoor Sunlight Mode)'
      }
      className={`relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
        isSunlight
          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
          : 'bg-[#122010] hover:bg-[#1A2E1C] border-[#3A5068] text-[#8899AA] hover:text-[#00C46A]'
      } ${className}`}
    >
      <div className="relative">
        {isSunlight ? (
          <Sun className="w-3.5 h-3.5 text-amber-600 animate-in spin-in-90 duration-300" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-[#00C46A] animate-in spin-in-90 duration-300" />
        )}
      </div>

      {showLabel && (
        <span className="hidden sm:inline text-xs font-medium">
          {isSunlight ? 'Sunlight Mode' : 'Dark Mode'}
        </span>
      )}

      {/* Screen Glare Indicator Dot */}
      <span
        className={`w-2 h-2 rounded-full ${
          isSunlight ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-[#00C46A]/80'
        }`}
      />
    </button>
  );
};
