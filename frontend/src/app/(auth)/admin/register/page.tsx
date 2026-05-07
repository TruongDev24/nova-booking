"use client";

import React from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {toast, Toaster} from "react-hot-toast";
import {useRouter} from "next/navigation";
import Cookies from "js-cookie";
import {
    User,
    Mail,
    Phone,
    Lock,
    Activity,
    Key,
} from "lucide-react";

// --- Types ---
interface RegisterResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: "USER" | "ADMIN";
    };
}

// --- Validation Schema with Zod ---
const adminRegisterSchema = z
    .object({
        fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
        email: z.string().email("Invalid email address"),
        phone: z.string().regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "Invalid phone number"),
        password: z.string().min(8, "Min 8 chars").regex(/[A-Z]/).regex(/[0-9]/),
        confirmPassword: z.string(),
        secretKey: z.string().min(1, "Admin Secret Key is required"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type AdminRegisterFormValues = z.infer<typeof adminRegisterSchema>;

export default function AdminRegisterPage() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
    } = useForm<AdminRegisterFormValues>({
        resolver: zodResolver(adminRegisterSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            secretKey: "",
        },
    });

    const onSubmit = async (data: AdminRegisterFormValues) => {
        try {
            const response = await axios.post<RegisterResponse>(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/admin/register`,
                data
            );

            const token = response.data?.access_token;
            if (token) {
                Cookies.set("access_token", token, {path: "/"});
                sessionStorage.setItem("access_token", token);
                sessionStorage.setItem("user", JSON.stringify(response.data.user));
            }

            toast.success("Admin account created successfully!");
            setTimeout(() => router.push("/admin"), 1500);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Registration failed");
            } else {
                toast.error("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Toaster position="top-right"/>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 px-6 py-8 text-center">
                    <div className="flex justify-center items-center gap-2 mb-2">
                        <Activity className="w-8 h-8 text-indigo-400"/>
                        <h1 className="text-2xl font-bold text-white">NOVA-admin</h1>
                    </div>
                    <p className="text-slate-400 text-sm">Create a new administrator account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Secret Key</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input
                                type="password"
                                {...register("secretKey")}
                                className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                placeholder="Enter Admin Secret"
                            />
                        </div>
                        {errors.secretKey && <p className="text-xs text-red-500">{errors.secretKey.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input {...register("fullName")} className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                   placeholder="Admin Name"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input type="email" {...register("email")}
                                   className="w-full pl-10 pr-3 py-2 border rounded-lg" placeholder="admin@nova.com"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input {...register("phone")} className="w-full pl-10 pr-3 py-2 border rounded-lg"
                                   placeholder="09xxxxxxx"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input type="password" {...register("password")}
                                   className="w-full pl-10 pr-3 py-2 border rounded-lg" placeholder="••••••••"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400"/>
                            <input type="password" {...register("confirmPassword")}
                                   className="w-full pl-10 pr-3 py-2 border rounded-lg" placeholder="••••••••"/>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Creating..." : "Register Admin"}
                    </button>
                </form>
            </div>
        </div>
    );
}
