
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
    Stethoscope,
    LogOut,
    LayoutDashboard,
    Users,
    FlaskConical,
    Pill,
    Heart,
    Building2
} from "lucide-react";

const roleNav: Record<string, { path: string; label: string; icon: React.ReactNode }[]> = {
    doctor: [
        { path: "/doctor", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
    nurse: [
        { path: "/nurse", label: "Dashboard", icon: <Users className="w-4 h-4" /> },
    ],
    pharmacy: [
        { path: "/department", label: "Queue", icon: <Pill className="w-4 h-4" /> },
    ],
    diagnostic: [
        { path: "/department", label: "Queue", icon: <FlaskConical className="w-4 h-4" /> },
    ],
    admin: [
        { path: "/admin", label: "Hospital Portal", icon: <Building2 className="w-4 h-4" /> },
    ],
    super_admin: [
        { path: "/platform", label: "Platform Admin", icon: <Building2 className="w-4 h-4" /> },
    ],
};

const roleColor: Record<string, string> = {
    doctor: "bg-blue-100 text-blue-700",
    nurse: "bg-emerald-100 text-emerald-700",
    pharmacy: "bg-amber-100 text-amber-700",
    diagnostic: "bg-purple-100 text-purple-700",
    admin: "bg-slate-100 text-slate-700",
    super_admin: "bg-indigo-100 text-indigo-700",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    const navItems = roleNav[user?.role || ""] || [];
    const organization = (user as any)?.organization;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo & Nav */}
                    <div className="flex items-center gap-6">
                        <Link href="/">
                            <div className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                    MediConnect
                                </h1>
                            </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1 ml-4">
                            {navItems.map((item) => (
                                <Link key={item.path} href={item.path}>
                                    <button
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location === item.path
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        {organization && (
                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                                <Building2 className="w-3.5 h-3.5" />
                                {organization.name}
                            </div>
                        )}
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-foreground leading-tight">{user?.name}</p>
                            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${roleColor[user?.role || ""]}`}>
                                {user?.role}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => logout()}
                            className="text-muted-foreground hover:text-destructive"
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 animate-fade-in">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t py-3 text-center text-xs text-muted-foreground">
                MediConnect — Patient-Centric Clinical Workflow Platform
            </footer>
        </div>
    );
}
