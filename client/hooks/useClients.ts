import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await api.get("/clients");
      // ensure we correctly extract the array whether it's data.data or just data
      return Array.isArray(data.data) ? data.data : data || [];
    },
  });
}
