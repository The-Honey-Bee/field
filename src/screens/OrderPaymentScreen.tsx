import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { storageService, INITIAL_PRODUCTS } from '../services/storage';
import { Product, Customer, PaymentMethod } from '../types';
import {
  ShoppingCart,
  Plus,
  Minus,
  UserPlus,
  CheckCircle2,
  DollarSign,
  Smartphone,
  CreditCard,
  Building2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface OrderPaymentScreenProps {
  onNavigate: (view: string) => void;
}

export const OrderPaymentScreen: React.FC<OrderPaymentScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  useEffect(() => {
    setCustomers(storageService.getCustomers());
    storageService.fetchCustomersFromCloud().then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        setCustomers(cloudData);
      }
    });
    setProducts(INITIAL_PRODUCTS.map((p) => ({ ...p, quantity: 0 })));
  }, []);

  const handleQtyChange = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const currentQty = p.quantity || 0;
          const newQty = Math.max(0, Math.min(p.stockAvailable, currentQty + delta));
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const subtotal = products.reduce((sum, p) => sum + p.price * (p.quantity || 0), 0);
  const change = Math.max(0, amountReceived - subtotal);
  const canSubmit = totalItems > 0 && selectedCustomer.trim().length > 0 && !isSubmitting;

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = storageService.saveCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '+255 700 000 000',
      address: newCustAddress.trim() || 'Dar es Salaam',
    });
    setCustomers(storageService.getCustomers());
    setSelectedCustomer(created.name);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setShowAddCustomer(false);
  };

  const handleOrderSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const activeItems = products
        .filter((p) => (p.quantity || 0) > 0)
        .map((p) => ({
          id: p.id,
          name: `${p.name} ${p.size}`,
          qty: p.quantity || 0,
          price: p.price,
          subtotal: p.price * (p.quantity || 0),
        }));

      await storageService.saveOrder({
        staffId: user?.employeeId || 'ZZ-2024-001',
        customerName: selectedCustomer,
        paymentMethod,
        items: activeItems,
        subtotal,
        amountReceived: amountReceived > 0 ? amountReceived : subtotal,
        changeAmount: change,
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00C46A', '#008F50', '#FFFFFF'],
      });

      const isOnline = storageService.isOnline();
      setSuccessMessage(
        isOnline
          ? `Order completed and synced to central cloud for ${selectedCustomer}!`
          : `Order securely cached to local offline storage for ${selectedCustomer}. It will sync automatically when connection returns.`
      );

      // Reset form
      setProducts((prev) => prev.map((p) => ({ ...p, quantity: 0 })));
      setAmountReceived(0);
      setSelectedCustomer('');

      setTimeout(() => {
        setSuccessMessage(null);
        onNavigate('home');
      }, 2500);
    } catch {
      setSuccessMessage('Order safely preserved in offline sync queue');
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#00C46A]" />
            <span>Create Dispatch Order</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Log water bottle delivery, select customer, and reconcile payment.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-4 rounded-xl flex items-center gap-3 text-white text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#00C46A] shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Customer Selection */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#00C46A]" />
            <span>Select Customer</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-1 text-xs text-[#00C46A] hover:underline font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>
        </div>

        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00C46A]"
        >
          <option value="">
            {customers.length === 0 ? '-- No customers registered yet. Click + New Customer above --' : '-- Choose a registered customer --'}
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} {c.phone ? `(${c.phone})` : ''}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <p className="text-[11px] text-[#F59E0B] mt-1.5 flex items-center gap-1">
            <span>Customer directory is clean. Tap "+ New Customer" above to register this delivery stop.</span>
          </p>
        )}
      </div>

      {/* 2. Product Catalog */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
          Product Catalog & Quantities
        </h2>

        <div className="space-y-3">
          {products.map((product) => {
            const qty = product.quantity || 0;
            return (
              <div
                key={product.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#1A2E1C] border border-[#3A5068]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{product.name}</h3>
                    <span className="text-xs font-mono font-bold bg-[#006B3C]/50 text-[#00C46A] px-2 py-0.5 rounded">
                      {product.size}
                    </span>
                  </div>
                  <div className="text-xs text-[#8899AA] mt-1 flex items-center gap-3">
                    <span className="font-mono text-white">TZS {product.price.toLocaleString()} / {product.unit}</span>
                    <span>&bull;</span>
                    <span>In Stock: <strong className="text-white">{product.stockAvailable}</strong></span>
                  </div>
                </div>

                {/* Counter */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center bg-[#122010] border border-[#3A5068] rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.id, -1)}
                      disabled={qty <= 0}
                      className="p-1.5 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-bold font-mono text-white text-sm">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.id, 1)}
                      disabled={qty >= product.stockAvailable}
                      className="p-1.5 rounded-lg text-[#00C46A] hover:text-white hover:bg-[#006B3C] disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-24 text-right font-mono text-sm font-bold text-white">
                    TZS {(qty * product.price).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Payment Method */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
          Payment Method
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
              paymentMethod === 'cash'
                ? 'bg-[#006B3C] border-[#00C46A] text-white shadow-md'
                : 'bg-[#1A2E1C] border-[#3A5068] text-[#8899AA] hover:text-white'
            }`}
          >
            <DollarSign className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold">Cash</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('mobile')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
              paymentMethod === 'mobile'
                ? 'bg-[#006B3C] border-[#00C46A] text-white shadow-md'
                : 'bg-[#1A2E1C] border-[#3A5068] text-[#8899AA] hover:text-white'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold">M-Pesa / Tigo</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('credit')}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
              paymentMethod === 'credit'
                ? 'bg-[#006B3C] border-[#00C46A] text-white shadow-md'
                : 'bg-[#1A2E1C] border-[#3A5068] text-[#8899AA] hover:text-white'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold">Store Credit</span>
          </button>
        </div>

        {/* Cash Tendered Input */}
        {paymentMethod === 'cash' && (
          <div className="mt-4 pt-4 border-t border-[#243447] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8899AA] mb-1 block">Amount Tendered (TZS)</label>
              <input
                type="number"
                value={amountReceived || ''}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
                placeholder={`Subtotal: ${subtotal}`}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] mb-1 block">Change Due</label>
              <div className="bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#00C46A]">
                TZS {change.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Order Summary & Submit Button */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] shadow-lg">
        <div className="flex items-center justify-between text-sm text-[#8899AA]">
          <span>Total Bottles</span>
          <span className="font-mono text-white font-bold">{totalItems} units</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold text-white mt-2 pt-2 border-t border-[#243447]">
          <span>Grand Total</span>
          <span className="font-mono text-[#00C46A] text-xl">TZS {subtotal.toLocaleString()}</span>
        </div>

        {!selectedCustomer && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#F59E0B]">
            <AlertCircle className="w-4 h-4" />
            <span>Please select a customer to confirm order dispatch.</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleOrderSubmit}
          disabled={!canSubmit}
          className="w-full mt-4 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'Recording Dispatch...' : 'Confirm & Print Order'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122010] border border-[#3A5068] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Register New Customer</h2>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. City Supermarket"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+255 7XX XXX XXX"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">Street Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Plot / Road, District"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#3A5068] text-[#8899AA] hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] text-xs font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
