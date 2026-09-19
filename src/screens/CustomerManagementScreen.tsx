import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Customer } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Building2,
  ClipboardList,
} from 'lucide-react';

interface CustomerManagementScreenProps {
  onNavigate: (view: string) => void;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ onNavigate }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(storageService.getCustomers());
    storageService.fetchCustomersFromCloud().then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        setCustomers(cloudData);
      }
    });
  }, []);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    storageService.saveCustomer({
      name: name.trim(),
      phone: phone.trim() || '+255 700 000 000',
      address: address.trim() || 'Dar es Salaam',
    });
    setCustomers(storageService.getCustomers());
    setName('');
    setPhone('');
    setAddress('');
    setShowAddModal(false);
    setFeedback(`Customer "${name}" registered successfully`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (id: string, custName: string) => {
    if (confirm(`Remove "${custName}" from client registry?`)) {
      storageService.deleteCustomer(id);
      setCustomers(storageService.getCustomers());
      setFeedback(`Customer removed`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00C46A]" />
            <span>Customer & Client Directory</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Manage dispatch delivery addresses, phone contacts, and rapid ordering.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-3 rounded-xl flex items-center gap-2 text-xs text-white animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-[#122010] border border-[#3A5068] px-4 py-2.5 rounded-xl">
        <Search className="w-4 h-4 text-[#8899AA]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business name, phone number, or street address..."
          className="w-full bg-transparent text-xs text-white placeholder-[#8899AA] focus:outline-none"
        />
      </div>

      {/* Customers Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#122010] rounded-2xl border border-dashed border-[#2A5038] space-y-3">
          <Users className="w-10 h-10 mx-auto text-[#00C46A]/50" />
          <h3 className="text-base font-bold text-white">No Customers Found</h3>
          <p className="text-xs text-[#8899AA] max-w-sm mx-auto">
            {search
              ? `No customer records matched "${search}".`
              : 'The customer directory is clean. Register your first commercial store, restaurant, or residential delivery point.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-2 rounded-xl text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Customer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] flex flex-col justify-between gap-3 shadow-md hover:border-[#00C46A]/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#00C46A]" />
                    <span>{c.name}</span>
                  </h2>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-[#8899AA] hover:text-red-400 p-1 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 space-y-1 text-xs text-[#8899AA]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#00C46A]" />
                    <a href={`tel:${c.phone}`} className="hover:underline text-[#D0E8F0] font-mono">
                      {c.phone}
                    </a>
                  </div>
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#243447] flex items-center justify-between">
                <button
                  onClick={() => onNavigate('forms')}
                  className="flex items-center gap-1.5 text-xs text-[#8899AA] hover:text-[#00C46A] transition-colors font-medium"
                  title="Open Customer Satisfaction Survey in Google Forms"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Google Survey</span>
                </button>
                <button
                  onClick={() => onNavigate('orders')}
                  className="flex items-center gap-1.5 text-xs text-[#00C46A] hover:text-white font-semibold"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Create Order</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122010] border border-[#3A5068] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Add Customer to Directory</h2>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanzanite Plaza"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255 7XX XXX XXX"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Physical Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / District / Floor"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#3A5068] text-[#8899AA] hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] text-xs font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
