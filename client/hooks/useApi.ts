import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ── Auth ─────────────────────────────────────────────────────────────────────
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then(r => r.data.user), retry: false });

// ── Clients ───────────────────────────────────────────────────────────────────
export const useClients = (params?: { search?: string; archived?: boolean; page?: number; limit?: number }) =>
  useQuery({
    queryKey: ["clients", params],
    queryFn: () => api.get("/clients", { params: { ...params, archived: params?.archived ?? false } }).then(r => r.data),
  });

export const useClient = (id: string) =>
  useQuery({
    queryKey: ["clients", id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

export const useClientStats = () =>
  useQuery({
    queryKey: ["clients", "stats"],
    queryFn: () => api.get("/clients/stats").then(r => r.data.data),
  });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/clients", data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useUpdateClient = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/clients/${id}`, data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useArchiveClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useRestoreClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/clients/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useAddContact = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/clients/${id}/contacts`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", id] });
    },
  });
};

export const useRemoveContact = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => api.delete(`/clients/${id}/contacts/${contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", id] });
    },
  });
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const useInvoices = (params?: {
  status?: string; clientId?: string; search?: string;
  page?: number; limit?: number; sortBy?: string; sortOrder?: string;
}) =>
  useQuery({
    queryKey: ["invoices", params],
    queryFn: () => api.get("/invoices", { params }).then(r => r.data),
  });

export const useInvoice = (id: string) =>
  useQuery({
    queryKey: ["invoices", id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

export const useInvoiceStats = () =>
  useQuery({
    queryKey: ["invoices", "stats"],
    queryFn: () => api.get("/invoices/stats").then(r => r.data.data),
  });

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/invoices", data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useUpdateInvoice = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/invoices/${id}`, data).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["invoices", id] }); },
  });
};

export const useSendInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useMarkInvoicePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt?: string }) =>
      api.post(`/invoices/${id}/mark-paid`, { paidAt }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useDownloadInvoice = () =>
  useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/invoices/${id}/download`);
      if (data.url) window.open(data.url, "_blank");
      return data;
    },
  });

// ── Payments ──────────────────────────────────────────────────────────────────
export const usePayments = (params?: { status?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: ["payments", params],
    queryFn: () => api.get("/payments", { params }).then(r => r.data),
  });

export const usePaymentStats = () =>
  useQuery({
    queryKey: ["payments", "stats"],
    queryFn: () => api.get("/payments/stats").then(r => r.data.data),
  });

export const usePaymentByInvoice = (invoiceId: string) =>
  useQuery({
    queryKey: ["payments", "invoice", invoiceId],
    queryFn: () => api.get(`/payments/invoice/${invoiceId}`).then(r => r.data.data),
    enabled: !!invoiceId,
    retry: false,
  });

export const useCreatePaymentOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/payments/create-order", data).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
};

export const useRefundPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/payments/${id}/refund`, { reason }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
};
