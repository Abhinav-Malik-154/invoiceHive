"use client";
import { useState } from "react";
import { CreditCard, TrendingUp, Clock, CheckCircle2, MoreHorizontal, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePayments, usePaymentStats, useRefundPayment } from "@/hooks/useApi";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data, isLoading }   = usePayments({ page, limit: 20 });
  const { data: statsData }   = usePaymentStats();
  const refundMutation        = useRefundPayment();

  const payments   = data?.data || [];
  const pagination = data?.pagination;
  const stats      = statsData;

  const handleRefund = async (id: string) => {
    if (!confirm("Issue a refund for this payment? This cannot be undone.")) return;
    setOpenMenu(null);
    try { await refundMutation.mutateAsync({ id, reason: "requested_by_customer" }); }
    catch (e: any) { alert(e?.response?.data?.message || "Refund failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">Payments</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Track your incoming payment history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "Total received", value: formatCurrency(stats?.totalReceived || 0), icon: <TrendingUp className="w-5 h-5" />, bg: "bg-indigo-50 text-primary" },
          { label: "Pending",        value: formatCurrency(stats?.totalPending || 0),  icon: <Clock className="w-5 h-5" />,       bg: "bg-amber-50 text-amber-600" },
          { label: "Succeeded",      value: String(stats?.countSucceeded || 0),         icon: <CheckCircle2 className="w-5 h-5" />, bg: "bg-emerald-50 text-tertiary" },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className="card p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
            <div>
              <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold font-headline mono-num mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-container flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-outline" />
          <h2 className="text-base font-bold font-headline text-on-background">Payment History</h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-lg bg-surface-container animate-pulse" />)}</div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No payments yet — send your first invoice and get paid!</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low/30">
                {["Payment ID","Invoice","Amount","Method","Date","Status",""].map(h => (
                  <th key={h} className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {payments.map((pay: any) => (
                <tr key={pay._id} className="hover:bg-surface-container-low/40 transition-colors group">
                  <td className="px-6 py-4 mono-num text-sm font-semibold text-on-surface-variant">{pay._id.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-4 mono-num text-sm font-bold text-primary">{pay.invoiceId?.slice(-6).toUpperCase() || "—"}</td>
                  <td className="px-6 py-4 mono-num text-sm font-bold text-on-background">{formatCurrency(pay.amount, pay.currency)}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {pay.cardBrand ? `${pay.cardBrand.charAt(0).toUpperCase() + pay.cardBrand.slice(1)} ···· ${pay.cardLast4}` : pay.paymentMethodType || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(pay.paidAt || pay.createdAt)}</td>
                  <td className="px-6 py-4">
                    {pay.status === "succeeded" && <span className="badge-paid"><CheckCircle2 className="w-3 h-3" />Received</span>}
                    {pay.status === "pending"   && <span className="badge-sent"><Clock className="w-3 h-3" />Pending</span>}
                    {pay.status === "failed"    && <span className="badge-overdue">Failed</span>}
                    {pay.status === "refunded"  && <span className="badge-draft">Refunded</span>}
                  </td>
                  <td className="px-6 py-4 relative">
                    {pay.status === "succeeded" && (
                      <>
                        <button onClick={() => setOpenMenu(openMenu === pay._id ? null : pay._id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-container transition-all text-on-surface-variant">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === pay._id && (
                          <div className="absolute right-6 top-10 z-20 w-40 card border border-outline-variant/10 py-1 shadow-elevated">
                            <button onClick={() => handleRefund(pay._id)} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium text-error">
                              <RotateCcw className="w-3.5 h-3.5" /> Issue Refund
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-surface-container">
            <p className="text-xs text-on-surface-variant">Showing {payments.length} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={!pagination.hasPrev} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">Previous</button>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg primary-gradient text-white">{page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={!pagination.hasNext} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}