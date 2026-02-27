
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
import { Loader2, UserPlus, Users, Stethoscope, Building2 } from "lucide-react";
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

export default function AdminDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    // Fetch Staff
    const { data: staff, isLoading } = useQuery<any[]>({
        queryKey: [`/api/staff?organizationId=${(user as any)?.organizationId}`],
    });

    // Create Staff
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
            toast({
                title: "Staff Member Added",
                description: "New user has been successfully registered.",
            });
            setOpen(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to add staff",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            name: "",
            employeeId: "",
            role: "doctor", // Default
            password: "",
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const doctorsCount = staff?.filter((u: any) => u.role === "doctor").length || 0;
    const nursesCount = staff?.filter((u: any) => u.role === "nurse").length || 0;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{staff?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Active in your hospital</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Doctors</CardTitle>
                        <Stethoscope className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{doctorsCount}</div>
                        <p className="text-xs text-muted-foreground">Physicians & Specialists</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nurses</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{nursesCount}</div>
                        <p className="text-xs text-muted-foreground">Registered Nursing Staff</p>
                    </CardContent>
                </Card>
            </div>

            {/* Staff Management Section */}
            <Card className="border-t-4 border-t-primary">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Staff Management</CardTitle>
                        <CardDescription>View and manage your hospital's authorized personnel.</CardDescription>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white shadow-md hover:shadow-lg transition-all">
                                <UserPlus className="mr-2 h-4 w-4" /> Add Staff
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Staff Member</DialogTitle>
                                <DialogDescription>
                                    Register a new doctor or nurse. They will use the Hospital Code to sign in.
                                </DialogDescription>
                            </DialogHeader>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => createStaffMutation.mutate(data))} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Dr. John Doe" {...field} />
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
                                                <FormLabel>Employee ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="DOC123" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a role" />
                                                        </SelectTrigger>
                                                    </FormControl>
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
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Create a password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" disabled={createStaffMutation.isPending} className="w-full gradient-primary">
                                            {createStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Register Staff
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff?.map((employee: any) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-mono font-medium">{employee.employeeId}</TableCell>
                                        <TableCell className="font-medium">{employee.name}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${employee.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                                                    employee.role === 'nurse' ? 'bg-emerald-100 text-emerald-800' :
                                                        'bg-slate-100 text-slate-800'}`}>
                                                {employee.role}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" disabled>Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {staff?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No staff found. Add your first employee.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
