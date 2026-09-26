import React, { useState, useEffect, useMemo } from 'react';
import { Customer, CustomerInteraction, CustomerInteractionType, Order } from '../types';
import { storageService } from '../services/storage';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Phone,
  PhoneCall,
  MapPin,
  Calendar,
  Clock,
  ShoppingCart,
  DollarSign,
  Plus,
  FileText,
  CheckCircle2,
  MessageSquare,
  Droplets,
  ClipboardList,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Share2,
  Check,
  Send,
  History,
} from 'lucide-react';

interface CustomerActivitySidebarProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (customer: Customer) => void;
  onCustomerUpdated?: () => void;
}

type TimelineEventType = 'all' | 'orders' | 'interactions' | 'notes';

interface UnifiedTimelineItem {
  id: string;
  type: 'order' | CustomerInteractionType;
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  badge?: string;
  badgeColor?: string;
  staffName?: string;
  meta?: any;
}

export const CustomerActivitySidebar: React.FC<CustomerActivitySidebarProps> = ({
  customer,
  isOpen,
  onClose,
  onCreateOrder,
}) => {
  const { isSwahili } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TimelineEventType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [showLogForm, setShowLogForm] = useState<boolean>(false);

  // Form state for logging a new interaction
  const [interactionType, setInteractionType] = useState<CustomerInteractionType>('call');
  const [interactionTitle, setInteractionTitle] = useState<string>('');
  const [interactionDescription, setInteractionDescription] = useState<string>('');
  const [interactionAmount, setInteractionAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load orders and interactions whenever the selected customer changes or opens
  useEffect(() => {
    if (customer) {
      loadCustomerHistory();
    }
  }, [customer, isOpen]);

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadCustomerHistory = () => {
    if (!customer) return;
    const custOrders = storageService.getCustomerOrders(customer.id, customer.name);
    const custInteractions = storageService.getCustomerInteractions(customer.id, customer.name);
    setOrders(custOrders);
    setInteractions(custInteractions);
  };

  // Unified chronological timeline
  const timelineItems: UnifiedTimelineItem[] = useMemo(() => {
    if (!customer) return [];

    const items: UnifiedTimelineItem[] = [];

    // Map orders to timeline items
    orders.forEach((ord) => {
      const itemsSummary = ord.items
        ? ord.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
        : 'Water order';

      items.push({
        id: `ord-${ord.id}`,
        type: 'order',
        title: isSwahili ? `Agizo la Maji: ${ord.id.slice(-6).toUpperCase()}` : `Water Order: #${ord.id.slice(-6).toUpperCase()}`,
        description: `${itemsSummary} • ${isSwahili ? 'Njia ya Malipo' : 'Payment'}: ${ord.paymentMethod.toUpperCase()}`,
        timestamp: ord.createdAt,
        amount: ord.subtotal,
        badge: ord.status?.toUpperCase() || (ord.syncStatus === 'synced' ? 'SYNCED' : 'PENDING'),
        badgeColor:
          ord.status === 'approved'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : ord.status === 'rejected'
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-[#00C46A]/20 text-[#00C46A] border-[#00C46A]/30',
        staffName: ord.staffId,
        meta: ord,
      });
    });

    // Map interactions to timeline items
    interactions.forEach((inter) => {
      items.push({
        id: inter.id,
        type: inter.type,
        title: inter.title,
        description: inter.description,
        timestamp: inter.timestamp,
        amount: inter.amount,
        badge: inter.type.toUpperCase(),
        badgeColor:
          inter.type === 'call'
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            : inter.type === 'visit'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : inter.type === 'payment'
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            : inter.type === 'refill'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        staffName: inter.staffName,
        meta: inter,
      });
    });

    // Sort descending (most recent first)
    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [customer, orders, interactions, isSwahili]);

  // Filtered timeline based on active tab
  const filteredTimeline = useMemo(() => {
    if (activeTab === 'all') return timelineItems;
    if (activeTab === 'orders') return timelineItems.filter((i) => i.type === 'order');
    if (activeTab === 'interactions')
      return timelineItems.filter((i) => i.type === 'call' || i.type === 'visit' || i.type === 'refill');
    if (activeTab === 'notes')
      return timelineItems.filter((i) => i.type === 'note' || i.type === 'survey' || i.type === 'payment');
    return timelineItems;
  }, [timelineItems, activeTab]);

  // Aggregate statistics
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  }, [orders]);

  const lastOrderDate = useMemo(() => {
    if (orders.length === 0) return null;
    return new Date(orders[0].createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [orders]);

  const handleCopyPhone = () => {
    if (!customer?.phone) return;
    navigator.clipboard.writeText(customer.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCreateInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !interactionTitle.trim()) return;

    setIsSubmitting(true);
    try {
      storageService.addCustomerInteraction({
        customerId: customer.id,
        customerName: customer.name,
        type: interactionType,
        title: interactionTitle.trim(),
        description: interactionDescription.trim() || 'No detailed note entered.',
        staffName: user?.name || 'Staff Representative',
        amount: interactionAmount ? parseFloat(interactionAmount) : undefined,
      });

      // Reload
      loadCustomerHistory();

      // Reset form
      setInteractionTitle('');
      setInteractionDescription('');
      setInteractionAmount('');
      setShowLogForm(false);

      setToastMessage(
        isSwahili ? 'Mawasiliano yamehifadhiwa kikamilifu!' : 'Interaction logged successfully!'
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Error adding interaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;

  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-[#0A1A0F] border-l border-[#2A5038] shadow-2xl flex flex-col transform transition-transform ease-out duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#243447] bg-[#122010]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00C46A]/20 border border-[#00C46A]/40 flex items-center justify-center shrink-0 text-[#00C46A] shadow-inner">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      {customer.name}
                    </h2>
                    {customer.syncStatus === 'synced' ? (
                      <span className="text-[10px] bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/30 px-2 py-0.5 rounded-full font-semibold">
                        Supabase Synced
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                        Local Cache
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8899AA] mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[11px]">ID: {customer.id}</span>
                    <span>•</span>
                    <span>
                      {isSwahili ? 'Mwanachama tangu' : 'Client since'}{' '}
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-[#8899AA] hover:text-white rounded-xl hover:bg-[#1A2E1C] transition-colors"
                title={isSwahili ? 'Funga' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact & Info Bar */}
            <div className="mt-4 pt-3 border-t border-[#243447]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#2A5038] text-emerald-400 border border-[#2A5038] transition-colors font-mono"
                  title="Call Customer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{customer.phone}</span>
                </a>

                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={handleCopyPhone}
                  className="p-1.5 text-[#8899AA] hover:text-white rounded-lg hover:bg-[#1A2E1C] transition-colors"
                  title="Copy Phone"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-[#00C46A]" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {customer.address && (
                <div className="flex items-center gap-1.5 text-[#8899AA] text-[11px] truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="mt-2.5 bg-[#0A1A0F] border border-[#243447] px-3 py-1.5 rounded-xl text-[11px] text-[#A0B0C0] italic flex items-center gap-2">
                <FileText className="w-3 h-3 text-[#38BDF8] shrink-0" />
                <span className="truncate">{customer.notes}</span>
              </div>
            )}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-[#0E1712] border-b border-[#243447]">
            <div className="bg-[#122010] border border-[#2A5038] rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8899AA] tracking-wider block">
                {isSwahili ? 'Maagizo' : 'Total Orders'}
              </span>
              <span className="text-base sm:text-lg font-bold text-white mt-0.5 block">
                {orders.length}
              </span>
            </div>

            <div className="bg-[#122010] border border-[#2A5038] rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8899AA] tracking-wider block">
                {isSwahili ? 'Mapato (TZS)' : 'Revenue (TZS)'}
              </span>
              <span className="text-base sm:text-lg font-bold text-[#00C46A] mt-0.5 block truncate">
                {totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="bg-[#122010] border border-[#2A5038] rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-[#8899AA] tracking-wider block">
                {isSwahili ? 'Agizo la Mwisho' : 'Last Order'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white mt-1 block truncate">
                {lastOrderDate || '—'}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-3 bg-[#122010] border-b border-[#243447] flex items-center justify-between gap-2">
            <button
              onClick={() => onCreateOrder(customer)}
              className="flex-1 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isSwahili ? 'Unda Agizo Jipya' : 'Create New Order'}</span>
            </button>

            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="flex-1 bg-[#1A2E1C] hover:bg-[#2A5038] text-white border border-[#2A5038] font-semibold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {showLogForm ? <ChevronUp className="w-4 h-4 text-[#00C46A]" /> : <Plus className="w-4 h-4 text-[#00C46A]" />}
              <span>{showLogForm ? (isSwahili ? 'Funga Fomu' : 'Close Form') : (isSwahili ? 'Rekodi Mawasiliano' : 'Log Interaction')}</span>
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mx-4 mt-3 bg-[#006B3C]/40 border border-[#00C46A] p-2.5 rounded-xl flex items-center gap-2 text-xs text-white animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-[#00C46A] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Inline Log Interaction Form */}
          {showLogForm && (
            <form
              onSubmit={handleCreateInteraction}
              className="p-4 bg-[#112316] border-b border-[#2A5038] space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Rekodi Shughuli / Mawasiliano' : 'Log Customer Activity & Interaction'}</span>
                </h4>
                <span className="text-[10px] text-[#8899AA]">
                  {isSwahili ? 'Mhudumu:' : 'Staff:'} {user?.name || 'Field Representative'}
                </span>
              </div>

              {/* Type Selector */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { id: 'call', label: 'Call', icon: PhoneCall },
                    { id: 'visit', label: 'Visit', icon: MapPin },
                    { id: 'refill', label: 'Refill', icon: Droplets },
                    { id: 'payment', label: 'Payment', icon: DollarSign },
                    { id: 'survey', label: 'Survey', icon: ClipboardList },
                    { id: 'note', label: 'Note', icon: FileText },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  const isSelected = interactionType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setInteractionType(t.id)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex flex-col items-center gap-1 transition-colors border ${
                        isSelected
                          ? 'bg-[#00C46A] text-[#0A1A0F] border-[#00C46A]'
                          : 'bg-[#122010] text-[#8899AA] border-[#2A5038] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Title / Summary */}
              <div>
                <label className="text-[10px] font-medium text-[#8899AA] block mb-1">
                  {isSwahili ? 'Mada / Kichwa cha Habari *' : 'Subject / Activity Summary *'}
                </label>
                <input
                  type="text"
                  required
                  value={interactionTitle}
                  onChange={(e) => setInteractionTitle(e.target.value)}
                  placeholder={
                    interactionType === 'call'
                      ? 'e.g. Phone check-in: Confirmed 18.9L order delivery'
                      : interactionType === 'visit'
                      ? 'e.g. Site visit: Dispenser sanitation and bottle audit'
                      : interactionType === 'refill'
                      ? 'e.g. Refill service: Swapped 4 empty bottles'
                      : interactionType === 'payment'
                      ? 'e.g. Cash collected for previous week delivery'
                      : 'e.g. Customer feedback notes'
                  }
                  className="w-full bg-[#1A2E1C] border border-[#2A5038] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-medium text-[#8899AA] block mb-1">
                  {isSwahili ? 'Maelezo ya Ziada' : 'Detailed Notes & Outcome'}
                </label>
                <textarea
                  rows={2}
                  value={interactionDescription}
                  onChange={(e) => setInteractionDescription(e.target.value)}
                  placeholder={isSwahili ? 'Weka maelezo ya mawasiliano au makubaliano...' : 'Enter details of discussion, customer requests, or follow-up actions...'}
                  className="w-full bg-[#1A2E1C] border border-[#2A5038] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              {/* Amount (if payment) */}
              {interactionType === 'payment' && (
                <div>
                  <label className="text-[10px] font-medium text-[#8899AA] block mb-1">
                    {isSwahili ? 'Kiasi cha Pesa (TZS)' : 'Amount Paid (TZS)'}
                  </label>
                  <input
                    type="number"
                    value={interactionAmount}
                    onChange={(e) => setInteractionAmount(e.target.value)}
                    placeholder="e.g. 24000"
                    className="w-full bg-[#1A2E1C] border border-[#2A5038] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C46A]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#2A5038] text-xs text-[#8899AA] hover:text-white"
                >
                  {isSwahili ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !interactionTitle.trim()}
                  className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? (isSwahili ? 'Inahifadhi...' : 'Saving...') : (isSwahili ? 'Hifadhi Kumbukumbu' : 'Save Log')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Activity Timeline Header & Tabs */}
          <div className="px-4 py-2.5 bg-[#0E1712] border-b border-[#243447] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#00C46A]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isSwahili ? 'Kumbukumbu ya Historia' : 'Activity History'}
              </h3>
              <span className="text-[10px] bg-[#122010] text-[#8899AA] px-1.5 py-0.5 rounded-md border border-[#243447]">
                {timelineItems.length}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'interactions', label: 'Interactions' },
                  { id: 'notes', label: 'Notes' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#00C46A] text-[#0A1A0F]'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#122010]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {filteredTimeline.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#122010] border border-[#2A5038] flex items-center justify-center mx-auto text-[#8899AA]">
                  <Clock className="w-6 h-6 text-[#00C46A]/60" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {isSwahili ? 'Hakuna Shughuli Bado' : 'No Activity Logged Yet'}
                </h4>
                <p className="text-xs text-[#8899AA] max-w-xs mx-auto">
                  {isSwahili
                    ? 'Bofya "Unda Agizo Jipya" au "Rekodi Mawasiliano" kuanzisha historia ya mteja huyu.'
                    : 'Click "Create New Order" or "Log Interaction" to begin building this customer\'s activity log.'}
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => onCreateOrder(customer)}
                    className="bg-[#00C46A] text-[#0A1A0F] font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{isSwahili ? 'Agizo la Kwanza' : 'First Order'}</span>
                  </button>
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="bg-[#122010] text-[#00C46A] border border-[#2A5038] font-semibold px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSwahili ? 'Weka Dokezo' : 'Log Note'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#243447]">
                {filteredTimeline.map((item) => {
                  const isOrder = item.type === 'order';
                  const isCall = item.type === 'call';
                  const isVisit = item.type === 'visit';
                  const isPayment = item.type === 'payment';
                  const isRefill = item.type === 'refill';

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-4 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A1A0F] ${
                          isOrder
                            ? 'bg-[#00C46A]'
                            : isCall
                            ? 'bg-cyan-400'
                            : isVisit
                            ? 'bg-amber-400'
                            : isPayment
                            ? 'bg-purple-400'
                            : isRefill
                            ? 'bg-blue-400'
                            : 'bg-emerald-400'
                        }`}
                      />

                      {/* Timeline Card */}
                      <div className="bg-[#122010] border border-[#2A5038] rounded-xl p-3.5 space-y-2 transition-colors hover:border-[#00C46A]/50 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`p-1 rounded-lg ${
                                isOrder
                                  ? 'bg-[#00C46A]/10 text-[#00C46A]'
                                  : isCall
                                  ? 'bg-cyan-500/10 text-cyan-400'
                                  : isVisit
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : isPayment
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {isOrder ? (
                                <ShoppingCart className="w-3.5 h-3.5" />
                              ) : isCall ? (
                                <PhoneCall className="w-3.5 h-3.5" />
                              ) : isVisit ? (
                                <MapPin className="w-3.5 h-3.5" />
                              ) : isPayment ? (
                                <DollarSign className="w-3.5 h-3.5" />
                              ) : isRefill ? (
                                <Droplets className="w-3.5 h-3.5" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                            </span>

                            <h4 className="text-xs font-bold text-white leading-tight">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  item.badgeColor || 'bg-[#243447] text-[#8899AA]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#C0D0E0] leading-relaxed">
                          {item.description}
                        </p>

                        {/* Details row: Amount, Staff, Time */}
                        <div className="pt-2 border-t border-[#243447]/60 flex items-center justify-between text-[10px] text-[#8899AA] flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            {item.amount !== undefined && item.amount > 0 && (
                              <span className="font-semibold text-[#00C46A] bg-[#0A1A0F] px-1.5 py-0.5 rounded border border-[#2A5038]">
                                TZS {item.amount.toLocaleString()}
                              </span>
                            )}
                            {item.staffName && (
                              <span className="text-[#8899AA]/80">
                                {isSwahili ? 'Mhudumu:' : 'By:'} {item.staffName}
                              </span>
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-[#6A7B8C]">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(item.timestamp).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-[#122010] border-t border-[#243447] flex items-center justify-between text-xs text-[#8899AA]">
            <span className="text-[11px]">
              {isSwahili ? 'Mteja:' : 'Customer:'} <strong className="text-white">{customer.name}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#243447] hover:bg-[#344860] text-white text-xs font-semibold"
            >
              {isSwahili ? 'Funga' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
