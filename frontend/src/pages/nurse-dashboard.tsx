import React, { useState } from "react";
import { PrintPatientButton } from "@/components/print-patient-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/utils";
import { Link } from "wouter";
import {
  UserPlus,
  Users,
  ClipboardCheck,
  Search,
  Trash2,
  Loader2,
  Stethoscope,
  Eye,
  Heart,
  Thermometer,
  Scale,
  Activity,
  Printer,
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Patient = {
  id: number;
  uniqueId: string;
  name: string;
  dob: string | Date;
  gender: string;
  contact: string | null;
  bloodGroup: string | null;
};

const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  contact: z.string().optional(),
  bloodGroup: z.string().optional(),
});

const vitalsSchema = z.object({
  weight: z.string().optional(),
  bp: z.string().optional(),
  temp: z.string().optional(),
  hr: z.string().optional(),
  spo2: z.string().optional(),
  symptoms: z.string().optional(),
});

const combinedSchema = patientSchema.merge(vitalsSchema);

export default function NurseDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nurse Station</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Register patients, record vitals, and manage check-ins
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          label="Total Patients"
          value={stats?.totalPatients || patients.length}
          color="blue"
        />
        <StatCard
          icon={<ClipboardCheck className="w-5 h-5 text-emerald-600" />}
          label="Total Visits"
          value={stats?.totalVisits || 0}
          color="emerald"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-amber-600" />}
          label="Pending Actions"
          value={stats?.pendingActions || 0}
          color="amber"
        />
        <StatCard
          icon={<Heart className="w-5 h-5 text-rose-600" />}
          label="Completed"
          value={stats?.completedActions || 0}
          color="rose"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="checkin" className="gap-2">
            <UserPlus className="w-4 h-4" /> New Check-In
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2">
            <Users className="w-4 h-4" /> Patients ({patients.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2">
            <Truck className="w-4 h-4" /> Transfers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-6">
          <CheckInForm />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          {/* Search */}
          <div className="flex gap-2 mb-4 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No patients found</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPatients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="transfers" className="mt-6">
          <TransferQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`absolute top-0 left-0 h-1 w-full bg-${color}-500`} />
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CheckInForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [successPatient, setSuccessPatient] = useState<Patient | null>(null);
  const [vitalsData, setVitalsData] = useState<any>(null); // Store vitals for print

  // Print functionality replaced by PrintPatientButton component

  const form = useForm<z.infer<typeof combinedSchema>>({
    resolver: zodResolver(combinedSchema),
    defaultValues: {
      name: "",
      dob: "",
      gender: "",
      contact: "",
      bloodGroup: "",
      weight: "",
      bp: "",
      temp: "",
      hr: "",
      spo2: "",
      symptoms: "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof combinedSchema>) => {
      // 1. Create patient
      const patientRes = await apiRequest("POST", "/api/patients", {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        contact: data.contact || null,
        bloodGroup: data.bloodGroup || null,
      });
      const patient = await patientRes.json();

      // 2. Create visit with vitals
      const vitals = {
        weight: data.weight,
        bp: data.bp,
        temp: data.temp,
        hr: data.hr,
        spo2: data.spo2,
      };

      await apiRequest("POST", "/api/visits", {
        patientId: patient.id,
        organizationId: (user as any)?.organizationId || 1,
        vitals: vitals,
        symptoms: data.symptoms || null,
        attendedBy: user?.id,
      });

      return { patient, vitals };
    },
    onSuccess: ({ patient, vitals }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSuccessPatient(patient);
      setVitalsData(vitals);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Card className="max-w-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Patient Registration & Vitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                createPatientMutation.mutate(data),
              )}
              className="space-y-6"
            >
              {/* Demographics */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Patient Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Patient name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              "A+",
                              "A-",
                              "B+",
                              "B-",
                              "AB+",
                              "AB-",
                              "O+",
                              "O-",
                            ].map((bg) => (
                              <SelectItem key={bg} value={bg}>
                                {bg}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Vitals */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Vitals & Symptoms
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Weight (kg)</FormLabel>
                        <FormControl>
                          <Input placeholder="65" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">BP</FormLabel>
                        <FormControl>
                          <Input placeholder="120/80" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Temp (°C)</FormLabel>
                        <FormControl>
                          <Input placeholder="36.8" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Heart Rate</FormLabel>
                        <FormControl>
                          <Input placeholder="72" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="spo2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">SpO₂ (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="98" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-3">
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Chief Complaint / Symptoms
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Headache, fever, body pain..."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto gradient-primary text-white border-0 shadow-md"
                disabled={createPatientMutation.isPending}
              >
                {createPatientMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" /> Register & Check In
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog
        open={!!successPatient}
        onOpenChange={() => setSuccessPatient(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <ClipboardCheck className="w-5 h-5" /> Patient Registered!
            </DialogTitle>
            <DialogDescription>
              The patient has been successfully registered and checked in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Patient Unique ID
              </p>
              <p className="text-3xl font-bold font-mono text-primary tracking-wider">
                {successPatient?.uniqueId}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Share this ID with the patient for future reference
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <PrintPatientButton
              patient={successPatient}
              vitals={vitalsData}
              label="Print Admission Card"
              className="w-full sm:w-auto gradient-primary text-white border-0"
            />
            <Button
              variant="outline"
              onClick={() => setSuccessPatient(null)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PatientRow({ patient }: { patient: Patient }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/patients/${patient.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Deleted",
        description: `Patient ${patient.uniqueId} removed.`,
      });
      setShowDelete(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center justify-between">
          <Link href={`/patients/${patient.id}`}>
            <div className="flex items-center gap-4 cursor-pointer flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {patient.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{patient.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {patient.uniqueId}
                  </span>
                  <span>{patient.gender}</span>
                  {patient.bloodGroup && (
                    <span className="text-red-500 font-semibold">
                      {patient.bloodGroup}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/patients/${patient.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <PrintPatientButton
              patient={patient}
              variant="ghost"
              size="sm"
              label=""
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDelete(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <TransferPatientDialog patient={patient} />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{patient.name}</strong> (
              {patient.uniqueId}) and all associated visits and actions. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransferPatientDialog({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: hospitals = [] } = useQuery<any[]>({
    queryKey: ["/api/hospitals"],
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/transfers", {
        patientId: patient.id,
        targetOrgId: parseInt(targetOrgId),
        fromOrgId: (user as any)?.organizationId,
        authorId: user?.id,
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Initiated",
        description: "Patient transfer request sent.",
      });
      setOpen(false);
      setNotes("");
      setTargetOrgId("");
    },
    onError: () => {
      toast({
        title: "Transfer Failed",
        description: "Could not initiate transfer.",
        variant: "destructive",
      });
    },
  });

  const filteredHospitals = hospitals.filter(
    (h) => h.id !== (user as any)?.organizationId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Truck className="w-4 h-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Patient</DialogTitle>
          <DialogDescription>
            Transfer <strong>{patient.name}</strong> to another facility.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Hospital</label>
            <Select onValueChange={setTargetOrgId} value={targetOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Hospital" />
              </SelectTrigger>
              <SelectContent>
                {filteredHospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id.toString()}>
                    {h.name} ({h.address})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Transfer Notes</label>
            <Textarea
              placeholder="Reason for transfer, medical condition, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={!targetOrgId || transferMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {transferMutation.isPending ? "Sending..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: queue = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/departments/nurse/queue`],
    refetchInterval: 5000,
  });

  // Filter for transfers only and where target is current org (incoming)
  // OR outgoing (from current org) ?
  // The backend `GET /api/departments/:role/queue` returns items based on role.
  // For nurse, it returns `transfer` types.
  // We want to differentiate Incoming vs Outgoing or just show all.
  // Ideally, "Incoming" are the ones we need to act on.

  // Actually, the backend filter `roleActionMap` just gets ALL `transfer` actions.
  // We should probably filter by `payload.targetOrgId === user.organizationId` for "Incoming".

  const incomingTransfers = queue.filter(
    (item) =>
      item.type === "transfer" &&
      item.payload?.targetOrgId === (user as any)?.organizationId &&
      item.status !== "completed",
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/actions/${id}`, {
        status,
        completedBy: user?.id,
        completedByOrganizationId: (user as any)?.organizationId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/departments/nurse/queue`],
      });
      toast({
        title: "Transfer Accepted",
        description: "Patient has been admitted.",
      });
    },
  });

  if (isLoading)
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin w-6 h-6 mx-auto" />
      </div>
    );

  if (incomingTransfers.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
        <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>No incoming transfers</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {incomingTransfers.map((item) => (
        <Card
          key={item.id}
          className="animate-slide-up border-l-4 border-l-blue-500"
        >
          <CardContent className="p-4 flex justify-between items-center">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{item.patientName}</h3>
                <div className="text-sm text-muted-foreground flex gap-3">
                  <span className="font-mono bg-muted px-1 rounded">
                    {item.uniqueId}
                  </span>
                  <span>
                    From:{" "}
                    <span className="font-medium text-foreground">
                      {item.orgName}
                    </span>
                  </span>
                </div>
                {item.notes && (
                  <p className="text-sm mt-2 p-2 bg-muted/50 rounded italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() =>
                updateMutation.mutate({ id: item.id, status: "completed" })
              }
              disabled={updateMutation.isPending}
            >
              Accept & Admit
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
