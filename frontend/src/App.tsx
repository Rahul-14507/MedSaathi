
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/components/layout";
import DoctorDashboard from "@/pages/doctor-dashboard";
import DepartmentDashboard from "@/pages/department-dashboard";
import PatientDetails from "@/pages/patient-details";
import NurseDashboard from "@/pages/nurse-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import PlatformDashboard from "@/pages/platform-dashboard";

function Router() {
    return (
        <WouterRouter base="/portal">
            <Switch>
                <Route path="/auth" component={AuthPage} />

                <ProtectedRoute path="/" component={() => (
                    <Layout><RoleBasedRedirect /></Layout>
                )} />

                <ProtectedRoute path="/patients/:id" component={(params) => (
                    <Layout><PatientDetails id={params.id} /></Layout>
                )} />

                <ProtectedRoute path="/doctor" component={() => (
                    <Layout><DoctorDashboard /></Layout>
                )} />

                <ProtectedRoute path="/nurse" component={() => (
                    <Layout><NurseDashboard /></Layout>
                )} />

                <ProtectedRoute path="/department" component={() => (
                    <Layout><DepartmentDashboard /></Layout>
                )} />

                <ProtectedRoute path="/admin" component={() => (
                    <Layout><AdminDashboard /></Layout>
                )} />

                <ProtectedRoute path="/platform" component={() => (
                    <Layout><PlatformDashboard /></Layout>
                )} />

                <Route component={NotFound} />
            </Switch>
        </WouterRouter>
    );
}

function RoleBasedRedirect() {
    const { user } = useAuth();
    if (!user) return null;
    if (user.role === "doctor") return <DoctorDashboard />;
    if (user.role === "nurse") return <NurseDashboard />;
    if (user.role === "admin") {
        if ((user as any)?.organization?.type === 'hospital') return <AdminDashboard />;
        return <DepartmentDashboard />;
    }
    if (user.role === "super_admin") return <PlatformDashboard />;
    return <DepartmentDashboard />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Router />
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
