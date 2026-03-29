import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data } = await api.get("/payments");
      return Array.isArray(data.data) ? data.data : data || [];
    },
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ["paymentStats"],
    queryFn: async () => {
      const { data } = await api.get("/payments/stats");
      return data.data || {};
    },
  });
}
