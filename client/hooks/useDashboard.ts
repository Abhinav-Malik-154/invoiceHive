import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const [{ data: invStats }, { data: clientsRes }] = await Promise.all([
        api.get("/invoices/stats"),
        api.get("/clients") // as a proxy to get active client counts if no client stat endpoint exists
      ]);
      return {
        invoiceStats: invStats.data,
        clientsCount: clientsRes.data?.data?.length || 0,
      };
    },
  });
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: ["recentInvoices"],
    queryFn: async () => {
      const { data } = await api.get("/invoices", {
        params: { limit: 5, sortBy: "createdAt", sortOrder: "desc" },
      });
      return data.data;
    },
  });
}
