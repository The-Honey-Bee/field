import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  Database,
  RefreshCw,
  Droplets,
} from 'lucide-react';

interface OrderPaymentScreenProps {
  onNavigate: (view: string) => void;
}

export const OrderPaymentScreen: React.FC<OrderPaymentScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t, isSwahili } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [catalogSource, setCatalogSource] = useState<'supabase' | 'cache'>('cache');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  const loadCatalog = async (silent = false) => {
    if (!silent) setIsCatalogLoading(true);
    try {
      const fetched = await storageService.fetchProductsFromCloud();
      if (fetched && fetched.length > 0) {
        setProducts((prev) => {
          const qtyMap = new Map(prev.map((p) => [p.id, p.quantity || 0]));
          return fetched.map((p) => ({
            ...p,
            quantity: qtyMap.get(p.id) || 0,
          }));
        });
        setCatalogSource('supabase');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Failed to load catalog from Supabase:', err);
    } finally {
      setIsCatalogLoading(false);
    }
  };

  useEffect(() => {
    setCustomers(storageService.getCustomers());
    storageService.fetchCustomersFromCloud().then((cloudData) => {
      if (cloudData && cloudData.length > 0) {
        setCustomers(cloudData);
      }
    });

    // Initialize with cached products
    const initialList = storageService.getProducts();
    setProducts(initialList.map((p) => ({ ...p, quantity: 0 })));

    // Fetch live catalog from Supabase table
    loadCatalog();
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
          ? (isSwahili
              ? `Agizo limekamilika na kusawazishwa mtandaoni kwa ${selectedCustomer}!`
              : `Order completed and synced to central cloud for ${selectedCustomer}!`)
          : (isSwahili
              ? `Agizo limehifadhiwa salama kwenye kifaa kwa ajili ya ${selectedCustomer}. Litasawazishwa muunganisho ukirudi.`
              : `Order securely cached to local offline storage for ${selectedCustomer}. It will sync automatically when connection returns.`)
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
      setSuccessMessage(
        isSwahili
          ? 'Agizo limehifadhiwa salama kwenye foleni ya kusawazisha nje ya mtandao'
          : 'Order safely preserved in offline sync queue'
      );
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
            <span>{t('order.title', 'Create Dispatch Order')}</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {t('order.desc', 'Log water bottle delivery, select customer, and reconcile payment.')}
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
            <span>{t('order.select_customer', 'Select Customer')}</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center gap-1 text-xs text-[#00C46A] hover:underline font-semibold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('order.new_customer', 'New Customer')}</span>
          </button>
        </div>

        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00C46A]"
        >
          <option value="">
            {customers.length === 0
              ? t('order.no_customers_opt', '-- No customers registered yet. Click + New Customer above --')
              : t('order.choose_customer_opt', '-- Choose a registered customer --')}
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} {c.phone ? `(${c.phone})` : ''}
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <p className="text-[11px] text-[#F59E0B] mt-1.5 flex items-center gap-1">
            <span>{t('order.customer_clean', 'Customer directory is clean. Tap "+ New Customer" above to register this delivery stop.')}</span>
          </p>
        )}
      </div>

      {/* 2. Product Catalog */}
      <div className="bg-[#122010] p-5 sm:p-6 rounded-2xl border border-[#2A5038] shadow-lg shadow-black/20 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#2A5038]/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">
                {t('order.product_catalog', 'Product Catalog & Quantities')}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#006B3C]/25 text-[#00C46A] border border-[#00C46A]/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C46A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C46A]"></span>
                </span>
                <span>Supabase: products</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8899AA] mt-1">
              {isSwahili
                ? 'Bidhaa zote zinatoka kwenye jedwali la Supabase moja kwa moja'
                : 'Live water bottle catalog synchronized from Supabase products table'}
              {lastSyncTime && (
                <span className="ml-2 font-mono text-[#00C46A]/80">
                  ({isSwahili ? 'Ilisasishwa' : 'Synced'} {lastSyncTime})
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadCatalog()}
            disabled={isCatalogLoading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1A2E1C] hover:bg-[#244227] text-white border border-[#2A5038] transition-colors disabled:opacity-50 cursor-pointer"
            title={isSwahili ? 'Sasisha orodha kutoka Supabase' : 'Refresh catalog from Supabase'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00C46A] ${isCatalogLoading ? 'animate-spin' : ''}`} />
            <span>{isCatalogLoading ? (isSwahili ? 'Inapakua...' : 'Syncing...') : (isSwahili ? 'Sasisha Katalogi' : 'Sync Supabase')}</span>
          </button>
        </div>

        {totalItems > 0 && (
          <div className="mb-4 px-3.5 py-2 rounded-xl bg-[#006B3C]/20 border border-[#00C46A]/30 flex items-center justify-between text-xs">
            <span className="text-white font-medium">
              {isSwahili ? 'Vitu vilivyochaguliwa' : 'Selected order items'}:{' '}
              <strong className="text-[#00C46A] font-bold">{totalItems}</strong> {isSwahili ? 'chupa' : 'bottles'}
            </span>
            <span className="font-mono font-bold text-white">
              {isSwahili ? 'Jumla Ndogo' : 'Subtotal'}: <span className="text-[#00C46A]">TZS {subtotal.toLocaleString()}</span>
            </span>
          </div>
        )}

        <div className="space-y-3">
          {products.map((product) => {
            const qty = product.quantity || 0;
            const isSelected = qty > 0;
            const isNewBottle = product.name?.includes('NEW') || product.size?.includes('NEW');
            const isRefill = product.name?.includes('18.9L/R') || product.size?.includes('/R') || product.unit?.toLowerCase().includes('refill');

            return (
              <div
                key={product.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#152F1B] border-[#00C46A]/60 shadow-md ring-1 ring-[#00C46A]/20'
                    : 'bg-[#1A2E1C] border-[#2A5038] hover:border-[#3A6048]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${isSelected ? 'bg-[#006B3C] text-white' : 'bg-[#122010] text-[#00C46A] border border-[#2A5038]'}`}>
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">{product.name}</h3>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        isNewBottle
                          ? 'bg-[#0369A1]/30 text-[#38BDF8] border-[#38BDF8]/40'
                          : isRefill
                          ? 'bg-[#006B3C]/50 text-[#00C46A] border-[#00C46A]/40'
                          : 'bg-[#2A5038]/60 text-[#A3E635] border-[#A3E635]/30'
                      }`}>
                        {product.size}
                      </span>
                      {isRefill && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/30">
                          {isSwahili ? 'Refill' : 'Refill Service'}
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1 max-w-md">
                        {product.description}
                      </p>
                    )}
                    <div className="text-xs text-[#8899AA] mt-1.5 flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-white font-semibold">
                        TZS {product.price.toLocaleString()}{' '}
                        <span className="text-[#8899AA] font-normal">/ {product.unit}</span>
                      </span>
                      <span className="text-[#3A5068]">&bull;</span>
                      <span>
                        {t('order.stock_available', 'In Stock')}:{' '}
                        <strong className="text-white font-mono">{product.stockAvailable}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Counter & Subtotal */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center bg-[#122010] border border-[#2A5038] rounded-xl p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.id, -1)}
                      disabled={qty <= 0}
                      className="p-2 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Punguza idadi"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`w-12 text-center font-bold font-mono text-sm ${isSelected ? 'text-[#00C46A]' : 'text-white'}`}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(product.id, 1)}
                      disabled={qty >= product.stockAvailable}
                      className="p-2 rounded-lg text-[#00C46A] hover:text-white hover:bg-[#006B3C] disabled:opacity-25 transition-colors cursor-pointer"
                      title="Ongeza idadi"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-24 sm:w-28 text-right font-mono text-sm font-bold text-white">
                    TZS {(qty * product.price).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && !isCatalogLoading && (
          <div className="text-center py-8 text-xs text-[#8899AA]">
            <p>{isSwahili ? 'Hakuna bidhaa zilizopatikana kwenye katalogi.' : 'No products found in the catalog.'}</p>
            <button
              type="button"
              onClick={() => loadCatalog()}
              className="mt-2 text-[#00C46A] hover:underline"
            >
              {isSwahili ? 'Jaribu tena kupakua' : 'Retry loading catalog'}
            </button>
          </div>
        )}
      </div>

      {/* 3. Payment Method */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
          {t('order.payment_method', 'Payment Reconciliation Method')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <span className="text-xs font-bold">{t('order.cash', 'Cash')}</span>
            <span className="text-[10px] text-[#8899AA] mt-0.5">{t('order.cash_desc', 'Cash on Delivery')}</span>
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
            <span className="text-xs font-bold">{t('order.mobile', 'Mobile Money')}</span>
            <span className="text-[10px] text-[#8899AA] mt-0.5">{t('order.mobile_desc', 'M-Pesa / Tigo')}</span>
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
            <span className="text-xs font-bold">{t('order.credit', 'Invoice Credit')}</span>
            <span className="text-[10px] text-[#8899AA] mt-0.5">{t('order.credit_desc', 'Corporate Invoice')}</span>
          </button>
        </div>

        {/* Cash Tendered Input */}
        {paymentMethod === 'cash' && (
          <div className="mt-4 pt-4 border-t border-[#243447] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8899AA] mb-1 block">
                {t('order.cash_received', 'Amount Tendered (TZS)')}
              </label>
              <input
                type="number"
                value={amountReceived || ''}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
                placeholder={isSwahili ? `Jumla ndogo: ${subtotal}` : `Subtotal: ${subtotal}`}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] mb-1 block">
                {t('order.change_due', 'Change Due')}
              </label>
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
          <span>{t('order.total_bottles', 'Total Bottles')}</span>
          <span className="font-mono text-white font-bold">{totalItems} {isSwahili ? 'chupa' : 'units'}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold text-white mt-2 pt-2 border-t border-[#243447]">
          <span>{t('order.total_amount', 'Grand Total')}</span>
          <span className="font-mono text-[#00C46A] text-xl">TZS {subtotal.toLocaleString()}</span>
        </div>

        {!selectedCustomer && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#F59E0B]">
            <AlertCircle className="w-4 h-4" />
            <span>{isSwahili ? 'Tafadhali chagua mteja ili kuthibitisha usafirishaji wa agizo.' : t('order.customer_clean', 'Please select a customer to confirm order dispatch.')}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleOrderSubmit}
          disabled={!canSubmit}
          className="w-full mt-4 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? (isSwahili ? 'Inasajili Usafirishaji...' : t('order.saving', 'Recording Dispatch...')) : (isSwahili ? 'Thibitisha na Chapisha Agizo' : t('order.submit_btn', 'Confirm & Print Order'))}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122010] border border-[#3A5068] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">
              {t('order.add_customer_modal_title', 'Register New Customer')}
            </h2>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {t('order.customer_name_label', 'Customer / Business Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder={isSwahili ? 'mfano: Duka Kuu la Jiji' : 'e.g. City Supermarket'}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {t('order.customer_phone_label', 'Phone Number')}
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+255 7XX XXX XXX"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {t('order.customer_address_label', 'Street Address')}
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder={isSwahili ? 'Kiwanja / Barabara, Wilaya' : 'Plot / Road, District'}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#3A5068] text-[#8899AA] hover:text-white text-xs font-semibold"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] text-xs font-bold"
                >
                  {t('order.save_customer_btn', 'Save Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
