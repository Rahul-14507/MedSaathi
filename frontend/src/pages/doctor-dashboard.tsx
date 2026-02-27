
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/utils";
import { Link } from "wouter";
import {
    Search, Loader2, User, Calendar, Droplets,
    Phone, ArrowRight, Stethoscope, FileSearch
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

export default function DoctorDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [query, setQuery] = useState("");

    const { data: searchResults, isFetching, refetch } = useQuery<Patient[]>({
        queryKey: ["/api/patients/search", query],
        queryFn: async () => {
            if (!query.trim()) return [];
            const res = await apiRequest("GET", `/api/patients/search?query=${encodeURIComponent(query.trim())}`);
            return res.json();
        },
        enabled: false,
    });

    const { data: allPatients = [] } = useQuery<Patient[]>({
        queryKey: ["/api/patients"],
    });

    const handleSearch = () => {
        if (!query.trim()) {
            toast({ title: "Enter a search term", description: "Search by patient name or ID", variant: "destructive" });
            return;
        }
        refetch();
    };

    const recentPatients = allPatients.slice(0, 5);

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Search patients, review history, and place clinical orders</p>
            </div>

            <ActiveEmergencies />

            {/* Search Bar */}
            <Card className="border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Search by Patient ID (e.g. PAT-10001) or Name..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-11 h-12 text-base"
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={isFetching} className="h-12 px-6 gradient-primary border-0 text-white">
                            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Search</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Search Results */}
            {
                searchResults && searchResults.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Search Results ({searchResults.length})
                        </h2>
                        <div className="grid gap-3">
                            {searchResults.map((patient) => (
                                <PatientCard key={patient.id} patient={patient} />
                            ))}
                        </div>
                    </div>
                )
            }

            {
                searchResults && searchResults.length === 0 && query && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                        <FileSearch className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-muted-foreground font-medium">No patients found for "{query}"</p>
                        <p className="text-sm text-muted-foreground mt-1">Try searching by unique ID or full name</p>
                    </div>
                )
            }

            {/* Recent Patients */}
            {
                !searchResults && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent Patients
                        </h2>
                        {recentPatients.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                                <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p>No patients registered yet</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {recentPatients.map((patient) => (
                                    <PatientCard key={patient.id} patient={patient} />
                                ))}
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}

function PatientCard({ patient }: { patient: Patient }) {
    const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    return (
        <Link href={`/patients/${patient.id}`}>
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 group">
                <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {patient.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">{patient.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                    {patient.uniqueId}
                                </span>
                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{patient.gender}{age !== null && `, ${age}y`}</span>
                                {patient.bloodGroup && (
                                    <span className="flex items-center gap-1 text-red-500 font-semibold">
                                        <Droplets className="w-3 h-3" />{patient.bloodGroup}
                                    </span>
                                )}
                                {patient.contact && (
                                    <span className="hidden sm:flex items-center gap-1"><Phone className="w-3 h-3" />{patient.contact}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
            </Card>
        </Link>
    );
}

function ActiveEmergencies() {
    const { data: emergencies } = useQuery<{ visit: any, patient: Patient, attendedBy: any }[]>({
        queryKey: ["/api/visits/active-emergencies"],
        refetchInterval: 5000,
    });

    if (!emergencies || emergencies.length === 0) return null;

    return (
        <div className="space-y-3 animate-pulse-subtle">
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Active Emergencies ({emergencies.length})
            </h2>
            <div className="grid gap-3">
                {emergencies.map(({ visit, patient }) => (
                    <Link key={visit.id} href={`/patients/${patient.id}`}>
                        <Card className="cursor-pointer hover:shadow-lg transition-all border-red-200 bg-red-50/50 hover:border-red-300 group">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg shadow-sm border border-red-200">
                                        !
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-red-900 text-base">{patient.name}</h3>
                                            <Badge variant="destructive" className="animate-pulse">Emergency</Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-red-700/80">
                                            <span className="font-mono bg-white/50 px-2 py-0.5 rounded-full font-semibold border border-red-100">
                                                {patient.uniqueId}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                Last Visit: {new Date(visit.date).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {visit.symptoms && (
                                            <p className="text-xs text-red-600 mt-2 font-medium">
                                                "{visit.symptoms}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
