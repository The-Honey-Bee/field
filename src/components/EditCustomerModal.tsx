import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import {
  X,
  Save,
  Trash2,
  User,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface EditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCustomer: Customer) => void;
  onDelete?: (customerId: string, customerName: string) => void;
}

const DEFAULT_TERRITORIES = [
  'Ilala / Posta',
  'Kinondoni / Masaki',
  'Temeke',
  'Ubungo',
  'Kigamboni',
  'Mikocheni / Mwenge',
  'Tegeta / Kunduchi',
  'Kariakoo / Upanga',
  'Mbezi Beach / Kawe',
  'Mwanza - Capripoint & CBD',
  'Mwanza - Nyakato & Buzuruga',
  'Mwanza - Kirumba & Pasiansi',
  'Mwanza - Nyegezi & Butimba',
];

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const { isSwahili } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('Kinondoni / Masaki');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');

      // Check territory match
      const matched = DEFAULT_TERRITORIES.find((t) => customer.address?.includes(t));
      if (matched) {
        setTerritory(matched);
      }
      setError(null);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isSwahili ? 'Tafadhali ingiza jina la mteja' : 'Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fullAddress = address.trim() || territory;
      const updated = await storageService.updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: fullAddress,
        notes: notes.trim(),
      });

      if (updated) {
        onSave(updated);
        onClose();
      } else {
        setError(isSwahili ? 'Hitilafu wakati wa kusasisha mteja' : 'Failed to update customer');
      }
    } catch (err: any) {
      setError(err?.message || 'Error updating customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    const confirmPrompt = isSwahili
      ? `Je, una uhakika unataka kufuta mteja "${customer.name}"? Hatua hii itamwondoa kwenye hifadhidata ya wateja.`
      : `Are you sure you want to delete customer "${customer.name}"? This will remove them from the client registry.`;

    if (window.confirm(confirmPrompt)) {
      if (onDelete) {
        onDelete(customer.id, customer.name);
      } else {
        storageService.deleteCustomer(customer.id);
      }
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0D1E12] border border-[#2A5038] max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#122418] to-[#1A3322] border-b border-[#243447] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isSwahili ? 'Hariri Mteja (Msimamizi)' : 'Supervisor Customer Editor'}
                </h3>
              </div>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili ? 'Sasisha maelezo ya mteja au mfute kwenye mfumo' : 'Update client registry record or remove from system'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A2E1C] hover:bg-[#253D28] text-[#8899AA] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-xl text-xs text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Jina la Mteja / Biashara' : 'Customer / Business Name'}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Nambari ya Simu' : 'Phone Number'}</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255..."
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Eneo la Usambazaji (Territory)' : 'Delivery Zone / Territory'}</span>
            </label>
            <select
              value={territory}
              onChange={(e) => {
                setTerritory(e.target.value);
                if (!address) setAddress(e.target.value);
              }}
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white outline-none mb-2"
            >
              {DEFAULT_TERRITORIES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isSwahili ? 'Anwani maalum (km. Plot 42, Karibu na Tilapia)' : 'Specific address / Landmark details'}
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Maelezo / Bei Maalum' : 'Customer Notes & Preferences'}</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isSwahili ? 'Maelezo kuhusu uwasilishaji au malipo...' : 'Notes on delivery access, bottle quotas...'}
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#243447] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3.5 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSwahili ? 'Futa Mteja' : 'Delete Customer'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1A2E1C] hover:bg-[#253D28] text-[#8899AA] hover:text-white rounded-xl text-xs font-medium transition"
              >
                {isSwahili ? 'Ghairi' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? (isSwahili ? 'Inahifadhi...' : 'Saving...') : (isSwahili ? 'Hifadhi Mabadiliko' : 'Save Changes')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
