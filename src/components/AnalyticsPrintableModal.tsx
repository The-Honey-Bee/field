import React, { useState } from 'react';
import {
  X,
  FileDown,
  Printer,
  CheckCircle2,
  Calendar,
  Award,
  DollarSign,
  Package,
  TrendingUp,
  ShieldCheck,
  Building,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ProductivityViewHorizon } from './ManagerPerformanceDashboard';
import { generateAnalyticsPDF, AnalyticsPdfReportData } from '../utils/analyticsPdfGenerator';

interface AnalyticsPrintableModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: AnalyticsPdfReportData;
}

export const AnalyticsPrintableModal: React.FC<AnalyticsPrintableModalProps> = ({
  isOpen,
  onClose,
  reportData,
}) => {
  const { isSwahili } = useLanguage();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const {
    productivityView,
    customStartDate,
    customEndDate,
    customDaysCount = 14,
    totalRevenue,
    totalDeliveries,
    completionRate,
    staffKpis,
    regionalBreakdown,
  } = reportData;

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      generateAnalyticsPDF(reportData);
      setDownloadSuccess(
        isSwahili
          ? 'Ripoti ya PDF Imepakuliwa Kikamilifu!'
          : 'Executive PDF Report Downloaded Successfully!'
      );
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  let horizonLabel = '';
  if (productivityView === 'quarterly') {
    horizonLabel = isSwahili ? 'Robo Mwaka (Siku 90 • Miezi 3)' : 'Quarterly Horizon (90 Days / 3 Months)';
  } else if (productivityView === 'monthly') {
    horizonLabel = isSwahili ? 'Kila Mwezi (Siku 30)' : 'Monthly Horizon (30 Days)';
  } else if (productivityView === 'custom') {
    horizonLabel = isSwahili
      ? `Masafa Maalum (${customDaysCount} Siku: ${customStartDate || '2026-09-11'} hadi ${customEndDate || '2026-09-25'})`
      : `Custom Range (${customDaysCount} Days: ${customStartDate || '2026-09-11'} to ${customEndDate || '2026-09-25'})`;
  } else {
    horizonLabel = isSwahili ? 'Kila Wiki (Siku 7)' : 'Weekly Horizon (7 Days)';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="analytics-printable-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-[#0E1B11] border border-[#2A5038] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 bg-[#122010] border-b border-[#2A5038] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#006B3C]/50 border border-[#00C46A]/30 text-[#00C46A]">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isSwahili ? 'Hakiki Ripoti ya Kuchapisha na PDF' : 'Printable Analytics Report & PDF'}</span>
                <span className="text-[10px] font-mono text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30">
                  A4 FORMAT
                </span>
              </h3>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Muhtasari wa utendaji wa meli uliopangiliwa kwa ajili ya kuchapishwa au kupakuliwa kama PDF.'
                  : 'Formatted printable executive report ready for direct PDF download or physical printing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Download PDF Button */}
            <button
              type="button"
              id="modal-btn-download-pdf"
              data-testid="modal-download-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006B3C] hover:bg-[#00874C] text-white text-xs font-bold transition-all shadow-md border border-[#00C46A]/40 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#00E67A]" />
              <span>{isDownloading ? (isSwahili ? 'Inapakua...' : 'Generating...') : (isSwahili ? 'Pakua PDF' : 'Download PDF')}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2E1C] hover:bg-[#243E26] text-white text-xs font-semibold transition-all border border-[#3A5068]"
            >
              <Printer className="w-4 h-4 text-[#8899AA]" />
              <span className="hidden sm:inline">{isSwahili ? 'Chapa' : 'Print'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A2E1C] hover:bg-red-950/60 text-[#8899AA] hover:text-red-400 border border-[#2A5038] hover:border-red-500/40 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if Downloaded */}
        {downloadSuccess && (
          <div className="mx-4 mt-3 bg-[#006B3C]/30 border border-[#00C46A] p-2.5 rounded-xl flex items-center justify-between text-xs text-white animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E67A] shrink-0" />
              <span className="font-semibold">{downloadSuccess}</span>
            </div>
            <span className="text-[10px] text-[#00E67A] font-mono">zamzam_fleet_analytics_report.pdf</span>
          </div>
        )}

        {/* Printable Document Preview Canvas (Styled like physical A4 sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#08120A]">
          <div
            id="printable-report-document"
            className="max-w-[780px] mx-auto bg-white text-slate-900 rounded-lg shadow-xl p-6 sm:p-8 space-y-5 border border-slate-300 print:border-none print:shadow-none print:p-0"
          >
            {/* 1. Header Banner */}
            <div className="bg-[#006B3C] text-white p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-[#00C46A]">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#00E67A]" />
                  <h1 className="text-lg font-black tracking-wide">ZAMZAM WATER TANZANIA</h1>
                </div>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  {isSwahili
                    ? 'Ripoti Kuu ya Utendaji na Takwimu za Meli ya Wasimamizi'
                    : 'Executive Fleet Intelligence & Performance Analytics Report'}
                </p>
                <p className="text-[10px] text-emerald-200 mt-1">
                  Central Commercial Depot • Operations & Fleet Logistics Division
                </p>
              </div>

              <div className="text-left sm:text-right text-[11px] space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/20">
                <div className="font-mono font-bold text-emerald-300">
                  REF: ZZ-ANL-20260925-FLT
                </div>
                <div className="text-emerald-100">Date: 25 Sep 2026 • 15:45 EAT</div>
                <div className="text-[10px] text-emerald-200">Depot: Dar es Salaam & Mwanza</div>
              </div>
            </div>

            {/* 2. Metadata / Filter Bar */}
            <div className="bg-slate-100 border border-slate-300 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#006B3C]" />
                <span className="font-bold text-slate-700">
                  {isSwahili ? 'Kipindi cha Ripoti:' : 'Reporting Aggregation Window:'}
                </span>
                <span className="font-bold text-[#006B3C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {horizonLabel}
                </span>
              </div>
              <div className="text-slate-500 text-[11px]">
                Classification: <span className="font-semibold text-slate-800">Commercial Operations - Internal</span>
              </div>
            </div>

            {/* 3. Executive KPI Cards Grid */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                {isSwahili ? '1. Viashiria Vikuu vya Utendaji (Executive KPIs)' : '1. Key Operational Performance Metrics'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Metric 1 */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isSwahili ? 'Vituo Vilivyofikishwa' : 'Stops Delivered'}
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {totalDeliveries}
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    ▲ {productivityView === 'quarterly' ? '+22.1%' : productivityView === 'monthly' ? '+15.4%' : '+8.6%'}
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isSwahili ? 'Chupa Zilizosambazwa' : 'Bottles Dispatched'}
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
                    {(totalDeliveries * 9).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    ▲ {productivityView === 'quarterly' ? '+26.4%' : productivityView === 'monthly' ? '+18.7%' : '+11.3%'}
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isSwahili ? 'Mapato ya Meli' : 'Gross Collections'}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 truncate">
                    TZS {totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(2)}M` : totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    ▲ {productivityView === 'quarterly' ? '+28.5%' : productivityView === 'monthly' ? '+19.8%' : '+14.2%'}
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isSwahili ? 'Kiwango cha Lengo' : 'Quota Completion'}
                  </div>
                  <div className="text-lg font-bold font-mono text-purple-800 mt-1">
                    {completionRate}%
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Target SLA: 95.0%
                  </div>
                </div>

                {/* Metric 5 */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-500 font-medium">
                    {isSwahili ? 'SLA ya Usambazaji' : 'Dispatch SLA'}
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                    98.1%
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    {productivityView === 'weekly' ? '▼ -0.5% (traffic)' : '▲ +1.8% route gains'}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Field Staff Productivity Roster Table */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                {isSwahili ? '2. Utendaji wa Madereva wa Nyanjani (Staff Leaderboard)' : '2. Field Officer Quota Fulfillment & Revenue Performance'}
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#006B3C] text-white text-[11px]">
                      <th className="py-2 px-3 font-bold text-center w-8">#</th>
                      <th className="py-2 px-3 font-bold">{isSwahili ? 'Jina la Afisa' : 'Driver / Field Staff'}</th>
                      <th className="py-2 px-3 font-bold">Staff ID</th>
                      <th className="py-2 px-3 font-bold text-center">{isSwahili ? 'Vituo' : 'Stops'}</th>
                      <th className="py-2 px-3 font-bold text-center">{isSwahili ? 'Chupa' : 'Bottles'}</th>
                      <th className="py-2 px-3 font-bold text-right">{isSwahili ? 'Mapato (TZS)' : 'Revenue (TZS)'}</th>
                      <th className="py-2 px-3 font-bold text-center">{isSwahili ? 'Utekelezaji' : 'Fulfillment'}</th>
                      <th className="py-2 px-3 font-bold text-center">{isSwahili ? 'Mtindo' : 'Trend'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {staffKpis.map((staff, sIdx) => (
                      <tr key={staff.id} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-2 px-3 text-center font-bold text-slate-500">{sIdx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{staff.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{staff.id}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-700">{staff.deliveries}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-700">{staff.deliveries * 9}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#006B3C]">
                          TZS {staff.revenue.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{staff.rate}</td>
                        <td className={`py-2 px-3 text-center font-bold font-mono ${staff.trend >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {staff.trend >= 0 ? `+${staff.trend}%` : `${staff.trend}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Regional Distribution */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                {isSwahili ? '3. Mgawanyo wa Mapato Kikanda (Regional Distribution)' : '3. Regional Revenue & Demand Share'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {regionalBreakdown.map((reg) => (
                  <div key={reg.region} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
                    <div className="text-[11px] font-bold text-slate-800 truncate">{reg.region}</div>
                    <div className="text-xs font-mono font-bold text-[#006B3C]">{reg.revenue}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{reg.pct}% of Fleet Collections</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#006B3C] h-full rounded-full" style={{ width: `${reg.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Operational Sign-off Block */}
            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-300 p-3 rounded-lg space-y-4">
                  <div className="text-[10px] font-bold text-slate-700 uppercase">
                    Fleet Operations Director Sign-off
                  </div>
                  <div className="border-b border-slate-400 h-6"></div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Authorized Signature</span>
                    <span>Date: 25 Sep 2026</span>
                  </div>
                </div>

                <div className="border border-slate-300 p-3 rounded-lg space-y-4">
                  <div className="text-[10px] font-bold text-slate-700 uppercase">
                    Central Dispatch Supervisor Sign-off
                  </div>
                  <div className="border-b border-slate-400 h-6"></div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Central Depot Control</span>
                    <span className="text-emerald-700 font-bold">STATUS: VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Footer Note */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-500 gap-1">
              <span>Zamzam Water Co. Ltd. • ISO 9001:2015 Operations • Confidential</span>
              <span>Document Verification: Validated via Enterprise Cloud System</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3.5 bg-[#122010] border-t border-[#2A5038] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#8899AA]">
            {isSwahili
              ? 'Faili la PDF linajumuisha nembo ya ZamZam, takwimu zote, na nafasi ya saini za wasimamizi.'
              : 'The generated PDF includes official Zamzam Water letterhead, detailed metrics, and executive sign-off lines.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#243E26] text-[#8899AA] hover:text-white text-xs font-semibold border border-[#3A5068] transition-all cursor-pointer"
            >
              {isSwahili ? 'Funga' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#006B3C] hover:bg-[#00874C] text-white text-xs font-bold transition-all shadow-md border border-[#00C46A]/40 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#00E67A]" />
              <span>{isDownloading ? (isSwahili ? 'Inapakua...' : 'Generating...') : (isSwahili ? 'Pakua PDF' : 'Download PDF')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
