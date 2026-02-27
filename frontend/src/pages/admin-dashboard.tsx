
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Users, Stethoscope, Building2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const staffSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    employeeId: z.string().min(3, "ID must be at least 3 characters"),
    role: z.enum(["doctor", "nurse", "admin"]),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
    doctor: { label: "Doctor", color: "text-blue-700", bg: "bg-blue-100" },
    nurse: { label: "Nurse", color: "text-emerald-700", bg: "bg-emerald-100" },
    admin: { label: "Administrator", color: "text-slate-700", bg: "bg-slate-100" },
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const { data: staff, isLoading } = useQuery<any[]>({
        queryKey: [`/api/staff?organizationId=${(user as any)?.organizationId}`],
    });

    const createStaffMutation = useMutation({
        mutationFn: async (data: StaffFormValues) => {
            const res = await apiRequest("POST", "/api/staff", {
                ...data,
                organizationId: (user as any)?.organizationId,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/staff?organizationId=${(user as any)?.organizationId}`] });
            toast({ title: "✅ Staff Member Added", description: "New user has been successfully registered." });
            setOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Failed to add staff", description: error.message, variant: "destructive" });
        },
    });

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: { name: "", employeeId: "", role: "doctor", password: "" },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground text-sm font-medium">Loading staff data…</p>
                </div>
            </div>
        );
    }

    const doctorsCount = staff?.filter((u: any) => u.role === "doctor").length || 0;
    const nursesCount = staff?.filter((u: any) => u.role === "nurse").length || 0;
    const adminCount = staff?.filter((u: any) => u.role === "admin").length || 0;

    return (
        <div className="space-y-8 animate-fade-in">

            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="section-header mb-1">Hospital Administration</p>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Staff Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your hospital's authorized personnel and access controls.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2 h-10">
                            <UserPlus className="h-4 w-4" /> Add Staff Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[440px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">Add New Staff Member</DialogTitle>
                            <DialogDescription className="text-sm">
                                Register a new doctor or nurse. They'll use the Hospital Code to sign in.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => createStaffMutation.mutate(data))} className="space-y-4 mt-2">
                                <FormField control={form.control} name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                                            <FormControl><Input placeholder="Dr. John Doe" className="h-10" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="employeeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Employee ID</FormLabel>
                                            <FormControl><Input placeholder="DOC123" className="h-10 font-mono" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="doctor">Doctor</SelectItem>
                                                    <SelectItem value="nurse">Nurse</SelectItem>
                                                    <SelectItem value="admin">Administrator</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Password</FormLabel>
                                            <FormControl><Input type="password" placeholder="Create a strong password" className="h-10" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter className="pt-2">
                                    <Button type="submit" disabled={createStaffMutation.isPending} className="w-full gradient-primary text-white h-11 font-semibold shadow-md">
                                        {createStaffMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering…</> : "Register Staff Member"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="stat-primary rounded-2xl p-6 border border-blue-200/50 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-blue-700">Total Staff</p>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{staff?.length || 0}</p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">Active personnel</p>
                </div>
                <div className="stat-emerald rounded-2xl p-6 border border-emerald-200/50 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-emerald-700">Doctors</p>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Stethoscope className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-900">{doctorsCount}</p>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Physicians & specialists</p>
                </div>
                <div className="stat-amber rounded-2xl p-6 border border-amber-200/50 shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-amber-700">Nurses</p>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-amber-900">{nursesCount}</p>
                    <p className="text-xs text-amber-600 mt-1 font-medium">Registered nursing staff</p>
                </div>
            </div>

            {/* Staff Table */}
            <Card className="border shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-muted/30 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-semibold">Authorized Personnel</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                        All users linked to{" "}
                        <span className="font-semibold text-foreground">{(user as any)?.organization?.name || "your hospital"}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                                <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee ID</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff?.map((employee: any) => {
                                const cfg = roleConfig[employee.role] || roleConfig.admin;
                                return (
                                    <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="pl-6 font-mono font-semibold text-sm text-primary">{employee.employeeId}</TableCell>
                                        <TableCell className="font-medium text-foreground">{employee.name}</TableCell>
                                        <TableCell>
                                            <span className={`role-badge ${cfg.color} ${cfg.bg}`}>
                                                {cfg.label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="sm" disabled className="text-xs h-7">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {(!staff || staff.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-28 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Users className="h-8 w-8 opacity-30" />
                                            <p className="text-sm font-medium">No staff found.</p>
                                            <p className="text-xs">Add your first team member using the button above.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
