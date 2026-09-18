import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  UserCheck,
  Target,
  Clock,
  Truck,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { TimelineTask, Order, UserProfile } from '../types';

interface ExportPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  tasks: TimelineTask[];
  orders: Order[];
  metrics: {
    totalStops: number;
    completedCount: number;
    pendingCount: number;
    inTransitCount: number;
    completionPercentage: number;
    totalBottlesDelivered: number;
  };
  timeBlocksData: {
    name: string;
    completed: number;
    remaining: number;
    total: number;
  }[];
}

export const ExportPerformanceModal: React.FC<ExportPerformanceModalProps> = ({
  isOpen,
  onClose,
  user,
  tasks,
  orders,
  metrics,
  timeBlocksData,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isoDate = today.toISOString().slice(0, 10);
  const timeFormatted = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate estimated revenue from orders
  const totalRevenue = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

  // 1. Export as CSV
  const handleDownloadCSV = () => {
    const lines: string[] = [
      'ZAMZAM WATER CO. - DAILY DELIVERY PERFORMANCE REPORT',
      `Date,${dateFormatted}`,
      `Generated At,${timeFormatted}`,
      `Field Operator,"${user?.name || 'Active Operator'}"`,
      `Employee ID,${user?.employeeId || 'ZZ-STAFF'}`,
      `Role,${user?.role || 'field_staff'}`,
      '',
      'PERFORMANCE KPI METRICS',
      'Metric,Value',
      `Overall Completion Rate,${metrics.completionPercentage}%`,
      `Total Assigned Stops,${metrics.totalStops}`,
      `Completed Deliveries,${metrics.completedCount}`,
      `Remaining Stops,${metrics.pendingCount}`,
      `In-Transit Deliveries,${metrics.inTransitCount}`,
      `Total Bottles Delivered,${metrics.totalBottlesDelivered} units`,
      `Total Shift Revenue,TZS ${totalRevenue.toLocaleString()}`,
      '',
      'SHIFT TIMELINE BREAKDOWN',
      'Window,Completed Stops,Remaining Stops,Total Assigned',
      ...timeBlocksData.map((b) => `"${b.name}",${b.completed},${b.remaining},${b.total}`),
      '',
      'DETAILED ROUTE STOPS & TASKS',
      'Stop #,Time,Task / Customer,Location / Address,Status,Completed',
    ];

    tasks.forEach((task, idx) => {
      lines.push(
        `${idx + 1},"${task.time || task.timeRange || 'Scheduled'}","${(task.title || '').replace(/"/g, '""')}","${(task.subtitle || '').replace(/"/g, '""')}","${task.status}","${task.isCompleted ? 'Completed' : 'Pending'}"`
      );
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `zamzam_delivery_performance_${isoDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('CSV Spreadsheet Downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 2. Export as Printable Standalone HTML Document
  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zamzam Water - Delivery Performance Report (${isoDate})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #0A1A0F;
      background: #FFFFFF;
      line-height: 1.5;
    }
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #CBD5E1;
      padding: 36px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #007A40;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #007A40;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #64748B;
      margin-top: 4px;
      font-weight: 600;
    }
    .report-meta {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }
    .meta-highlight {
      font-weight: 700;
      color: #0A1A0F;
    }
    .operator-badge {
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #CBD5E1;
      padding: 14px;
      border-radius: 6px;
      background: #F8FAFC;
      text-align: center;
    }
    .kpi-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 700;
    }
    .kpi-val {
      font-size: 24px;
      font-weight: 800;
      color: #007A40;
      margin-top: 4px;
      font-family: monospace;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0A1A0F;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 8px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 20px;
    }
    th {
      background: #F1F5F9;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #CBD5E1;
      font-weight: 700;
      color: #334155;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      color: #0F172A;
    }
    .status-completed {
      color: #166534;
      font-weight: 700;
    }
    .status-pending {
      color: #B45309;
      font-weight: 600;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #94A3B8;
    }
    .sign-box {
      width: 45%;
      font-size: 12px;
    }
    .sign-line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 6px;
    }
    .no-print {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #007A40;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      .report-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 20px auto;">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="report-container">
    <div class="header">
      <div>
        <h1 class="brand-title">ZAMZAM WATER CO.</h1>
        <div class="brand-subtitle">Field Distribution & Delivery Operations</div>
      </div>
      <div class="report-meta">
        <div><strong>Daily Shift Performance Summary</strong></div>
        <div>Date: <span class="meta-highlight">${dateFormatted}</span></div>
        <div>Generated: <span>${timeFormatted}</span></div>
      </div>
    </div>

    <div class="operator-badge">
      <div><strong>Field Operator:</strong> ${user?.name || 'Active Operator'} (${user?.employeeId || 'ZZ-STAFF'})</div>
      <div><strong>Role:</strong> ${user?.role || 'field_staff'} &bull; <strong>Zone:</strong> City & Commercial Routes</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Completion Rate</div>
        <div class="kpi-val">${metrics.completionPercentage}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Stops</div>
        <div class="kpi-val">${metrics.totalStops}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Delivered</div>
        <div class="kpi-val">${metrics.completedCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Bottles Dropped</div>
        <div class="kpi-val">${metrics.totalBottlesDelivered}</div>
      </div>
    </div>

    <div class="section-title">Shift Timeline Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Shift Window</th>
          <th>Delivered Stops</th>
          <th>Remaining</th>
          <th>Total Assigned</th>
          <th>Window Status</th>
        </tr>
      </thead>
      <tbody>
        ${timeBlocksData
          .map(
            (b) => `
        <tr>
          <td><strong>${b.name}</strong></td>
          <td style="color: #166534; font-weight: bold;">${b.completed}</td>
          <td style="color: ${b.remaining > 0 ? '#B45309' : '#64748B'};">${b.remaining}</td>
          <td>${b.total}</td>
          <td>${b.completed === b.total && b.total > 0 ? 'Fully Completed' : b.completed > 0 ? 'In Progress' : 'Pending'}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="section-title">Route Stops & Dispatch Details</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Scheduled Time</th>
          <th>Customer / Stop Name</th>
          <th>Location</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tasks
          .map(
            (t, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${t.time || t.timeRange || 'Scheduled'}</td>
          <td><strong>${t.title}</strong></td>
          <td>${t.subtitle}</td>
          <td class="${t.isCompleted ? 'status-completed' : 'status-pending'}">
            ${t.isCompleted ? 'Delivered' : t.status === 'in_transit' ? 'In Transit' : 'Pending'}
          </td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="signatures">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div><strong>Field Operator Signature:</strong> ${user?.name || 'Active Operator'}</div>
        <div style="font-size: 11px; color: #64748B;">Date: ${isoDate}</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div><strong>Supervisor Dispatch Approval:</strong></div>
        <div style="font-size: 11px; color: #64748B;">Central Depot Station</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zamzam_delivery_summary_${isoDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('Printable HTML Document Downloaded!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 3. Trigger Browser Print with safety handling
  const handlePrint = () => {
    try {
      window.print();
    } catch {
      // If window.print is restricted in the iframe sandbox, offer direct HTML download
      handleDownloadHTML();
    }
  };

  // 4. Quick text clipboard copy for dispatch channels
  const handleCopySummary = () => {
    const text = `*ZAMZAM WATER - DAILY DELIVERY PERFORMANCE*
Date: ${dateFormatted}
Operator: ${user?.name || 'Active Staff'} (${user?.employeeId || 'ZZ-STAFF'})
------------------------------------
Overall Completion: ${metrics.completionPercentage}%
Delivered: ${metrics.completedCount} / ${metrics.totalStops} stops
Bottles Dropped: ${metrics.totalBottlesDelivered} units
In-Transit / Pending: ${metrics.pendingCount}
Revenue Tally: TZS ${totalRevenue.toLocaleString()}
Status: ${metrics.completionPercentage === 100 ? 'All Stops Completed' : 'Shift Active'}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[#122010] border border-[#2A5038] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-[#243447] flex items-center justify-between bg-[#0E1B11]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Export Daily Delivery Performance</span>
                <span className="text-[10px] font-bold bg-[#00C46A]/20 text-[#00C46A] px-2 py-0.5 rounded-full border border-[#00C46A]/30">
                  {metrics.completionPercentage}% Done
                </span>
              </h2>
              <p className="text-xs text-[#8899AA] mt-0.5">
                Generate printable sheets or downloadable CSV/HTML reports for shift verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-[#8899AA] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-3 sm:p-4 bg-[#162719] border-b border-[#243447] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Download CSV Button */}
            <button
              type="button"
              id="btn-download-csv"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#243A26] text-white border border-[#3A5068] hover:border-[#00C46A] px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>Download CSV</span>
            </button>

            {/* Download Standalone Printable HTML */}
            <button
              type="button"
              id="btn-download-html"
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#243A26] text-white border border-[#3A5068] hover:border-[#00C46A] px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>Download Printable File</span>
            </button>

            {/* Direct Browser Print / PDF */}
            <button
              type="button"
              id="btn-print-pdf"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-[#00C46A]/20 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#0A1A0F]" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy WhatsApp / SMS summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#243A26] text-[#8899AA] hover:text-white border border-[#3A5068] px-3 py-2 rounded-xl text-xs font-medium transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span className="text-[#00C46A] font-semibold">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {downloadSuccess && (
          <div className="bg-[#006B3C]/20 border-b border-[#00C46A]/40 px-4 py-2 text-xs text-[#00C46A] flex items-center gap-2 font-medium animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{downloadSuccess} Check your browser downloads folder.</span>
          </div>
        )}

        {/* Printable Report Preview Document (Scrollable Area) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#0A1A0F]/60">
          <div
            id="printable-performance-summary"
            className="bg-white text-[#0A1A0F] p-6 sm:p-8 rounded-xl shadow-lg border border-slate-300 max-w-2xl mx-auto space-y-6"
          >
            {/* Document Header */}
            <div className="border-b-2 border-[#007A40] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#007A40] text-white flex items-center justify-center font-bold text-sm">
                    ZZ
                  </div>
                  <h1 className="text-xl font-extrabold tracking-tight text-[#007A40]">
                    ZAMZAM WATER CO.
                  </h1>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Field Operations & Dispatch Route Performance Report
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                <div className="font-bold text-slate-900">Shift Performance Record</div>
                <div>{dateFormatted}</div>
                <div className="text-[11px] text-slate-500 font-mono">Issued at {timeFormatted}</div>
              </div>
            </div>

            {/* Operator Details Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Field Driver: </span>
                <strong className="text-slate-900">{user?.name || 'Active Operator'}</strong>
                <span className="text-slate-400 mx-1.5">&bull;</span>
                <span className="text-slate-500">ID: </span>
                <strong className="font-mono text-slate-900">{user?.employeeId || 'ZZ-8821'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Dispatch Hub: </span>
                <strong className="text-slate-800">Kariakoo Central Station</strong>
              </div>
            </div>

            {/* 4 Scorecard KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Completion Rate</span>
                <span className="text-2xl font-extrabold font-mono text-[#007A40] block mt-0.5">
                  {metrics.completionPercentage}%
                </span>
                <span className="text-[10px] text-slate-500">
                  {metrics.completedCount} of {metrics.totalStops} stops
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Stops</span>
                <span className="text-2xl font-extrabold font-mono text-slate-900 block mt-0.5">
                  {metrics.totalStops}
                </span>
                <span className="text-[10px] text-slate-500">Today's Route</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pending Stops</span>
                <span className="text-2xl font-extrabold font-mono text-amber-600 block mt-0.5">
                  {metrics.pendingCount}
                </span>
                <span className="text-[10px] text-slate-500">Remaining</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Bottles Dropped</span>
                <span className="text-2xl font-extrabold font-mono text-slate-900 block mt-0.5">
                  {metrics.totalBottlesDelivered}
                </span>
                <span className="text-[10px] text-slate-500">Units Handed Over</span>
              </div>
            </div>

            {/* Shift Timeline Window Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center justify-between">
                <span>1. Shift Windows Progression</span>
                <span className="text-[11px] font-normal text-slate-500 font-mono">Real-time Tally</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700">
                      <th className="py-2 px-3 font-semibold">Time Window</th>
                      <th className="py-2 px-3 font-semibold">Delivered</th>
                      <th className="py-2 px-3 font-semibold">Remaining</th>
                      <th className="py-2 px-3 font-semibold">Total Assigned</th>
                      <th className="py-2 px-3 font-semibold">Window Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timeBlocksData.map((b) => (
                      <tr key={b.name} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-medium text-slate-900">{b.name}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{b.completed}</td>
                        <td className="py-2 px-3 font-medium text-amber-700">{b.remaining}</td>
                        <td className="py-2 px-3 font-mono text-slate-800">{b.total}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              b.completed === b.total && b.total > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.completed > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.completed === b.total && b.total > 0
                              ? 'Fully Complete'
                              : b.completed > 0
                              ? 'In Progress'
                              : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Route Stops Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center justify-between">
                <span>2. Scheduled Route Stops</span>
                <span className="text-[11px] font-normal text-slate-500 font-mono">
                  {tasks.length} total entries
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700">
                      <th className="py-2 px-2.5 font-semibold">#</th>
                      <th className="py-2 px-3 font-semibold">Time</th>
                      <th className="py-2 px-3 font-semibold">Customer / Location</th>
                      <th className="py-2 px-3 font-semibold">Delivery Address</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {task.time || task.timeRange || 'Scheduled'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{task.title}</td>
                        <td className="py-2 px-3 text-slate-600">{task.subtitle}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-semibold text-[11px] flex items-center gap-1 ${
                              task.isCompleted
                                ? 'text-emerald-700'
                                : task.status === 'in_transit'
                                ? 'text-blue-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {task.isCompleted ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Delivered</span>
                              </>
                            ) : task.status === 'in_transit' ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                <span>In Transit</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Pending</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature & Sign-Off Section */}
            <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8">
              <div>
                <div className="h-12 border-b border-slate-400 mb-1 flex items-end">
                  <span className="text-[11px] font-mono text-slate-400 italic">
                    Signed electronically by {user?.name || 'Active Operator'}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">
                  Field Operator Signature: {user?.name || 'Ali Mkwawa'}
                </div>
                <div className="text-[10px] text-slate-500">Date: {isoDate} &bull; Zamzam ID #{user?.employeeId || 'ZZ-8821'}</div>
              </div>

              <div>
                <div className="h-12 border-b border-slate-400 mb-1 flex items-end">
                  <span className="text-[11px] font-mono text-slate-400 italic">
                    Central Distribution Depot Desk
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">
                  Supervisor Verification & Approval
                </div>
                <div className="text-[10px] text-slate-500">Warehouse Reception & Vehicle Reconciliation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-[#243447] bg-[#0E1B11] flex items-center justify-between text-xs text-[#8899AA]">
          <span>
            Generates standardized dispatch verification documents for operations & billing records.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-white font-medium border border-[#3A5068]"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
