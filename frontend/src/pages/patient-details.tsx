
import { useState } from "react";
import { PrintPatientButton } from "@/components/print-patient-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/utils";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowLeft, User, Calendar, Droplets, Phone, Pill,
    FlaskConical, Loader2, Plus, Clock, CheckCircle2,
    AlertCircle, Activity, FileText, Stethoscope, Edit2
} from "lucide-react";

type Patient = {
    id: number;
    uniqueId: string;
    name: string;
    dob: number;
    gender: string;
    contact: string | null;
    bloodGroup: string | null;
};

type TimelineAction = {
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
    authorName: string;
    orgName: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
    in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Activity className="w-3 h-3" /> },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="w-3 h-3" /> },
};

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    prescription: { label: "Prescription", icon: <Pill className="w-4 h-4" />, color: "text-amber-600" },
    lab_test: { label: "Lab Test", icon: <FlaskConical className="w-4 h-4" />, color: "text-purple-600" },
    radiology: { label: "Radiology", icon: <FileText className="w-4 h-4" />, color: "text-blue-600" },
    observation: { label: "Observation", icon: <Stethoscope className="w-4 h-4" />, color: "text-emerald-600" },
    procedure: { label: "Procedure", icon: <Activity className="w-4 h-4" />, color: "text-rose-600" },
};

