"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useClient, useInvoices } from "@/hooks/useApi";
import { ArrowLeft, Building2, MapPin, Mail, Phone, Globe, FileText, ChevronRight, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ClientProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { data: client, isLoading } = useClient(id);
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ clientId: id, limit: 100 });
  const invoices = invoicesData?.data || [];

  if (isLoading) return <div className="flex justify-center p-24 text-slate-400">Loading profile...</div>;
  if (!client) return <div className="p-24 text-center text-slate-500 font-medium">Client not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 antialiased">
      {/* --- Header Navigation --- */}
      <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-8">
        <Link href="/clients" className="flex items-center hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Clients
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">{client.name}</span>
      </nav>

      {/* --- Main Profile Header --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <Building2 className="w-5 h-5 text-slate-400" />
             <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Client Profile</span>
          </div>
          <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">{client.name}</h1>
          {client.company && <p className="text-lg text-slate-500 mt-1">{client.company}</p>}
        </div>
        
        <div className="flex gap-3">
          <Link 
            href={`/invoices/new?client=${client._id}`} 
            className="inline-flex items-center bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* --- Sidebar: Contact & Info --- */}
        <aside className="lg:col-span-4 space-y-10">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
            <div className="space-y-4">
              {client.email && (
                <div className="group">
                  <span className="block text-xs text-slate-400 mb-0.5">Email</span>
                  <a href={`mailto:${client.email}`} className="text-sm text-slate-900 font-medium border-b border-transparent hover:border-slate-900 transition-all">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div>
                  <span className="block text-xs text-slate-400 mb-0.5">Phone</span>
                  <p className="text-sm text-slate-900 font-medium">{client.phone}</p>
                </div>
              )}
              {client.website && (
                <div>
                  <span className="block text-xs text-slate-400 mb-0.5">Website</span>
                  <a href={client.website} target="_blank" className="text-sm text-blue-600 font-medium">{client.website.replace(/^https?:\/\//, '')}</a>
                </div>
              )}
              {client.formattedAddress && (
                <div>
                  <span className="block text-xs text-slate-400 mb-0.5">Address</span>
                  <p className="text-sm text-slate-600 leading-relaxed">{client.formattedAddress}</p>
                </div>
              )}
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Billing Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-slate-400 mb-0.5">Currency</span>
                <p className="text-sm text-slate-900 font-medium">{client.currency || "USD"}</p>
              </div>
              <div>
                <span className="block text-xs text-slate-400 mb-0.5">Terms</span>
                <p className="text-sm text-slate-900 font-medium">Net {client.paymentTerms || 30}</p>
              </div>
            </div>
          </section>
        </aside>

        {/* --- Main Content: Stats & Invoices --- */}
        <main className="lg:col-span-8 space-y-12">
          {/* Financial Summary Overview */}
          <div className="grid grid-cols-3 border border-slate-200 rounded-xl divide-x divide-slate-200 overflow-hidden bg-slate-50/50">
            <div className="p-6">
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-2">Total Billed</span>
              <p className="text-xl font-bold text-slate-900">{client.currency} {formatCurrency(client.totalInvoiced || 0)}</p>
            </div>
            <div className="p-6">
              <span className="block text-xs font-semibold text-slate-500 uppercase mb-2">Total Paid</span>
              <p className="text-xl font-bold text-emerald-600">{client.currency} {formatCurrency(client.totalPaid || 0)}</p>
            </div>
            <div className="p-6 bg-red-50/30">
              <span className="block text-xs font-semibold text-red-600/70 uppercase mb-2">Outstanding</span>
              <p className="text-xl font-bold text-red-600">{client.currency} {formatCurrency(client.totalOutstanding || 0)}</p>
            </div>
          </div>

          {/* Invoice Table Style */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Invoice History</h2>
              <span className="text-xs text-slate-400 font-medium">{invoices.length} total invoices</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {invoicesLoading ? (
                <div className="p-12 text-center text-slate-400">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="p-16 text-center text-slate-500 italic">No transaction history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv: any) => (
                        <tr key={inv._id} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <Link href={`/invoices/${inv._id}`} className="font-semibold text-slate-900 block group-hover:text-blue-600">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">
                            {inv.currency} {formatCurrency(inv.total)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                              inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}