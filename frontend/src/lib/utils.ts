
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const apiRequest = async (
    method: string,
    url: string,
    data?: unknown | undefined,
): Promise<Response> => {
    const res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || res.statusText);
    }

    return res;
};
