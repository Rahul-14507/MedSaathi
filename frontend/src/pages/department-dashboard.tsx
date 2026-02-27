
import { useState } from "react";
import { PrintPatientButton } from "@/components/print-patient-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import {
    Loader2, CheckCircle2, Search, Clock, Activity,
    Pill, FlaskConical, AlertCircle, FileText, User,
    ArrowRight, Package, TestTube
} from "lucide-react";

type QueueItem = {
    id: number;
    patientId: number;
    type: string;
    status: string;
    description: string;
    payload: any;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    notes: string | null;
    patientName: string;
    uniqueId: string;
    authorName: string;
    orgName: string;
};

const roleTheme: Record<string, { title: string; icon: React.ReactNode; accent: string; bgAccent: string }> = {
    pharmacy: {
        title: "Pharmacy Queue",
        icon: <Pill className="w-5 h-5" />,
        accent: "text-amber-600",
        bgAccent: "bg-amber-50",
    },
    diagnostic: {
        title: "Lab & Diagnostics Queue",
        icon: <TestTube className="w-5 h-5" />,
        accent: "text-purple-600",
        bgAccent: "bg-purple-50",
    },
    nurse: {
        title: "Nurse Tasks",
        icon: <Activity className="w-5 h-5" />,
        accent: "text-emerald-600",
        bgAccent: "bg-emerald-50",
    },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Activity className="w-3 h-3" /> },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="w-3 h-3" /> },
};

