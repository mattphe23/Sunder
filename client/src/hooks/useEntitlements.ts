// Central hook for ownership checks. Anonymous users own nothing.
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function useEntitlements() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.store.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const keys = data?.entitlements ?? [];
  return {
    loading: isAuthenticated && isLoading,
    keys,
    has: (key: string) => keys.includes(key),
    hasAll: (ks: string[]) => ks.every((k) => keys.includes(k)),
    purchases: data?.purchases ?? [],
  };
}
