"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND } from "../constants/brand";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthService } from "@/services/api/AuthService";
import { useOrganization } from "../context/OrganizationContext";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { organization: orgContext } = useOrganization();

    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;
    const showSuffix = !orgContext; // Hide suffix if custom branding

    React.useEffect(() => {
        if (searchParams.get('error') === 'suspended') {
            setError("Your account has been suspended. Please contact the administrator.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            // Use Server Action instead of client-side service
            const result = await loginAction(email, password);

            if (!result.success) {
                throw new Error(result.error);
            }

            const user = result.user;

            // Store token for client-side API calls that bypass the proxy (e.g. large file uploads)
            if (result.access_token) {
                localStorage.setItem('auth_token', result.access_token);
            }

            // Store user details for UI context
            localStorage.setItem('user', JSON.stringify(user));

            const rolePath = user.role.toLowerCase().replace('_', '-');

            if (user.mustChangePassword) {
                router.push(`/dashboard/${rolePath}/profile`);
            } else {
                router.push(`/dashboard/${rolePath}`);
            }
        } catch (err: any) {
            const errorMessage = err?.message || "";

            if (errorMessage === 'ACCOUNT_SUSPENDED') {
                setError("Your account has been suspended. Please contact the administrator.");
            } else if (errorMessage.startsWith('ORG_PAUSED:')) {
                const orgName = errorMessage.split(':')[1];
                setError(`This organization (${orgName}) is currently paused. Please contact support for assistance.`);
            } else if (errorMessage.startsWith('ORG_SUSPENDED:')) {
                const orgName = errorMessage.split(':')[1];
                setError(`This organization (${orgName}) has been suspended. Please contact support for assistance.`);
            } else if (errorMessage.startsWith('ORG_')) {
                // Generic org status error
                setError("Your organization access is currently restricted. Please contact support.");
            } else {
                setError(errorMessage || "Login failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Mesh Gradient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand)]/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-[440px] z-10 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-8 md:p-10 relative overflow-hidden">

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-10">
                        <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden mb-4 transition-transform hover:scale-105 duration-300 ${!displayLogo ? 'bg-[var(--brand)] shadow-lg shadow-[var(--brand)]/20' : ''}`}>
                            {displayLogo ? (
                                <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-white font-black text-xl tracking-wider">{BRAND.logoText}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {displayName}{showSuffix && <span className="text-[var(--brand)]">{BRAND.suffix}</span>}
                            </h1>
                        </div>
                        <p className="text-slate-500 font-bold text-sm mt-3 uppercase tracking-[0.15em] opacity-60">
                            Log into your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-500 font-bold rounded-xl px-4 py-3 text-xs mb-2 text-center">
                                {error}
                            </div>
                        )}
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Email Address
                            </label>
                            <div className="group relative transition-all">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand)] transition-colors">
                                    <Mail size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none transition-all focus:bg-white focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/50"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2 text-right">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="ml-1 text-[10px] font-black uppercase tracking-widest text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="group relative transition-all">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand)] transition-colors">
                                    <Lock size={18} strokeWidth={2.5} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none transition-all focus:bg-white focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-3 ml-1">
                            <label className="relative flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--brand)] shadow-sm"></div>
                                <span className="ml-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Keep me signed in</span>
                            </label>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[var(--brand)] text-white rounded-2xl py-4 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[var(--brand)]/20 hover:bg-[var(--brand-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-4"
                        >
                            {isLoading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    Enter Dashboard
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Link */}
                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <p className="text-slate-400 font-bold text-xs tracking-tight">
                            Don't have an account yet?
                            <Link href="/contact" className="text-[var(--brand)] ml-1 hover:underline decoration-2 underline-offset-4">
                                Contact Administrator
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    );
}
