import React, { useState, useEffect } from 'react';
import { Order, OrderItem, PaymentMethod } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import {
  X,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  DollarSign,
  User,
  MapPin,
  CreditCard,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
  onDelete?: (orderId: string) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const { isSwahili } = useLanguage();

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [staffId, setStaffId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || '');
      setCustomerAddress(order.customerAddress || '');
      setPaymentMethod(order.paymentMethod || 'cash');
      setStatus(order.status || 'pending');
      setStaffId(order.staffId || '');
      setItems(order.items && order.items.length > 0 ? JSON.parse(JSON.stringify(order.items)) : []);
      setSubtotal(order.subtotal || 0);
      setAmountReceived(order.amountReceived || order.subtotal || 0);
      setError(null);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleItemQtyChange = (index: number, newQty: number) => {
    const updated = [...items];
    const qty = Math.max(1, newQty);
    const itemPrice = updated[index].price || 0;
    updated[index] = { ...updated[index], qty, subtotal: qty * itemPrice };
    setItems(updated);
    recalculateSubtotal(updated);
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    const updated = [...items];
    const price = Math.max(0, newPrice);
    const itemQty = updated[index].qty || 1;
    updated[index] = { ...updated[index], price, subtotal: itemQty * price };
    setItems(updated);
    recalculateSubtotal(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    recalculateSubtotal(updated);
  };

  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: 'item-' + Date.now(),
      name: '18.9L Pure Water Refill',
      qty: 1,
      price: 8000,
      subtotal: 8000,
    };
    const updated = [...items, newItem];
    setItems(updated);
    recalculateSubtotal(updated);
  };

  const recalculateSubtotal = (itemList: OrderItem[]) => {
    const sum = itemList.reduce((acc, curr) => acc + (curr.price || 0) * (curr.qty || 1), 0);
    setSubtotal(sum);
    setAmountReceived(sum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError(isSwahili ? 'Tafadhali ingiza jina la mteja' : 'Please provide customer name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const calculatedChange = Math.max(0, amountReceived - subtotal);
      const updated = await storageService.updateOrder(order.id, {
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim(),
        paymentMethod,
        status,
        staffId: staffId.trim(),
        items,
        subtotal,
        amountReceived,
        changeAmount: calculatedChange,
      });

      if (updated) {
        onSave(updated);
        onClose();
      } else {
        setError(isSwahili ? 'Imeshindikana kusasisha agizo' : 'Failed to update order');
      }
    } catch (err: any) {
      setError(err?.message || 'Error updating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    const confirmPrompt = isSwahili
      ? `Je, una uhakika unataka kufuta agizo ${order.id} la mteja "${order.customerName}"? Hatua hii haiwezi kutenduliwa.`
      : `Are you sure you want to permanently delete order ${order.id} for "${order.customerName}"? This action cannot be undone.`;

    if (window.confirm(confirmPrompt)) {
      if (onDelete) {
        onDelete(order.id);
      } else {
        storageService.deleteOrder(order.id);
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
        className="bg-[#0D1E12] border border-[#2A5038] max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
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
                  {isSwahili ? 'Hariri Agizo la Msimamizi' : 'Supervisor Order Editor'}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#122010] text-[#00C46A] border border-[#2A5038]">
                  {order.id}
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili ? 'Mamlaka ya Msimamizi: Hariri au Futa rekodi ya agizo' : 'Supervisor Authority: Edit or Delete order record'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-xl text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Customer & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{isSwahili ? 'Jina la Mteja' : 'Customer Name'}</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8899AA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{isSwahili ? 'Mahali / Anwani ya Uwasilishaji' : 'Delivery Address / Territory'}</span>
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g., Capripoint waterfront, Mwanza"
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8899AA] outline-none"
              />
            </div>
          </div>

          {/* Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1">
                {isSwahili ? 'Hali ya Idhini' : 'Order Status'}
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="pending">{isSwahili ? 'Inasubiri (Pending)' : 'Pending Review'}</option>
                <option value="approved">{isSwahili ? 'Imeidhinishwa (Approved)' : 'Approved'}</option>
                <option value="rejected">{isSwahili ? 'Imekataliwa (Rejected)' : 'Rejected'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{isSwahili ? 'Njia ya Malipo' : 'Payment Method'}</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white outline-none uppercase"
              >
                <option value="cash">Cash (Fedha Taslimu)</option>
                <option value="mobile">Mobile Money (M-Pesa / Tigo / Airtel)</option>
                <option value="credit">Invoice / Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1">
                {isSwahili ? 'Kitambulisho cha Mfanyakazi' : 'Staff Employee ID'}
              </label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="ZZ-FIELD-01"
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* Items & Quantities */}
          <div className="bg-[#122010] p-3.5 rounded-xl border border-[#243447] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{isSwahili ? 'Bidhaa na Idadi ya Chupa' : 'Order Line Items'}</span>
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-bold text-[#00C46A] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isSwahili ? 'Ongeza Bidhaa' : 'Add Item'}</span>
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#0D1E12] p-2.5 rounded-lg border border-[#1A2E1C]">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    setItems(updated);
                  }}
                  className="flex-1 bg-transparent text-xs text-white outline-none font-medium"
                />

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#8899AA]">{isSwahili ? 'Idadi:' : 'Qty:'}</span>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 1)}
                      className="w-14 bg-[#122010] border border-[#243447] rounded px-1.5 py-1 text-xs text-white text-center font-mono outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#8899AA]">{isSwahili ? 'Bei:' : 'Price:'}</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={item.price}
                      onChange={(e) => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-20 bg-[#122010] border border-[#243447] rounded px-1.5 py-1 text-xs text-white text-right font-mono outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-red-400 hover:text-red-300 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Financial Totals */}
            <div className="pt-2 border-t border-[#1A2E1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#8899AA]">{isSwahili ? 'Pesa Iliyopokelewa:' : 'Cash Received:'}</span>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1 text-xs text-white font-mono text-right outline-none"
                />
                <span className="text-[#8899AA]">TZS</span>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-[#8899AA] font-semibold">{isSwahili ? 'Jumla Kuu:' : 'Subtotal:'}</span>
                <input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-32 bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1 text-sm font-black text-[#00C46A] font-mono text-right outline-none"
                />
                <span className="text-[#00C46A] font-bold">TZS</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#243447] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3.5 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSwahili ? 'Futa Agizo Kabisa' : 'Delete Order'}</span>
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
