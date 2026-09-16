import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { Order, EodReport } from '../types';
import {
  FileText,
  CheckCircle2,
  Download,
  Printer,
  DollarSign,
  Truck,
  Send,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface EodReportScreenProps {
  onNavigate: (view: string) => void;
}

export const EodReportScreen: React.FC<EodReportScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<EodReport | null>(null);

  useEffect(() => {
    const loadedOrders = storageService.getOrders();
    setOrders(loadedOrders);
    const reports = storageService.getReports();
    if (reports.length > 0) {
      setSubmittedReport(reports[0]);
    }
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDeliveries = orders.length;
  const deliveredCount = orders.filter((o) => o.status === 'approved' || o.status === 'pending').length;
  const collectedCount = orders.filter((o) => o.paymentMethod === 'cash' || o.paymentMethod === 'mobile').length;
  const partialCount = 0;

  const handleSubmitEod = async () => {
    setIsSubmitting(true);
    try {
      const deliveries = orders.map((o) => ({
        customer: o.customerName,
        items: o.items.map((i) => `${i.qty}x ${i.name}`).join(', '),
        amount: o.subtotal,
        status: 'delivered' as const,
        time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      const report = await storageService.saveReport({
        staffId: user?.employeeId || 'ZZ-2024-001',
        reportDate: new Date().toISOString(),
        totalRevenue,
        totalDeliveries,
        deliveredCount,
        collectedCount,
        partialCount,
        deliveries,
        fieldNotes,
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSubmittedReport(report);
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Customer', 'Items', 'Amount (TZS)', 'Status', 'Payment Method', 'Time'];
    const rows = orders.map((o) => [
      `"${o.customerName}"`,
      `"${o.items.map((i) => `${i.qty}x ${i.name}`).join('; ')}"`,
      o.subtotal,
      o.status || 'completed',
      o.paymentMethod,
      new Date(o.createdAt).toLocaleTimeString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zamzam_eod_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00C46A]" />
            <span>End-of-Day (EOD) Reconciliation</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Shift reconciliation, cash tally, and supervisor report submission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#8899AA]" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {submittedReport && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-4 rounded-xl flex items-center justify-between text-white text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#00C46A]" />
            <div>
              <div className="font-bold">EOD Report Submitted to Dispatch</div>
              <div className="text-xs text-[#8899AA] mt-0.5">
                Reference ID: <span className="font-mono text-white">{submittedReport.id}</span> &bull; Status:{' '}
                <span className="uppercase text-[#00C46A] font-bold">{submittedReport.syncStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Total Revenue</div>
          <div className="text-lg font-bold font-mono text-[#00C46A] mt-1">
            TZS {totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Total Deliveries</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {totalDeliveries} stops
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Collections Verified</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {collectedCount} accounts
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Bottles Empties In</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            65 units
          </div>
        </div>
      </div>

      {/* 2. Today's Completed Delivery List */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#00C46A]" />
            <span>Shift Delivery Logs</span>
          </h2>
          <span className="text-xs text-[#8899AA] font-mono">{orders.length} orders recorded</span>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#8899AA]">
            No delivery orders recorded for this shift yet.
          </div>
        ) : (
          <div className="divide-y divide-[#243447]">
            {orders.map((order) => (
              <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{order.customerName}</div>
                  <div className="text-[#8899AA] mt-0.5">
                    {order.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                  </div>
                  <div className="text-[10px] text-[#8899AA] mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                    <span className="uppercase font-semibold text-[#00C46A]">{order.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-white text-sm">
                    TZS {order.subtotal.toLocaleString()}
                  </div>
                  <span className="inline-block mt-1 text-[10px] bg-[#006B3C]/40 text-[#00C46A] font-semibold px-2 py-0.5 rounded">
                    Delivered
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Field Notes & Supervisor Handover */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-4">
        <div>
          <label className="text-xs font-semibold text-white uppercase tracking-wider block mb-1.5">
            Field Notes & Vehicle Inventory Handover
          </label>
          <textarea
            rows={3}
            value={fieldNotes}
            onChange={(e) => setFieldNotes(e.target.value)}
            placeholder="Record empty bottle returns, vehicle odometer, fuel expenses, or customer route notes..."
            className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl p-3 text-xs text-white placeholder-[#8899AA] focus:outline-none focus:border-[#00C46A]"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmitEod}
          disabled={isSubmitting || orders.length === 0}
          className="w-full bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Submitting to Central Dispatch...' : 'Sign & Submit EOD Report'}</span>
        </button>
      </div>
    </div>
  );
};
