import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PatientPrintCard } from "@/components/patient-print-card";
import { useAuth } from "@/hooks/use-auth";

type PrintPatientButtonProps = {
    patient: any;
    vitals?: any;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    label?: string;
};

export function PrintPatientButton({
    patient,
    vitals,
    className,
    variant = "outline",
    size = "sm",
    label = "Print Card"
}: PrintPatientButtonProps) {
    const { user } = useAuth();
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Patient_Card_${patient?.uniqueId || patient?.id}`,
    });

    if (!patient) return null;

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={() => handlePrint()}
            >
                <Printer className="w-4 h-4 mr-2" />
                {label}
            </Button>

            {/* Hidden Print Component - Must be visible in DOM for react-to-print but hidden from screen */}
            <div style={{ position: "absolute", width: "0px", height: "0px", overflow: "hidden" }}>
                <div ref={componentRef}>
                    <PatientPrintCard
                        patient={patient}
                        vitals={vitals}
                        organizationName={(user as any)?.organization?.name || "MediConnect"}
                    />
                </div>
            </div>
        </>
    );
}
