"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, Mail, Phone, MapPin, MoreHorizontal, ArrowRight, Loader2, X, Search, Trash2 } from "lucide-react";
import { useClients, useCreateClient, useArchiveClient } from "@/hooks/useApi";

export default function ClientsPage() {
  const [params, setParams] = useState({ page: 1, limit: 12, search: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useClients(params);
  const createMutation = useCreateClient();
  const archiveMutation = useArchiveClient();

  const clients = data?.data || [];

  const [formData, setFormData] = useState({
    name: "", company: "", email: "", phone: "", website: "",
    street: "", city: "", state: "", zip: "", country: "",
    taxId: "", currency: "USD", paymentTerms: 30
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name, company: formData.company, email: formData.email,
        phone: formData.phone, website: formData.website, taxId: formData.taxId,
        currency: formData.currency, paymentTerms: formData.paymentTerms,
        address: { street: formData.street, city: formData.city, state: formData.state, zip: formData.zip, country: formData.country }
      };
      await createMutation.mutateAsync(payload);
      setIsModalOpen(false);
      setFormData({ name: "", company: "", email: "", phone: "", website: "", street: "", city: "", state: "", zip: "", country: "", taxId: "", currency: "USD", paymentTerms: 30 });
    } catch (err: any) { alert(err?.response?.data?.message || "Failed to create client"); }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    setOpenMenuId(null);
    try { await archiveMutation.mutateAsync(id); } catch { alert("Failed to delete client"); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">Clients</h1>
          <p className="text-on-surface-variant mt-1">Manage your contacts and billing details</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary shadow-sm hover:shadow flex justify-center items-center">
          <Plus className="w-5 h-5 mr-2" /> Add Client
        </button>
      </div>

      <div className="card p-2 flex border border-outline-variant/30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input type="text" placeholder="Search clients..." className="w-full bg-transparent border-none pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none" value={params.search} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center border border-outline-variant/30 border-dashed">
          <Building2 className="w-12 h-12 text-on-surface-variant/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-on-surface mb-2">No clients found</h3>
          <p className="text-on-surface-variant mb-6">Add your first client to start generating invoices.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary mx-auto inline-flex"><Plus className="w-4 h-4 mr-2" /> Add Client</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client: any) => (
            <div key={client._id} className="card p-6 flex flex-col relative group border border-outline-variant/30 hover:border-primary/30 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-on-surface line-clamp-1">{client.name}</h3>
                  {client.company && <div className="flex items-center text-sm text-on-surface-variant mt-1.5"><Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />{client.company}</div>}
                </div>
                <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === client._id ? null : client._id)} className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container"><MoreHorizontal className="w-5 h-5" /></button>
                  {openMenuId === client._id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-lg z-50 overflow-hidden text-sm">
                        <button onClick={() => handleArchive(client._id)} className="w-full px-4 py-2.5 text-left hover:bg-error/10 text-error flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-6 flex-1">
                {client.email && <div className="flex items-center text-sm text-on-surface-variant"><Mail className="w-4 h-4 mr-2.5 shrink-0" /><span className="truncate">{client.email}</span></div>}
                {client.phone && <div className="flex items-center text-sm text-on-surface-variant"><Phone className="w-4 h-4 mr-2.5 shrink-0" /><span className="truncate">{client.phone}</span></div>}
                {client.formattedAddress && <div className="flex items-start text-sm text-on-surface-variant"><MapPin className="w-4 h-4 mr-2.5 mt-0.5 shrink-0" /><span className="line-clamp-2">{client.formattedAddress}</span></div>}
              </div>
              <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Invoiced: <span className="font-semibold text-on-surface">{client.currency} {client.totalInvoiced?.toLocaleString() || 0}</span></span>
                  {client.hasOutstanding && <span className="text-error font-medium text-xs px-2 py-0.5 rounded-full bg-error/10">Due: {client.totalOutstanding?.toLocaleString()}</span>}
                </div>
                <Link href={`/clients/${client._id}`} className="w-full py-2 bg-surface-container-low hover:bg-primary hover:text-on-primary text-primary border border-primary/20 hover:border-primary text-center rounded-xl text-sm font-medium transition-colors flex justify-center items-center group/btn">
                  View Full Details <ArrowRight className="w-4 h-4 ml-1.5 opacity-60 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-on-surface">Add New Client</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Basic Info</h3>
                  <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Company/Client Name *</label><input required autoFocus type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input w-full" placeholder="Acme Corp" /></div>
                  <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Primary Email *</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input w-full" placeholder="billing@acmecorp.com" /></div>
                  <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Phone Number</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input w-full" placeholder="+1 (555) 000-0000" /></div>
                  <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Website</label><input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="input w-full" placeholder="https://acmecorp.com" /></div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Address & Billing</h3>
                  <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Street Address</label><input type="text" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="input w-full" placeholder="123 Main St" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">City</label><input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="input w-full" placeholder="New York" /></div>
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">State</label><input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="input w-full" placeholder="NY" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Zip Code</label><input type="text" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} className="input w-full" placeholder="10001" /></div>
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Country</label><input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="input w-full" placeholder="USA" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Tax ID</label><input type="text" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="input w-full" placeholder="Optional" /></div>
                    <div><label className="block text-sm font-medium text-on-surface-variant mb-1">Currency</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="input w-full">
                        <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="INR">INR (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-5 border-t border-outline-variant/30 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-surface-container-high hover:bg-surface-container-highest text-on-surface">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">{createMutation.isPending ? "Saving..." : "Save Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