export default function PatientDetails({ id }: { id: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const patientId = parseInt(id);

    const [showOrderDialog, setShowOrderDialog] = useState(false);
    const [orderType, setOrderType] = useState<string>("prescription");
    const [orderDescription, setOrderDescription] = useState("");

    const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient>({
        queryKey: [`/api/patients/${patientId}`],
    });

    const { data: details, isLoading: isLoadingDetails } = useQuery<{ visits: any[]; actions: TimelineAction[] }>({
        queryKey: [`/api/patients/${patientId}/details`],
        refetchInterval: 5000,
    });

    const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<any>(null);
    const [diagnosisText, setDiagnosisText] = useState("");

    const [showNurseDialog, setShowNurseDialog] = useState(false);
    const [symptomsText, setSymptomsText] = useState("");
    const [priorityLevel, setPriorityLevel] = useState("normal");

    const updateVisitMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("PATCH", `/api/visits/${selectedVisit.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/details`] });
            toast({ title: "Updated", description: "Visit details updated successfully." });
            setShowDiagnosisDialog(false);
            setShowNurseDialog(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const createActionMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/actions", {
                patientId,
                authorId: user?.id,
                fromOrganizationId: (user as any)?.organizationId || 1,
                type: orderType,
                description: orderDescription,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/details`] });
            toast({ title: "Order Placed", description: `${typeConfig[orderType]?.label || orderType} order created successfully.` });
            setShowOrderDialog(false);
            setOrderDescription("");
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleEditDiagnosis = (visit: any) => {
        setSelectedVisit(visit);
        setDiagnosisText(visit.diagnosis || "");
        setShowDiagnosisDialog(true);
    };

    const handleEditNurse = (visit: any) => {
        setSelectedVisit(visit);
        setSymptomsText(visit.symptoms || "");
        setPriorityLevel(visit.priority || "normal");
        setShowNurseDialog(true);
    };

    if (isLoadingPatient || isLoadingDetails) {
        return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }
    if (!patient) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">Patient not found</p>
                <Link href="/"><Button variant="outline" className="mt-4">Go Back</Button></Link>
            </div>
        );
    }

    const age = Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const actions = details?.actions || [];
    const visits = details?.visits || [];
    const isDoctor = user?.role === "doctor";

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Back Button */}
            <Link href={isDoctor ? "/doctor" : "/nurse"}>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
            </Link>

            {/* Patient Info Card */}
            <Card className="border-l-4 border-l-primary">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
                                <span className="font-mono text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                                    {patient.uniqueId}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <PrintPatientButton
                                patient={patient}
                                variant="outline"
                                className="gap-2"
                                label="Print Report"
                            />
                            {isDoctor && (
                                <Button
                                    onClick={() => setShowOrderDialog(true)}
                                    className="gradient-primary border-0 text-white shadow-md gap-2"
                                >
                                    <Plus className="w-4 h-4" /> New Order
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t">
                        <InfoItem icon={<User className="w-4 h-4" />} label="Gender" value={patient.gender} />
                        <InfoItem icon={<Calendar className="w-4 h-4" />} label="Age" value={`${age} years`} />
                        <InfoItem icon={<Calendar className="w-4 h-4" />} label="DOB" value={new Date(patient.dob).toLocaleDateString()} />
                        <InfoItem icon={<Droplets className="w-4 h-4" />} label="Blood Group" value={patient.bloodGroup || "N/A"} />
                        <InfoItem icon={<Phone className="w-4 h-4" />} label="Contact" value={patient.contact || "N/A"} />
                    </div>
                </CardContent>
            </Card>

            {/* Visits */}
            {visits.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" /> Visit History
                    </h2>
                    <div className="grid gap-3">
                        {visits.map((v: any, i: number) => {
                            const vitals = typeof v.visit.vitals === "string" ? JSON.parse(v.visit.vitals) : v.visit.vitals;
                            return (
                                <Card key={v.visit.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Badge variant="outline" className="font-normal">{v.orgName}</Badge>
                                                {v.staffName && <span className="text-muted-foreground">by {v.staffName}</span>}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(v.visit.date), { addSuffix: true })}
                                            </span>
                                        </div>
                                        {vitals && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {vitals.weight && <VitalBadge label="Weight" value={`${vitals.weight} kg`} />}
                                                {vitals.bp && <VitalBadge label="BP" value={vitals.bp} />}
                                                {vitals.temp && <VitalBadge label="Temp" value={`${vitals.temp}°C`} />}
                                                {vitals.hr && <VitalBadge label="HR" value={`${vitals.hr} bpm`} />}
                                                {vitals.spo2 && <VitalBadge label="SpO₂" value={`${vitals.spo2}%`} />}
                                            </div>
                                        )}
                                        {v.visit.symptoms && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                <span className="font-medium text-foreground">Symptoms:</span> {v.visit.symptoms}
                                            </p>
                                        )}
                                        {v.visit.diagnosis && (
                                            <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-sm text-purple-900">
                                                <span className="font-semibold">Diagnosis:</span> {v.visit.diagnosis}
                                            </div>
                                        )}
                                        {isDoctor && (
                                            <div className="mt-2 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditDiagnosis(v.visit)}
                                                    className="h-6 text-xs text-primary hover:bg-primary/5"
                                                >
                                                    <Edit2 className="w-3 h-3 mr-1" /> {v.visit.diagnosis ? "Edit Diagnosis" : "Add Diagnosis"}
                                                </Button>
                                            </div>
                                        )}
                                        {user?.role === "nurse" && (
                                            <div className="mt-2 flex justify-end">
                                                <Button
                                                    variant={v.visit.priority === 'emergency' || v.visit.priority === 'critical' ? 'destructive' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleEditNurse(v.visit)}
                                                    className="h-7 text-xs gap-1"
                                                >
                                                    <AlertCircle className="w-3 h-3" />
                                                    {v.visit.priority === 'emergency' ? 'Reported Emergency' : 'Update / Report Issue'}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )
            }

            {/* Clinical Actions */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Clinical Orders ({actions.length})
                </h2>
                {actions.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No clinical orders yet</p>
                        {isDoctor && <p className="text-sm mt-1">Click "New Order" to create one</p>}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {actions.map((action, i) => {
                            const type = typeConfig[action.type] || { label: action.type, icon: <FileText className="w-4 h-4" />, color: "text-gray-600" };
                            const status = statusConfig[action.status] || statusConfig.pending;
                            return (
                                <Card key={action.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${type.color}`}>
                                                    {type.icon}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-foreground">{type.label}</span>
                                                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                                                            {status.icon} {status.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Ordered by <span className="font-medium text-foreground">{action.authorName}</span> at {action.orgName}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        {action.notes && (
                                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                                                <p className="font-medium text-emerald-700 text-xs mb-1">Results / Notes:</p>
                                                <p className="text-emerald-900">{action.notes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Order Dialog */}
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" /> New Clinical Order
                        </DialogTitle>
                        <DialogDescription>
                            Create a prescription, lab test, or other clinical order for {patient.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Order Type</label>
                            <Select value={orderType} onValueChange={setOrderType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="prescription">💊 Prescription</SelectItem>
                                    <SelectItem value="lab_test">🔬 Lab Test</SelectItem>
                                    <SelectItem value="radiology">📷 Radiology</SelectItem>
                                    <SelectItem value="observation">🩺 Observation</SelectItem>
                                    <SelectItem value="procedure">⚡ Procedure</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Description</label>
                            <Textarea
                                placeholder={
                                    orderType === "prescription"
                                        ? "e.g. Paracetamol 500mg - 1 tablet TDS for 5 days"
                                        : orderType === "lab_test"
                                            ? "e.g. Complete Blood Count (CBC), Lipid Panel"
                                            : "Enter details..."
                                }
                                value={orderDescription}
                                onChange={(e) => setOrderDescription(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setShowOrderDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => createActionMutation.mutate()}
                            disabled={!orderDescription.trim() || createActionMutation.isPending}
                            className="gradient-primary border-0 text-white"
                        >
                            {createActionMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Place Order"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDiagnosisDialog} onOpenChange={setShowDiagnosisDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Diagnosis</DialogTitle>
                        <DialogDescription>
                            Enter the diagnosis or problem list for this visit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2">
                        <Textarea
                            placeholder="e.g. Acute Viral Fever, Type 2 Diabetes Mellitus..."
                            value={diagnosisText}
                            onChange={(e) => setDiagnosisText(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDiagnosisDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => updateVisitMutation.mutate({ diagnosis: diagnosisText })}
                            disabled={updateVisitMutation.isPending}
                            className="gradient-primary text-white"
                        >
                            {updateVisitMutation.isPending ? "Saving..." : "Save Diagnosis"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showNurseDialog} onOpenChange={setShowNurseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" /> Update Patient Status
                        </DialogTitle>
                        <DialogDescription>
                            Update symptoms and flag emergency status if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Priority / Status</label>
                            <Select value={priorityLevel} onValueChange={setPriorityLevel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">🟢 Normal Condition</SelectItem>
                                    <SelectItem value="emergency">🔴 Emergency (Doctor Alert)</SelectItem>
                                    <SelectItem value="critical">🚨 Critical (Immediate Action)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Current Symptoms / Issues</label>
                            <Textarea
                                placeholder="Describe current symptoms, vitals changes, or reasons for emergency..."
                                value={symptomsText}
                                onChange={(e) => setSymptomsText(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNurseDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => updateVisitMutation.mutate({ symptoms: symptomsText, priority: priorityLevel })}
                            disabled={updateVisitMutation.isPending}
                            className={priorityLevel === 'normal' ? "gradient-primary text-white" : "bg-red-600 hover:bg-red-700 text-white"}
                        >
                            {updateVisitMutation.isPending ? "Updating..." : priorityLevel === 'normal' ? "Update Visit" : "Report Emergency"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
        </div>
    );
}

function VitalBadge({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
            <span className="font-medium">{label}:</span> {value}
        </span>
    );
}
