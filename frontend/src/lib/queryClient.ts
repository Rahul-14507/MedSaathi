
import { QueryClient } from "@tanstack/react-query";

async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
    const res = await fetch(queryKey[0] as string);
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message || res.statusText);
    }
    return res.json();
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: defaultQueryFn as any,
            refetchOnWindowFocus: false,
            retry: false,
            staleTime: 30000, // 30 seconds
        },
    },
});
