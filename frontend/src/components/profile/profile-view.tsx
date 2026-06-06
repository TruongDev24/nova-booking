"use client";

import React, {useState, useEffect} from "react";
import {
    User,
    Phone,
    Mail,
    KeyRound,
    Loader2,
    ShieldCheck,
    Eye,
    EyeOff,
    Save,
    Activity
} from "lucide-react";
import {authService} from "@/services/auth.service";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {handleComingSoon} from "@/lib/coming-soon";
import {useLanguage} from "@/context/language-context";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";

interface UserData {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    role: string;
}

export function ProfileView() {
    const router = useRouter();
    const {t} = useLanguage();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Change Password State
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authService.getProfile();
                setUserData(data);
            } catch (error) {
                console.error("Profile fetch error:", error);
                toast.error(t("profile.fetchError"));
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchProfile();
    }, [t]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error(t("profile.passwordMinLength"));
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(t("profile.passwordMismatch"));
            return;
        }

        try {
            setIsSubmitting(true);
            await authService.changePassword({oldPassword, newPassword});
            toast.success(t("profile.passwordSuccess"));
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const message = err.response?.data?.message || t("profile.passwordError");
            toast.error(Array.isArray(message) ? message[0] : message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isDataLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600"/>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Visual Header Card */}
            <div
                className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
                <div
                    className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]"></div>
                <div
                    className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="relative">
                        <div
                            className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-cyan-400 to-indigo-500 p-1.5 shadow-2xl rotate-3">
                            <div
                                className="w-full h-full rounded-[1.4rem] bg-slate-900 flex items-center justify-center overflow-hidden -rotate-3">
                                <User className="w-16 h-16 md:w-20 md:h-20 text-cyan-400"/>
                            </div>
                        </div>
                        <div
                            className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-slate-900 flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-white"/>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                            {t("profile.officialAccount")}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{userData?.fullName}</h1>
                        <div
                            className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-300 font-medium">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4"/> {userData?.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4"/> {userData?.phone}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column: Personal Info */}
                <div className="lg:col-span-3 space-y-6">
                    <Card
                        className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl overflow-hidden bg-card/85 text-card-foreground border border-border/60 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                                    <User className="w-6 h-6"/>
                                </div>
                                {t("profile.personalInfo")}
                            </CardTitle>
                            <CardDescription className="ml-11">
                                {t("profile.personalInfoDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground/90 ml-1">{t("profile.fullName")}</label>
                                    <Input
                                        value={userData?.fullName || ""}
                                        readOnly
                                        className="h-12 bg-muted/30 border-border rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground/90 ml-1">{t("profile.role")}</label>
                                    <Input
                                        value={userData?.role === 'ADMIN' ? t("profile.roleAdmin") : t("profile.roleUser")}
                                        readOnly
                                        className="h-12 bg-muted/30 border-border rounded-xl capitalize"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground ml-1">{t("profile.email")}</label>
                                    <Input
                                        value={userData?.email || ""}
                                        disabled
                                        className="h-12 bg-muted/50 border-border text-muted-foreground cursor-not-allowed rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground ml-1">{t("profile.phone")}</label>
                                    <Input
                                        value={userData?.phone || ""}
                                        disabled
                                        className="h-12 bg-muted/50 border-border text-muted-foreground cursor-not-allowed rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                                <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5"/>
                                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                    <strong>{t("profile.note")}</strong> {t("profile.noteDesc")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bank Info Section */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl overflow-hidden bg-card/85 text-card-foreground border border-border/60 backdrop-blur-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Activity className="w-6 h-6" />
                                </div>
                                {t("profile.refundInfo")}
                            </CardTitle>
                            <CardDescription className="ml-11">{t("profile.refundInfoDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="p-6 rounded-[2rem] bg-slate-950 text-white relative overflow-hidden group border border-white/5">
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg">{t("profile.updateBank")}</h3>
                                        <p className="text-slate-400 text-sm">{t("profile.updateBankDesc")}</p>
                                    </div>
                                    <Button 
                                        onClick={() => router.push("/user/profile/bank")}
                                        className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                                    >
                                        {t("profile.updateNow")}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Change Password */}
                <div className="lg:col-span-2">
                    <Card
                        className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl overflow-hidden sticky top-8 bg-card text-card-foreground">
                        <CardHeader className="bg-slate-950 text-white pb-6 relative overflow-hidden border-b border-white/5">
                            <CardTitle className="text-xl font-bold flex items-center gap-2 relative z-10">
                                <KeyRound className="w-5 h-5 text-cyan-400"/> {t("profile.changePassword")}
                            </CardTitle>
                            <CardDescription className="text-slate-400 relative z-10">{t("profile.changePasswordDesc")}</CardDescription>
                            <div
                                className="absolute top-0 right-0 w-32 h-32 bg-cyan-500 rounded-full blur-[60px] opacity-20 -mr-16 -mt-16"></div>
                        </CardHeader>
                        <form onSubmit={handlePasswordChange}>
                            <CardContent className="pt-8 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-foreground/90">{t("profile.currentPassword")}</label>
                                    <div className="relative">
                                        <Input
                                            type={showOldPassword ? "text" : "password"}
                                            required
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            placeholder={t("profile.oldPasswordPlaceholder")}
                                            className="h-11 bg-muted/30 border-border text-foreground rounded-xl pr-10 focus-visible:ring-2 focus-visible:ring-primary/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            {showOldPassword ? <EyeOff className="h-4 w-4"/> :
                                                <Eye className="h-4 w-4"/>}
                                        </button>
                                    </div>
                                </div>

                                <Separator className="bg-border/60"/>

                                <div className="space-y-4 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-foreground/90">{t("profile.newPassword")}</label>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                required
                                                minLength={6}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder={t("profile.newPasswordPlaceholder")}
                                                className="h-11 bg-muted/30 border-border text-foreground rounded-xl pr-10 focus-visible:ring-2 focus-visible:ring-primary/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4"/> :
                                                    <Eye className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-foreground/90">{t("profile.confirmPassword")}</label>
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t("profile.confirmPasswordPlaceholder")}
                                            className="h-11 bg-muted/30 border-border text-foreground rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2 pb-8 px-6">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin"/>
                                            {t("profile.processing")}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4"/>
                                            {t("profile.updatePasswordBtn")}
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>

            <div 
                onClick={() => handleComingSoon()}
                className="flex items-center justify-center gap-2 text-muted-foreground text-xs py-4 cursor-help opacity-70 hover:opacity-100 transition-opacity"
            >
                <Activity className="w-3 h-3"/>
                <span>{t("profile.systemStatus")}</span>
            </div>
        </div>
    );
}