export default function DepartmentDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Determine effective role for queue fetching
    let role = user?.role || "pharmacy";
    const orgType = (user as any)?.organization?.type;

    // If admin of Lab or Pharmacy, show relevant queue
    if (role === 'admin') {
        if (orgType === 'lab') role = 'diagnostic';
        else if (orgType === 'pharmacy') role = 'pharmacy';
    }

    const theme = roleTheme[role] || roleTheme.pharmacy;

    const { data: queue = [], isLoading } = useQuery<QueueItem[]>({
        queryKey: [`/api/departments/${role}/queue`],
        refetchInterval: 3000,
    });

    // Patient search
    const [search, setSearch] = useState("");
    const [foundPatient, setFoundPatient] = useState<any>(null);
    const searchMutation = useMutation({
        mutationFn: async (query: string) => {
            const res = await apiRequest("GET", `/api/patients/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.length > 0 ? data[0] : null;
        },
        onSuccess: (data) => {
            setFoundPatient(data);
            if (!data) toast({ title: "Not Found", description: "No patient with that ID", variant: "destructive" });
        },
    });

    const pending = queue.filter(i => i.status === "pending");
    const inProgress = queue.filter(i => i.status === "in_progress");
    const completed = queue.filter(i => i.status === "completed");

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <span className={theme.accent}>{theme.icon}</span> {theme.title}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Process and fulfill clinical orders</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 px-3 py-1">{pending.length} Pending</Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 px-3 py-1">{inProgress.length} Active</Badge>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 px-3 py-1">{completed.length} Done</Badge>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="queue" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                    <TabsTrigger value="queue">Task Queue</TabsTrigger>
                    <TabsTrigger value="search">Patient Lookup</TabsTrigger>
                </TabsList>

                <TabsContent value="queue" className="mt-6">
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 max-w-md">
                            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                            <TabsTrigger value="in_progress">Active ({inProgress.length})</TabsTrigger>
                            <TabsTrigger value="completed">Done ({completed.length})</TabsTrigger>
                        </TabsList>

                        {["pending", "in_progress", "completed"].map((tab) => {
                            const items = queue.filter(i => i.status === tab);
                            return (
                                <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                                    {items.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-xl">
                                            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                            <p>No {tab.replace("_", " ")} items</p>
                                        </div>
                                    ) : (
                                        items.map((item) => (
                                            <QueueCard key={item.id} item={item} user={user} theme={theme} />
                                        ))
                                    )}
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </TabsContent>

                <TabsContent value="search" className="mt-6">
                    <div className="space-y-4 max-w-md">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Enter Patient ID (e.g. PAT-10001)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && searchMutation.mutate(search)}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={() => searchMutation.mutate(search)} disabled={searchMutation.isPending}>
                                <Search className="w-4 h-4 mr-2" /> Search
                            </Button>
                        </div>

                        {foundPatient && (
                            <Card className="hover:shadow-lg transition-all hover:border-primary/30 group">
                                <CardContent className="p-5 flex items-center justify-between">
                                    <Link href={`/patients/${foundPatient.id}`}>
                                        <div className="flex items-center gap-4 cursor-pointer flex-1">
                                            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {foundPatient.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{foundPatient.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{foundPatient.uniqueId}</span>
                                                    <span>{foundPatient.gender}</span>
                                                    {foundPatient.bloodGroup && <span className="text-red-500 font-semibold">{foundPatient.bloodGroup}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <PrintPatientButton patient={foundPatient} variant="ghost" size="icon" />
                                        <Link href={`/patients/${foundPatient.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function QueueCard({ item, user, theme }: { item: QueueItem; user: any; theme: any }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showNotesDialog, setShowNotesDialog] = useState(false);
    const [notes, setNotes] = useState("");

    let role = user?.role || "pharmacy";
    const orgType = (user as any)?.organization?.type;
    if (role === 'admin') {
        if (orgType === 'lab') role = 'diagnostic';
        else if (orgType === 'pharmacy') role = 'pharmacy';
    }
    const status = statusConfig[item.status] || statusConfig.pending;

    const updateMutation = useMutation({
        mutationFn: async ({ newStatus, notesText }: { newStatus: string; notesText?: string }) => {
            const res = await apiRequest("PATCH", `/api/actions/${item.id}`, {
                status: newStatus,
                notes: notesText || null,
                completedBy: user?.id,
                completedByOrganizationId: user?.organizationId,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/departments/${role}/queue`] });
            toast({ title: "Updated", description: "Task status updated." });
            setShowNotesDialog(false);
            setNotes("");
        },
    });

    const handleComplete = () => {
        setShowNotesDialog(true);
    };

    return (
        <>
            <Card className="animate-slide-up">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-xl ${theme.bgAccent} flex items-center justify-center ${theme.accent}`}>
                                {item.type === "prescription" ? <Pill className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground capitalize">{item.type.replace("_", " ")}</span>
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                                        {status.icon} {status.label}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1.5">{item.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <Link href={`/patients/${item.patientId}`}>
                                        <span className="flex items-center gap-1 hover:text-primary cursor-pointer">
                                            <User className="w-3 h-3" /> {item.patientName}
                                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.uniqueId}</span>
                                        </span>
                                    </Link>
                                    <span>by {item.authorName}</span>
                                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                                </div>
                                {item.notes && (
                                    <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                                        <p className="font-medium text-emerald-700 text-xs mb-0.5">Notes:</p>
                                        {item.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        {item.status === "pending" && (
                            <Button size="sm" onClick={() => updateMutation.mutate({ newStatus: "in_progress" })} disabled={updateMutation.isPending}>
                                Start Processing
                            </Button>
                        )}
                        {item.status === "in_progress" && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleComplete} disabled={updateMutation.isPending}>
                                <CheckCircle2 className="w-4 h-4" /> Mark Complete
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Notes dialog on completion */}
            <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Task</DialogTitle>
                        <DialogDescription>
                            Add notes or results before marking this task as complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2">
                        <Textarea
                            placeholder={
                                item.type === "prescription"
                                    ? "e.g. Medication dispensed. Advised patient on dosage."
                                    : "e.g. Results: WBC 10,500/µL (normal). No abnormalities found."
                            }
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => updateMutation.mutate({ newStatus: "completed", notesText: notes })}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Completing..." : "Complete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
