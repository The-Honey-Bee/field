import React, { useState, useEffect } from 'react';
import { EodReport } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import {
  X,
  Save,
  Trash2,
  FileCheck,
  DollarSign,
  Truck,
  RotateCcw,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface EditReportModalProps {
  report: EodReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedReport: EodReport) => void;
  onDelete?: (reportId: string) => void;
}

export const EditReportModal: React.FC<EditReportModalProps> = ({
  report,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const { isSwahili } = useLanguage();

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [partialCount, setPartialCount] = useState(0);
  const [fieldNotes, setFieldNotes] = useState('');
  const [syncStatus, setSyncStatus] = useState<'pending' | 'submitted' | 'reviewed'>('submitted');
  const [staffId, setStaffId] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setTotalRevenue(report.totalRevenue || 0);
      setTotalDeliveries(report.totalDeliveries || 0);
      setDeliveredCount(report.deliveredCount || 0);
      setCollectedCount(report.collectedCount || 0);
      setPartialCount(report.partialCount || 0);
      setFieldNotes(report.fieldNotes || '');
      setSyncStatus(report.syncStatus as any || 'submitted');
      setStaffId(report.staffId || '');
      setReportDate(report.reportDate || report.createdAt || new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [report]);

  if (!isOpen || !report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await storageService.updateReport(report.id, {
        totalRevenue: Number(totalRevenue),
        totalDeliveries: Number(totalDeliveries),
        deliveredCount: Number(deliveredCount),
        collectedCount: Number(collectedCount),
        partialCount: Number(partialCount),
        fieldNotes: fieldNotes.trim(),
        syncStatus,
        staffId: staffId.trim(),
        reportDate,
      });

      if (updated) {
        onSave(updated);
        onClose();
      } else {
        setError(isSwahili ? 'Hitilafu wakati wa kuhifadhi ripoti' : 'Failed to update report');
      }
    } catch (err: any) {
      setError(err?.message || 'Error updating report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    const confirmPrompt = isSwahili
      ? `Je, una uhakika unataka kufuta ripoti ya EOD ${report.id} ya mfanyakazi "${report.staffId}"? Rekodi hii itafutwa kabisa.`
      : `Are you sure you want to permanently delete EOD report ${report.id} for staff "${report.staffId}"? This cannot be undone.`;

    if (window.confirm(confirmPrompt)) {
      if (onDelete) {
        onDelete(report.id);
      } else {
        storageService.deleteReport(report.id);
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
        className="bg-[#0D1E12] border border-[#2A5038] max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
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
                  {isSwahili ? 'Hariri Ripoti ya EOD (Msimamizi)' : 'Supervisor EOD Report Editor'}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#122010] text-[#00C46A] border border-[#2A5038]">
                  {report.id}
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili ? 'Kurekebisha mapato, hesabu ya chupa na hali ya upatanisho' : 'Adjust revenue figures, bottle audits and reconciliation status'}
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

          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1">
                {isSwahili ? 'Kitambulisho cha Dereva' : 'Staff Employee ID'}
              </label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1">
                {isSwahili ? 'Tarehe ya Ripoti' : 'Report Date'}
              </label>
              <input
                type="date"
                value={reportDate.includes('T') ? reportDate.split('T')[0] : reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899AA] mb-1">
                {isSwahili ? 'Hali ya Uhakiki' : 'Audit Status'}
              </label>
              <select
                value={syncStatus}
                onChange={(e: any) => setSyncStatus(e.target.value)}
                className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="pending">{isSwahili ? 'Inasubiri (Pending)' : 'Pending'}</option>
                <option value="submitted">{isSwahili ? 'Imewasilishwa (Submitted)' : 'Submitted'}</option>
                <option value="reviewed">{isSwahili ? 'Imekaguliwa (Reviewed / Verified)' : 'Reviewed / Verified'}</option>
              </select>
            </div>
          </div>

          {/* Total Revenue Box */}
          <div className="bg-[#122010] p-3.5 rounded-xl border border-[#243447] space-y-2">
            <label className="block text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{isSwahili ? 'Jumla ya Mapato Yaliyokusanywa (TZS)' : 'Total Revenue Collected (TZS)'}</span>
              </span>
              <span className="text-[11px] font-mono text-[#00C46A]">
                {Number(totalRevenue).toLocaleString()} TZS
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={totalRevenue}
              onChange={(e) => setTotalRevenue(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#0D1E12] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2.5 text-base font-black text-[#00C46A] font-mono outline-none"
            />
          </div>

          {/* Bottle and Stop Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#122010] p-2.5 rounded-xl border border-[#243447]">
              <label className="block text-[11px] text-[#8899AA] mb-1">
                {isSwahili ? 'Vituo vya Njia' : 'Total Stops'}
              </label>
              <input
                type="number"
                min="0"
                value={totalDeliveries}
                onChange={(e) => setTotalDeliveries(parseInt(e.target.value) || 0)}
                className="w-full bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center outline-none"
              />
            </div>

            <div className="bg-[#122010] p-2.5 rounded-xl border border-[#243447]">
              <label className="block text-[11px] text-[#8899AA] mb-1">
                {isSwahili ? 'Zilizofikishwa' : 'Delivered'}
              </label>
              <input
                type="number"
                min="0"
                value={deliveredCount}
                onChange={(e) => setDeliveredCount(parseInt(e.target.value) || 0)}
                className="w-full bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center outline-none"
              />
            </div>

            <div className="bg-[#122010] p-2.5 rounded-xl border border-[#243447]">
              <label className="block text-[11px] text-[#8899AA] mb-1">
                {isSwahili ? 'Zilizokusanywa' : 'Collected Tupu'}
              </label>
              <input
                type="number"
                min="0"
                value={collectedCount}
                onChange={(e) => setCollectedCount(parseInt(e.target.value) || 0)}
                className="w-full bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center outline-none"
              />
            </div>

            <div className="bg-[#122010] p-2.5 rounded-xl border border-[#243447]">
              <label className="block text-[11px] text-[#8899AA] mb-1">
                {isSwahili ? 'Zilizo Nusu' : 'Partial Returns'}
              </label>
              <input
                type="number"
                min="0"
                value={partialCount}
                onChange={(e) => setPartialCount(parseInt(e.target.value) || 0)}
                className="w-full bg-[#0D1E12] border border-[#243447] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center outline-none"
              />
            </div>
          </div>

          {/* Field Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#8899AA] mb-1">
              {isSwahili ? 'Maelezo ya Zamu na Upatanisho' : 'Field Supervisor Notes & Reconciliations'}
            </label>
            <textarea
              rows={3}
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              placeholder="e.g., Cash envelope deposited to Nyakato vault, all empty 18.9L bottles accounted for."
              className="w-full bg-[#122010] border border-[#243447] focus:border-[#00C46A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#8899AA] outline-none resize-none"
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
              <span>{isSwahili ? 'Futa Ripoti Hii' : 'Delete Report'}</span>
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
