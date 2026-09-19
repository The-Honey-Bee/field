import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { UKFlag, TanzaniaFlag } from './FlagIcons';
import { ChevronDown, Check } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentFlag = language === 'sw' ? <TanzaniaFlag className="w-4 h-3" /> : <UKFlag className="w-4 h-3" />;
  const currentCode = language === 'sw' ? 'SW' : 'EN';
  const currentTitle = language === 'sw' ? 'Kiswahili (Tanzania)' : 'English (United Kingdom)';

  return (
    <div className="relative" ref={containerRef}>
      {/* Targeted Button: Language Selection Button (EN, SW) */}
      <button
        type="button"
        id="btn-language-selector"
        onClick={() => setIsOpen(!isOpen)}
        title={`Language: ${currentTitle}. Click to switch.`}
        className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] hover:border-[#00C46A] px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center gap-1.5">
          {currentFlag}
          <span className="tracking-wide font-mono text-[11px] sm:text-xs">{currentCode}</span>
        </span>
        <ChevronDown className={`w-3 h-3 text-[#8899AA] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Language Selection Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-[#122010] border border-[#3A5068] rounded-xl shadow-2xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] text-[#8899AA] font-bold uppercase tracking-wider border-b border-[#243447]">
            {language === 'sw' ? 'Chagua Lugha' : 'Select Language'}
          </div>

          {/* Option: English (EN) with UK Flag */}
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#1A2E1C] transition-colors ${
              language === 'en' ? 'text-[#00C46A] font-bold bg-[#1A2E1C]/60' : 'text-[#D0E8F0]'
            }`}
          >
            <div className="flex items-center gap-2">
              <UKFlag className="w-4 h-3" />
              <span>English (EN)</span>
            </div>
            {language === 'en' && <Check className="w-3.5 h-3.5 text-[#00C46A]" />}
          </button>

          {/* Option: Kiswahili (SW) with Tanzania Flag */}
          <button
            type="button"
            onClick={() => {
              setLanguage('sw');
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#1A2E1C] transition-colors ${
              language === 'sw' ? 'text-[#00C46A] font-bold bg-[#1A2E1C]/60' : 'text-[#D0E8F0]'
            }`}
          >
            <div className="flex items-center gap-2">
              <TanzaniaFlag className="w-4 h-3" />
              <span>Kiswahili (SW)</span>
            </div>
            {language === 'sw' && <Check className="w-3.5 h-3.5 text-[#00C46A]" />}
          </button>
        </div>
      )}
    </div>
  );
};
