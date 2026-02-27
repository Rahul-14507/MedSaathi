
import { createContext, ReactNode, useContext, useState } from "react";
import { User } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    loginMutation: any;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false); // Added isLoading state
    const { toast } = useToast();

    const loginMutation = useMutation({
        mutationFn: async (credentials: any) => {
            setIsLoading(true); // Set loading to true before mutation
            const res = await apiRequest("POST", "/api/login", credentials);
            return await res.json();
        },
        onSuccess: (user: User) => {
            setUser(user);
            setIsLoading(false); // Set loading to false on success
            toast({ title: "Welcome back!", description: `Logged in as ${user.name}` });
        },
        onError: (error: Error) => {
            setIsLoading(false); // Set loading to false on error
            toast({ title: "Login failed", description: error.message, variant: "destructive" });
        },
    });

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, isLoading, loginMutation, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
