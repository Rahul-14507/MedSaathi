import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Plus, Trash2, FlaskConical, Pill, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").toUpperCase(),
  type: z.enum(["hospital", "pharmacy", "lab"]),
  address: z.string().optional(),
  adminEmployeeId: z.string().min(3, "Admin ID must be at least 3 characters"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type OrgFormValues = z.infer<typeof orgSchema>;

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  hospital: { label: "Hospital", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-200" },
  pharmacy: { label: "Pharmacy", color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200" },
  lab: { label: "Laboratory", color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-200" },
  platform: { label: "Platform", color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
};

export default function PlatformDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: orgs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/organizations"],
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: OrgFormValues) => {
      const res = await apiRequest("POST", "/api/admin/organizations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({
        title: "✅ Organization Registered",
        description: `Login with Code: ${data.organization.code} | Admin: ${data.admin.employeeId}`,
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to register", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Organization Deleted", description: "The organization and its users have been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "", code: "", type: "hospital", address: "", adminEmployeeId: "", adminPassword: "" },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Loading platform data…</p>
        </div>
      </div>
    );
  }

  const hospitalCount = orgs?.filter((o) => o.type === "hospital").length || 0;
  const pharmacyCount = orgs?.filter((o) => o.type === "pharmacy").length || 0;
  const labCount = orgs?.filter((o) => o.type === "lab").length || 0;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="section-header mb-1">Super Admin</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage registered organizations and onboard new partners across the network.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white shadow-md hover:shadow-lg transition-all h-10 gap-2">
              <Plus className="h-4 w-4" /> Register Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Register New Organization</DialogTitle>
              <DialogDescription className="text-sm">
                Add a new entity and define its initial admin credentials.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createOrgMutation.mutate(data))} className="space-y-4 mt-2">
                <FormField control={form.control} name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Organization Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Metro Diagnostics" className="h-10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Org Code</FormLabel>
                        <FormControl>
                          <Input placeholder="METRO" className="h-10 font-mono" {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="lab">Laboratory</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="adminEmployeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Admin ID</FormLabel>
                        <FormControl><Input placeholder="ADM-001" className="h-10 font-mono" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••" className="h-10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField control={form.control} name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Address <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                      <FormControl><Input placeholder="123 Main St" className="h-10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createOrgMutation.isPending} className="w-full gradient-primary text-white h-11 font-semibold shadow-md">
                    {createOrgMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering…</> : "Register Organization"}
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
            <p className="text-sm font-medium text-blue-700">Hospitals</p>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-900">{hospitalCount}</p>
          <p className="text-xs text-blue-600 mt-1 font-medium">Registered health facilities</p>
        </div>
        <div className="stat-emerald rounded-2xl p-6 border border-emerald-200/50 shadow-sm hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-emerald-700">Pharmacies</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Pill className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-900">{pharmacyCount}</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Dispensing centers</p>
        </div>
        <div className="stat-purple rounded-2xl p-6 border border-purple-200/50 shadow-sm hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-purple-700">Laboratories</p>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-900">{labCount}</p>
          <p className="text-xs text-purple-600 mt-1 font-medium">Diagnostic centers</p>
        </div>
      </div>

      {/* Organizations Table */}
      <Card className="border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Registered Organizations</CardTitle>
          </div>
          <CardDescription className="text-xs mt-0.5">
            All entities on the MediConnect platform — {orgs?.length || 0} total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs?.map((org) => {
                const cfg = typeConfig[org.type] || typeConfig.platform;
                return (
                  <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-mono font-bold text-primary text-sm">{org.code}</TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <span className={`role-badge ${cfg.color} ${cfg.bg} border ${cfg.border}`}>{cfg.label}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.address || "—"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{org.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove <b>{org.name}</b> and all associated user accounts. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteOrgMutation.mutate(org.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
