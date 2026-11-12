import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { TalentPoolProfile, TalentPoolProfileDetail } from "@/types";

export type TalentPoolQueryParams = {
  search?: string;
  source?: string;
  minExperienceYears?: number;
  page?: number;
  limit?: number;
};

export type TalentPoolResponse = {
  data: TalentPoolProfile[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function useTalentPool(params: TalentPoolQueryParams = {}) {
  const queryParts: string[] = [];
  if (params.page) queryParts.push(`page=${params.page}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.source) queryParts.push(`source=${encodeURIComponent(params.source)}`);
  if (params.minExperienceYears)
    queryParts.push(`minExperienceYears=${params.minExperienceYears}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  return useQuery({
    queryKey: ["talent-pool", params],
    queryFn: () => clientFetch<TalentPoolResponse>(`/talent-pool${queryString}`),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTalentPoolProfile(id?: number) {
  return useQuery({
    queryKey: ["talent-pool", id],
    queryFn: () =>
      clientFetch<{ data: TalentPoolProfileDetail }>(`/talent-pool/${id}`),
    enabled: typeof id === "number" && !isNaN(id),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateTalentPoolProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      linkedinUrl?: string | null;
      source?: string | null;
      notes?: string | null;
      resumeUploadId?: string | null;
    }) =>
      clientFetch<{ data: TalentPoolProfile }>("/talent-pool", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
    },
  });
}

export function useUpdateTalentPoolProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        linkedinUrl: string | null;
        source: string | null;
        notes: string | null;
      }>;
    }) =>
      clientFetch<{ data: TalentPoolProfile }>(`/talent-pool/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool", variables.id] });
    },
  });
}

export function useSubmitProfileToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      profileId,
      jobId,
      notes,
    }: {
      profileId: number;
      jobId: number;
      notes?: string | null;
    }) =>
      clientFetch<{ message: string; data: unknown }>(
        `/talent-pool/${profileId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ jobId, notes }),
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({
        queryKey: ["talent-pool", variables.profileId],
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteTalentPoolProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      clientFetch(`/talent-pool/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
    },
  });
}
