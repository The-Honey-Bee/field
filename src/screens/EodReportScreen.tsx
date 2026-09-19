import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Order, EodReport, ProofImage } from '../types';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { VoiceDictationInput } from '../components/VoiceDictationInput';
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
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  X,
  Eye,
  Plus,
  Check,
  Sparkles,
  Layers,
  ZoomIn,
} from 'lucide-react';

interface EodReportScreenProps {
  onNavigate: (view: string) => void;
}

export const EodReportScreen: React.FC<EodReportScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t, isSwahili } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [proofImages, setProofImages] = useState<ProofImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<EodReport | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewModalImage, setPreviewModalImage] = useState<ProofImage | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleProcessFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        let category: ProofImage['category'] = 'other';
        const lower = file.name.toLowerCase();
        if (lower.includes('bottle') || lower.includes('empty')) category = 'bottles';
        else if (lower.includes('odo') || lower.includes('meter') || lower.includes('km')) category = 'odometer';
        else if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel')) category = 'fuel';
        else if (lower.includes('receipt') || lower.includes('slip') || lower.includes('invoice')) category = 'receipt';
        else if (lower.includes('damage') || lower.includes('leak') || lower.includes('broken')) category = 'damage';

        const newProof: ProofImage = {
          id: 'proof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          dataUrl,
          name: file.name,
          category,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setProofImages((prev) => [...prev, newProof]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemoveProof = (id: string) => {
    setProofImages((prev) => prev.filter((p) => p.id !== id));
    if (previewModalImage?.id === id) {
      setPreviewModalImage(null);
    }
  };

  const handleUpdateCategory = (id: string, category: ProofImage['category']) => {
    setProofImages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, category } : p))
    );
  };

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
        proofImages,
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
      {/* Hidden file input for standard picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      {/* Hidden file input for direct camera capture */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00C46A]" />
            <span>{t('eod.title', 'End-of-Day (EOD) Reconciliation')}</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {t('eod.desc', 'Shift reconciliation, visual proof verification, cash tally, and supervisor sign-off.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>{t('eod.export_csv', 'Export CSV')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#8899AA]" />
            <span>{t('eod.print', 'Print')}</span>
          </button>
        </div>
      </div>

      {submittedReport && (
        <div className="bg-[#006B3C]/20 border border-[#00C46A] p-4 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-white text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#00C46A] shrink-0" />
              <div>
                <div className="font-bold">{t('eod.submitted_title', 'EOD Report Submitted to Dispatch')}</div>
                <div className="text-xs text-[#8899AA] mt-0.5">
                  Reference ID: <span className="font-mono text-white">{submittedReport.id}</span> &bull; Status:{' '}
                  <span className="uppercase text-[#00C46A] font-bold">{submittedReport.syncStatus}</span>
                </div>
              </div>
            </div>
            <span className="text-[11px] bg-[#00C46A]/20 text-[#00C46A] px-2.5 py-1 rounded-full font-bold">
              {submittedReport.proofImages?.length || 0} {t('eod.proofs_attached', 'Visual Proofs Attached')}
            </span>
          </div>

          {submittedReport.proofImages && submittedReport.proofImages.length > 0 && (
            <div className="pt-2 border-t border-[#00C46A]/30">
              <div className="text-[11px] text-[#8899AA] font-semibold mb-2">{t('eod.attached_records', 'Attached Proof Records:')}</div>
              <div className="flex flex-wrap gap-2">
                {submittedReport.proofImages.map((proof) => (
                  <button
                    key={proof.id}
                    type="button"
                    onClick={() => setPreviewModalImage(proof)}
                    className="relative group rounded-lg overflow-hidden border border-[#00C46A]/40 w-16 h-16 bg-[#162719] hover:border-[#00C46A] transition-all"
                  >
                    <img
                      src={proof.dataUrl}
                      alt={proof.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">{t('eod.total_revenue', 'Total Revenue')}</div>
          <div className="text-lg font-bold font-mono text-[#00C46A] mt-1">
            TZS {totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">{t('eod.total_deliveries', 'Total Deliveries')}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {totalDeliveries} {t('eod.stops', 'stops')}
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">{t('eod.collections_verified', 'Collections Verified')}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {collectedCount} {t('eod.accounts', 'accounts')}
          </div>
        </div>

        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="text-[11px] text-[#8899AA] uppercase font-semibold">{t('eod.bottles_empties_in', 'Bottles Empties In')}</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            65 {t('eod.units', 'units')}
          </div>
        </div>
      </div>

      {/* 2. Today's Completed Delivery List */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#00C46A]" />
            <span>{t('eod.shift_logs', 'Shift Delivery Logs')}</span>
          </h2>
          <span className="text-xs text-[#8899AA] font-mono">{orders.length} {t('eod.orders_recorded', 'orders recorded')}</span>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#8899AA]">
            {t('eod.no_orders', 'No delivery orders recorded for this shift yet.')}
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
                    {t('eod.delivered', 'Delivered')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Visual Proof Image Upload Area for Field Staff */}
      <div className="bg-[#122010] p-5 sm:p-6 rounded-2xl border border-[#2A5038] space-y-5">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#00C46A]" />
                <span>{t('eod.visual_proof_title', 'Visual Proof & Vehicle Inventory Handover')}</span>
                <span className="bg-[#00C46A]/20 text-[#00C46A] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {t('eod.field_staff_upload', 'Field Staff Upload')}
                </span>
              </label>
              <p className="text-xs text-[#8899AA] mt-1">
                {t('eod.visual_proof_desc', 'Provide visual evidence for supervisor verification: empty bottle counts, vehicle odometer, fuel vouchers, or warehouse receiving slips.')}
              </p>
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer transition-all border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 select-none group ${
              isDragging
                ? 'border-[#00C46A] bg-[#00C46A]/10 scale-[1.01]'
                : 'border-[#2A5038] hover:border-[#00C46A]/80 bg-[#162719]/50 hover:bg-[#162719]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#006B3C]/30 border border-[#00C46A]/40 flex items-center justify-center text-[#00C46A] group-hover:scale-110 transition-transform shadow-lg shadow-[#006B3C]/10">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <div className="text-sm font-bold text-white group-hover:text-[#00C46A] transition-colors">
                {isDragging ? t('eod.drop_images', 'Drop images here to attach') : t('eod.drag_or_click', 'Click to select or drag & drop visual proofs')}
              </div>
              <p className="text-xs text-[#8899AA] mt-1">
                {t('eod.supported_formats', 'Supports JPG, PNG, WebP or camera capture (Up to 10MB per photo)')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2" onClick={(e) => e.stopPropagation()}>
              {/* Primary Native Camera Button */}
              <button
                type="button"
                id="btn-take-photo-camera"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                    setIsCameraOpen(true);
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                className="flex items-center gap-2 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#00C46A]/20 hover:scale-[1.02] active:scale-95"
              >
                <Camera className="w-4 h-4 text-[#0A1A0F]" />
                <span>{t('eod.take_photo', 'Take Photo (Camera)')}</span>
              </button>

              {/* Browse Files Button */}
              <button
                type="button"
                id="btn-browse-proof-files"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#253D28] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#2A5038]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{t('eod.browse_files', 'Browse Files')}</span>
              </button>

              {/* Direct OS Native Camera Trigger Fallback */}
              <button
                type="button"
                id="btn-direct-os-camera"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-[#006B3C]/30 hover:bg-[#006B3C]/50 border border-[#00C46A]/40 text-[#D0E8F0] px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:text-white"
                title="Directly trigger device built-in camera app"
              >
                <Camera className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>{t('eod.native_app', 'Native App')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery of Uploaded Proofs */}
        {proofImages.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="font-semibold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-[#00C46A]" />
                <span>{t('eod.attached_evidence', 'Attached Visual Evidence')} ({proofImages.length})</span>
              </div>
              <span className="text-[#8899AA]">{t('eod.click_inspect', 'Click preview to inspect full size')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {proofImages.map((proof) => (
                <div
                  key={proof.id}
                  className="bg-[#162719] rounded-xl border border-[#2A5038] overflow-hidden flex flex-col group hover:border-[#00C46A]/60 transition-all"
                >
                  {/* Image Thumbnail with Hover Controls */}
                  <div className="relative aspect-video w-full bg-black/40 overflow-hidden">
                    <img
                      src={proof.dataUrl}
                      alt={proof.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex items-start justify-between p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm border border-white/10">
                        {proof.uploadedAt}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewModalImage(proof)}
                          className="w-7 h-7 rounded-lg bg-black/70 hover:bg-[#006B3C] text-white flex items-center justify-center transition-colors"
                          title="Zoom / View full size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProof(proof.id)}
                          className="w-7 h-7 rounded-lg bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white flex items-center justify-center transition-colors"
                          title="Remove proof"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tag Selector & File Details */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white truncate" title={proof.name}>
                        {proof.name}
                      </div>
                      <div className="text-[11px] text-[#8899AA] mt-0.5">
                        {t('eod.category_label', 'Verification Category:')}
                      </div>
                    </div>

                    <select
                      value={proof.category || 'other'}
                      onChange={(e) =>
                        handleUpdateCategory(proof.id, e.target.value as ProofImage['category'])
                      }
                      className="w-full bg-[#1A2E1C] border border-[#2A5038] text-white text-[11px] rounded-lg p-1.5 focus:outline-none focus:border-[#00C46A]"
                    >
                      <option value="bottles">{t('eod.cat_bottles', 'Empty Bottles Return Tally')}</option>
                      <option value="odometer">{t('eod.cat_odometer', 'Vehicle Odometer Reading')}</option>
                      <option value="fuel">{t('eod.cat_fuel', 'Fuel Expense Voucher')}</option>
                      <option value="receipt">{t('eod.cat_receipt', 'Signed Delivery Challan')}</option>
                      <option value="damage">{t('eod.cat_damage', 'Bottle Damage / Leakage')}</option>
                      <option value="other">{t('eod.cat_other', 'General Field Proof')}</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accompanying Notes with Google Web Speech Voice-to-Text Dictation */}
        <div className="pt-2 border-t border-[#243447]">
          <VoiceDictationInput
            id="eod-field-observations"
            label={t('eod.handover_remarks', 'Handover Remarks & Site Observations')}
            value={fieldNotes}
            onChange={setFieldNotes}
            placeholder={t('eod.remarks_placeholder', 'Dictate with microphone or type observations (e.g., 65 empty bottles inspected & returned to depot bay, van odometer 142,890 km, 20L diesel filled)...')}
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmitEod}
          disabled={isSubmitting || orders.length === 0}
          className="w-full bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>
            {isSubmitting
              ? t('eod.submitting', 'Submitting to Central Dispatch...')
              : isSwahili
              ? `Weka Sahihi na Tuma Ripoti ya Siku yenye Ushahidi ${proofImages.length}`
              : `Sign & Submit EOD Report with ${proofImages.length} Proof${proofImages.length === 1 ? '' : 's'}`}
          </span>
        </button>
      </div>

      {/* Fullscreen Proof Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="bg-[#122010] border border-[#00C46A]/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2A5038] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#00C46A]" />
                  <span>{previewModalImage.name}</span>
                </h3>
                <span className="text-xs text-[#8899AA]">
                  Category:{' '}
                  <span className="text-[#00C46A] font-semibold capitalize">
                    {previewModalImage.category || 'General'}
                  </span>{' '}
                  &bull; Uploaded {previewModalImage.uploadedAt}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="w-8 h-8 rounded-lg bg-[#1A2E1C] hover:bg-[#253D28] text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-black/60 flex items-center justify-center overflow-auto max-h-[65vh]">
              <img
                src={previewModalImage.dataUrl}
                alt={previewModalImage.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-4 border-t border-[#2A5038] flex items-center justify-between text-xs">
              <span className="text-[#8899AA]">Staff Visual Proof Verification</span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-1.5 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Camera Live Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(newProof) => setProofImages((prev) => [newProof, ...prev])}
        onFallbackToNativeInput={() => cameraInputRef.current?.click()}
      />
    </div>
  );
};
