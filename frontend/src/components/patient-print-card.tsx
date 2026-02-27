
import React from "react";
import Barcode from "react-barcode";
import { format } from "date-fns";
import { Heart, Activity, Phone, Droplets } from "lucide-react";

type Patient = {
    uniqueId: string;
    name: string;
    dob: string | Date; // Can be string (ISO) or Date object
    gender: string;
    contact: string | null;
    bloodGroup: string | null;
};

type Vitals = {
    weight?: string;
    bp?: string;
    temp?: string;
    hr?: string;
    spo2?: string;
};

type PrintCardProps = {
    patient: Patient;
    vitals?: Vitals;
    organizationName?: string;
};

// We use a class component because react-to-print works best with class components or forwarded refs
export class PatientPrintCard extends React.Component<PrintCardProps> {
    render() {
        const { patient, vitals, organizationName } = this.props;
        const dob = new Date(patient.dob);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        return (
            <div className="w-[100mm] h-[140mm] bg-white text-black p-6 border-2 border-slate-200 mx-auto font-sans relative overflow-hidden print:border-none print:w-full print:h-full print:m-0">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-10 -mt-10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-50/50 rounded-full -ml-8 -mb-8" />

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 relative z-10 border-b pb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center print:bg-blue-600 print-color-adjust-exact">
                        {/* SVG Heart icon because Lucide might not render perfectly in all print contexts, but standard SVG is safe */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">MediConnect</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{organizationName || "Clinical Admission"}</p>
                    </div>
                </div>

                {/* Patient Info */}
                <div className="space-y-4 mb-6 relative z-10">
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Patient Name</p>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">{patient.name}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">DOB / Age</p>
                            <p className="text-sm font-semibold">{format(dob, 'dd MMM yyyy')} ({age}y)</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Gender</p>
                            <p className="text-sm font-semibold">{patient.gender}</p>
                        </div>
                        {patient.bloodGroup && (
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Blood Group</p>
                                <div className="flex items-center gap-1.5">
                                    <Droplets className="w-3 h-3 text-red-500" />
                                    <p className="text-sm font-bold text-red-600">{patient.bloodGroup}</p>
                                </div>
                            </div>
                        )}
                        {patient.contact && (
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Contact</p>
                                <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <p className="text-sm font-semibold">{patient.contact}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Vitals Summary */}
                {vitals && Object.values(vitals).some(v => v) && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6 print:bg-slate-50 print-color-adjust-exact">
                        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" /> Admission Vitals
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            {vitals.bp && <div><span className="text-slate-400">BP:</span> <strong>{vitals.bp}</strong></div>}
                            {vitals.hr && <div><span className="text-slate-400">HR:</span> <strong>{vitals.hr}</strong></div>}
                            {vitals.temp && <div><span className="text-slate-400">Temp:</span> <strong>{vitals.temp}</strong></div>}
                            {vitals.weight && <div><span className="text-slate-400">Wt:</span> <strong>{vitals.weight}kg</strong></div>}
                            {vitals.spo2 && <div><span className="text-slate-400">SpO₂:</span> <strong>{vitals.spo2}%</strong></div>}
                        </div>
                    </div>
                )}

                {/* Barcode Footer */}
                <div className="mt-auto pt-6 text-center border-t border-dashed border-slate-200">
                    <div className="flex justify-center mb-1">
                        <Barcode
                            value={patient.uniqueId}
                            width={1.5}
                            height={40}
                            fontSize={14}
                            displayValue={true}
                            background="transparent"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        Please present this card at every visit.
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                        Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}
                    </p>
                </div>
            </div>
        );
    }
}
