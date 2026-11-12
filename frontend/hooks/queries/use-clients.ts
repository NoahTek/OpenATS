import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { Client, Department } from "@/types";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => clientFetch<{ data: Client[] }>("/clients"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useClient(id?: number) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => clientFetch<{ data: Client }>(`/clients/${id}`),
    enabled: typeof id === "number" && !isNaN(id),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Client>) =>
      clientFetch<{ data: Client }>("/clients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) =>
      clientFetch<{ data: Client }>(`/clients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      clientFetch(`/clients/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useClientDepartments(clientId?: number) {
  return useQuery({
    queryKey: ["clients", clientId, "departments"],
    queryFn: () => clientFetch<{ data: Department[] }>(`/clients/${clientId}/departments`),
    enabled: typeof clientId === "number" && !isNaN(clientId) && clientId > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateClientDepartment(clientId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      clientFetch<{ data: Department }>(`/clients/${clientId}/departments`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "departments"] });
    },
  });
}

export function useUpdateClientDepartment(clientId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, name }: { deptId: number; name: string }) =>
      clientFetch<{ data: Department }>(`/clients/${clientId}/departments/${deptId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "departments"] });
    },
  });
}

export function useDeleteClientDepartment(clientId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deptId: number) =>
      clientFetch(`/clients/${clientId}/departments/${deptId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", clientId, "departments"] });
    },
  });
}
