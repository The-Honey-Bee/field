import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Order, EodReport } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  Users,
  Clock,
  DollarSign,
  Truck,
  AlertTriangle,
} from 'lucide-react';

interface SupervisorScreenProps {
  onNavigate: (view: string) => void;
}

export const SupervisorScreen: React.FC<SupervisorScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'reports' | 'team'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<EodReport[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setOrders(storageService.getOrders());
    setReports(storageService.getReports());
  }, []);

  const handleApproveOrder = (orderId: string) => {
    storageService.updateOrderStatus(orderId, 'approved');
    setOrders(storageService.getOrders());
    setFeedback(`Order ${orderId} approved successfully`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRejectOrder = (orderId: string) => {
    storageService.updateOrderStatus(orderId, 'rejected');
    setOrders(storageService.getOrders());
    setFeedback(`Order ${orderId} rejected`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReviewReport = (reportId: string) => {
    storageService.updateReportStatus(reportId, 'reviewed');
    setReports(storageService.getReports());
    setFeedback(`EOD Report ${reportId} marked as Reviewed & Reconciled`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const teamMembers = [
    {
      id: 'ZZ-2024-001',
      name: 'Ali Hassan',
      route: 'Route 4B - Dar Central',
      stopsCompleted: 5,
      totalStops: 8,
      revenue: 350000,
      status: 'Active Field',
      lastSync: '4 mins ago',
    },
    {
      id: 'ZZ-2024-002',
      name: 'Juma Ramadhani',
      route: 'Route 2A - Ilala / Kariakoo',
      stopsCompleted: 7,
      totalStops: 7,
      revenue: 420000,
      status: 'Route Complete',
      lastSync: '12 mins ago',
    },
    {
      id: 'ZZ-2024-003',
      name: 'Baraka Mushi',
      route: 'Route 6C - Kinondoni',
      stopsCompleted: 4,
      totalStops: 9,
      revenue: 280000,
      status: 'Active Field',
      lastSync: '1 min ago',
    },
    {
      id: 'ZZ-2024-004',
      name: 'Salim Bakari',
      route: 'Route 1D - Temeke South',
      stopsCompleted: 6,
      totalStops: 8,
      revenue: 390000,
      status: 'Active Field',
      lastSync: '8 mins ago',
    },
  ];

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span>Supervisor Command Center</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Audit dispatches, verify cash reconciliations, and monitor live field fleet.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-blue-950/40 border border-blue-500/50 p-3 rounded-xl flex items-center gap-2 text-xs text-blue-200 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#122010] p-1.5 rounded-xl border border-[#2A5038] gap-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#006B3C] text-white shadow'
              : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>Order Approvals</span>
          {pendingOrders.length > 0 && (
            <span className="bg-[#F59E0B] text-[#0A1A0F] text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-[#006B3C] text-white shadow'
              : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>EOD Reviews</span>
          {reports.length > 0 && (
            <span className="bg-[#00C46A] text-[#0A1A0F] text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {reports.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'team'
              ? 'bg-[#006B3C] text-white shadow'
              : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>Team Status</span>
          <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
            {teamMembers.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Order Approvals */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Showing all field orders awaiting supervisor sign-off</span>
            <span>Total: {orders.length} orders</span>
          </div>

          <div className="space-y-3">
            {orders.map((order) => {
              const isPending = order.status === 'pending';
              return (
                <div
                  key={order.id}
                  className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#8899AA]">{order.id}</span>
                      <h3 className="text-sm font-bold text-white">{order.customerName}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          order.status === 'approved'
                            ? 'bg-[#006B3C]/50 text-[#00C46A]'
                            : order.status === 'rejected'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                        }`}
                      >
                        {order.status || 'pending'}
                      </span>
                    </div>
                    <div className="text-xs text-[#8899AA]">
                      {order.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                    </div>
                    <div className="text-[11px] text-[#8899AA] flex items-center gap-2">
                      <span>Payment: <strong className="text-white uppercase">{order.paymentMethod}</strong></span>
                      <span>&bull;</span>
                      <span>Staff ID: <span className="font-mono text-white">{order.staffId}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#243447]">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-[#8899AA]">Order Subtotal</div>
                      <div className="font-mono font-bold text-white text-base">
                        TZS {order.subtotal.toLocaleString()}
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectOrder(order.id)}
                          className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/40"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApproveOrder(order.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#006B3C] hover:bg-[#008F50] text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00C46A]" />
                          <span>Approve</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#8899AA] italic">Reviewed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EOD Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-[#122010] p-8 rounded-2xl border border-[#2A5038] text-center text-xs text-[#8899AA]">
              No End-of-Day reports submitted for review yet. Field staff can submit from the EOD tab.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243447] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Staff {report.staffId} EOD Reconciliation
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            report.syncStatus === 'reviewed'
                              ? 'bg-[#006B3C]/50 text-[#00C46A]'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}
                        >
                          {report.syncStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8899AA]">
                        Submitted {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right font-mono text-base font-bold text-[#00C46A]">
                      TZS {report.totalRevenue.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="bg-[#1A2E1C] p-2 rounded-xl border border-[#3A5068]/40">
                      <div className="text-[#8899AA]">Deliveries</div>
                      <div className="font-bold text-white mt-0.5">{report.totalDeliveries} stops</div>
                    </div>
                    <div className="bg-[#1A2E1C] p-2 rounded-xl border border-[#3A5068]/40">
                      <div className="text-[#8899AA]">Collected</div>
                      <div className="font-bold text-white mt-0.5">{report.collectedCount}</div>
                    </div>
                    <div className="bg-[#1A2E1C] p-2 rounded-xl border border-[#3A5068]/40">
                      <div className="text-[#8899AA]">Partial/Pending</div>
                      <div className="font-bold text-white mt-0.5">{report.partialCount}</div>
                    </div>
                  </div>

                  {report.fieldNotes && (
                    <div className="text-xs bg-[#1A2E1C]/60 p-3 rounded-xl border border-[#3A5068]/30">
                      <strong className="text-[#8899AA]">Field Notes: </strong>
                      <span className="text-[#D0E8F0]">{report.fieldNotes}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    {report.syncStatus !== 'reviewed' ? (
                      <button
                        onClick={() => handleReviewReport(report.id)}
                        className="bg-[#006B3C] hover:bg-[#008F50] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 text-[#00C46A]" />
                        <span>Sign-off & Reconcile</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[#00C46A] flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Supervisor Sign-Off Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Team Field Status */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs border border-[#00C46A]/50">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{member.name}</h3>
                    <span className="font-mono text-xs text-[#8899AA]">({member.id})</span>
                  </div>
                  <div className="text-xs text-[#8899AA] mt-0.5">{member.route}</div>
                  <div className="text-[10px] text-[#00C46A] mt-0.5">Last Sync: {member.lastSync}</div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div>
                  <div className="text-[10px] text-[#8899AA]">Stops Completed</div>
                  <div className="font-mono text-xs font-bold text-white">
                    {member.stopsCompleted} / {member.totalStops}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#8899AA]">Shift Revenue</div>
                  <div className="font-mono text-sm font-bold text-[#00C46A]">
                    TZS {member.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
