
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Heart, Shield, FileText, Activity, ArrowRight, Loader2 } from "lucide-react";

const loginSchema = z.object({
    orgCode: z.string().min(1, "Organization Code is required"),
    employeeId: z.string().min(1, "Employee ID is required"),
    password: z.string().min(1, "Password is required"),
});

const features = [
    { icon: <Shield className="w-6 h-6" />, title: "Multi-Tenant", desc: "Hospitals, Pharmacies & Labs on one platform" },
    { icon: <FileText className="w-6 h-6" />, title: "Patient-Centric", desc: "Unified patient records across organizations" },
    { icon: <Activity className="w-6 h-6" />, title: "Real-Time", desc: "Live coordination between clinical teams" },
];

export default function AuthPage() {
    const { user, loginMutation } = useAuth();

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { orgCode: "", employeeId: "", password: "" },
    });

    if (user) return <Redirect to="/" />;

    return (
        <div className="flex min-h-screen">
            {/* Left Panel — Hero */}
            <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                            <Heart className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">MediConnect</h1>
                            <p className="text-white/70 text-sm">Clinical Workflow Platform</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Patient-Centric<br />
                        <span className="text-cyan-300">Care Coordination</span>
                    </h2>
                    <p className="text-white/70 text-lg mb-10 max-w-md">
                        Seamlessly connect hospitals, pharmacies, and laboratories
                        for unified patient care.
                    </p>

                    <div className="space-y-5">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{f.title}</h3>
                                    <p className="text-white/60 text-sm">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
                <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-cyan-400/10 rounded-full" />
            </div>

            {/* Right Panel — Login */}
            <div className="flex-1 flex items-center justify-center p-6 bg-background">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                            <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">MediConnect</h1>
                            <p className="text-xs text-muted-foreground">Clinical Workflow Platform</p>
                        </div>
                    </div>

                    <Card className="shadow-xl border-0 bg-card">
                        <CardHeader className="pb-1 pt-8 px-8">
                            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                            <p className="text-muted-foreground text-sm mt-1">Sign in to your organization account</p>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5 mt-4">
                                    <FormField
                                        control={form.control}
                                        name="orgCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium">Organization Code</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. CITY"
                                                        className="h-11"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="employeeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium">Employee ID</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. DOC001"
                                                        className="h-11"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium">Password</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter password"
                                                        className="h-11"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full h-11 gradient-primary border-0 text-white font-semibold shadow-md hover:shadow-lg transition-all" disabled={loginMutation.isPending}>
                                        {loginMutation.isPending ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                                        ) : (
                                            <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                                        )}
                                    </Button>
                                </form>
                            </Form>

                            {/* Demo credentials */}
                            <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-dashed">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demo Credentials</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-background rounded-lg">
                                        <span className="font-semibold text-blue-600">Doctor</span>
                                        <p className="text-muted-foreground mt-0.5">CITY / DOC001</p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg">
                                        <span className="font-semibold text-emerald-600">Nurse</span>
                                        <p className="text-muted-foreground mt-0.5">CITY / NUR001</p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg">
                                        <span className="font-semibold text-amber-600">Pharmacy</span>
                                        <p className="text-muted-foreground mt-0.5">GREEN / PH001</p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg">
                                        <span className="font-semibold text-purple-600">Lab</span>
                                        <p className="text-muted-foreground mt-0.5">LAB / LAB001</p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg col-span-2 text-center border border-dashed border-primary/20">
                                        <span className="font-semibold text-primary">Hospital Admin</span>
                                        <p className="text-muted-foreground mt-0.5">CITY / ADM001</p>
                                    </div>
                                    <div className="p-2 bg-background rounded-lg col-span-2 text-center border border-dashed border-indigo-500/20">
                                        <span className="font-semibold text-indigo-600">Platform Admin</span>
                                        <p className="text-muted-foreground mt-0.5">HQ / SUPER001</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 text-center">Password for all: <strong>password</strong></p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
