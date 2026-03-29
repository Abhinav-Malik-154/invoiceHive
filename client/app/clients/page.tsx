"use client";
import { useState } from "react";
import { Plus, Search, MoreHorizontal, Mail, Phone, Globe, FileText, TrendingUp, Users, X, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useClients, useClientStats, useCreateClient, useArchiveClient } from "@/hooks/useApi";
import Link from "next/link";

const COLORS = [
  "from-indigo-500 to-purple-600","from-cyan-500 to-teal-600","from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600","from-emerald-500 to-green-600","from-violet-500 to-indigo-600",
];

function AddClientModal({ onClose }: { onClose: () => void }) {
  const createClient = useCreateClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createClient.mutateAsync({
        name:         fd.get("name"),
        company:      fd.get("company"),
        email:        fd.get("email"),
        phone:        fd.get("phone"),
        currency:     fd.get("currency") || "USD",
        paymentTerms: Number(fd.get("paymentTerms") || 30),
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "Failed to add client");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-headline text-on-background">Add New Client</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mb-4 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="input-label">Full Name *</label>
              <input name="name" type="text" className="input-field" placeholder="Jane Doe" required />
            </div>
            <div>
              <label className="input-label">Company</label>
              <input name="company" type="text" className="input-field" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="input-label">Email *</label>
              <input name="email" type="email" className="input-field" placeholder="jane@acme.com" required />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input name="phone" type="tel" className="input-field" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="input-label">Currency</label>
              <select name="currency" className="input-field appearance-none">
                {["USD","EUR","GBP","INR","CAD","AUD"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="input-label">Payment Terms (days)</label>
              <select name="paymentTerms" className="input-field appearance-none">
                {[0,7,14,15,30,45,60,90].map(d => <option key={d} value={d}>Net {d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [openMenu,  setOpenMenu]  = useState<string | null>(null);

  const { data,       isLoading } = useClients({ search: search || undefined });
  const { data: statsData }       = useClientStats();
  const archiveClient              = useArchiveClient();

  const clients = data?.data || [];
  const stats   = statsData?.summary;

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive ${name}? They'll be hidden from your client list but invoice history is preserved.`)) return;
    setOpenMenu(null);
    try { await archiveClient.mutateAsync(id); }
    catch (e: any) { alert(e?.response?.data?.message || "Failed to archive"); }
  };

  return (
    <div className="space-y-6">
      {showModal && <AddClientModal onClose={() => setShowModal(false)} />}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">Clients</h1>
          <p className="text-on-surface-variant mt-1 text-sm">{stats?.totalClients || 0} active clients</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total clients",  value: String(stats.totalClients) },
            { label: "Total billed",   value: formatCurrency(stats.totalInvoiced) },
            { label: "Total received", value: formatCurrency(stats.totalPaid) },
          ].map(({ label, value }) => (
            <div key={label} className="card px-6 py-4 flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</span>
              <span className="mono-num text-base font-bold text-on-background">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2.5 rounded-xl ring-1 ring-black/[0.04] focus-within:ring-2 focus-within:ring-primary/20 transition-all max-w-md" style={{ boxShadow: "0 2px 8px rgba(20,28,36,0.04)" }}>
        <Search className="w-4 h-4 text-outline flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-outline" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_,i) => <div key={i} className="card h-64 animate-pulse bg-surface-container" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="py-20 text-center text-on-surface-variant">
          <Users className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold mb-2">{search ? "No clients match your search" : "No clients yet"}</p>
          {!search && <button onClick={() => setShowModal(true)} className="btn-primary text-sm mt-2">Add your first client</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {clients.map((client: any, idx: number) => {
            const initials = client.name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase();
            const color = COLORS[idx % COLORS.length];
            return (
              <div key={client._id} className="card p-6 hover:shadow-elevated transition-all duration-300 group cursor-pointer relative">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-base font-headline shadow-md`}>{initials}</div>
                    <div>
                      <h3 className="font-bold text-on-background font-headline text-sm leading-tight">{client.name}</h3>
                      {client.company && <p className="text-xs text-on-surface-variant mt-0.5">{client.company}</p>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${client.totalOutstanding > 0 ? "bg-error-container/40 text-error" : "bg-tertiary-fixed/20 text-tertiary"}`}>
                        {client.totalOutstanding > 0 ? `${formatCurrency(client.totalOutstanding)} outstanding` : "Active"}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setOpenMenu(openMenu === client._id ? null : client._id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenu === client._id && (
                      <div className="absolute right-0 top-8 z-20 w-44 card border border-outline-variant/10 py-1 shadow-elevated">
                        <Link href={`/invoices/new?clientId=${client._id}`} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium">
                          <FileText className="w-3.5 h-3.5 text-primary" /> New Invoice
                        </Link>
                        <button onClick={() => handleArchive(client._id, client.name)} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium text-error">
                          <X className="w-3.5 h-3.5" /> Archive
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                    <Mail className="w-3.5 h-3.5" /><span className="truncate">{client.email}</span>
                  </a>
                  {client.phone && <div className="flex items-center gap-2 text-xs text-on-surface-variant"><Phone className="w-3.5 h-3.5" /><span>{client.phone}</span></div>}
                  {client.website && <div className="flex items-center gap-2 text-xs text-on-surface-variant"><Globe className="w-3.5 h-3.5" /><span>{client.website}</span></div>}
                </div>

                <div className="pt-4 border-t border-surface-container grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Billed</p><p className="mono-num text-sm font-bold text-on-background mt-0.5">{formatCurrency(client.totalInvoiced)}</p></div>
                  <div><p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Paid</p><p className="mono-num text-sm font-bold text-tertiary mt-0.5">{formatCurrency(client.totalPaid)}</p></div>
                  <div><p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Invoices</p><p className="mono-num text-sm font-bold text-on-background mt-0.5">{client.invoiceCount}</p></div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/invoices/new?clientId=${client._id}`} className="flex-1 py-2 rounded-lg text-xs font-semibold font-headline text-primary bg-primary-fixed/30 hover:bg-primary-fixed/50 transition-colors flex items-center justify-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> New Invoice
                  </Link>
                  <Link href={`/invoices?clientId=${client._id}`} className="flex-1 py-2 rounded-lg text-xs font-semibold font-headline text-on-surface-variant bg-surface-container-highest hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> History
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}