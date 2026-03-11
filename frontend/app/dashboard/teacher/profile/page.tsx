"use client";
import React, { useState, useRef, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import { AuthService } from "@/services/api/AuthService";
import Loading from "@/app/loading";
import { useToast } from "@/app/components/Common/Toast";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
    const [userData, setUserData] = useState<any>(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [avatar, setAvatar] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password State
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    useEffect(() => {
        const user = AuthService.getUser();
        if (user) {
            setUserData(user);
            setName(user.name || "");
            if (user.profilePicture) setAvatar(user.profilePicture);
            if (user.mustChangePassword) {
                setActiveTab('security');
            }
        }
        setLoading(false);
    }, []);

    const handleUpdateProfile = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const updated = await AuthService.updateProfile({ name });
            setUserData(updated);
            if (updated.profilePicture) setAvatar(updated.profilePicture);
            toast("Your instructor profile has been updated.", "success", "Profile Updated");
        } catch (error: any) {
            toast(error.message || "Failed to update profile", "error", "Error");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            toast("All password fields are required", "error", "Error");
            return;
        }
        if (newPass !== confirmPass) {
            toast("Passwords do not match", "error", "Error");
            return;
        }
        if (newPass.length < 6) {
            toast("New password must be at least 6 characters", "error", "Error");
            return;
        }

        setSaving(true);
        try {
            await AuthService.changePassword({ currentPass, newPass });
            toast("Logging you out. Please sign in with your new password.", "success", "Password Changed");
            setTimeout(() => {
                AuthService.logout();
            }, 2000);
        } catch (error: any) {
            toast(
                error.message === 'INVALID_CURRENT_PASSWORD'
                    ? "Current password is incorrect"
                    : error.message || "Failed to change password",
                "error",
                "Error"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatar(URL.createObjectURL(file));
        setUploadingAvatar(true);
        try {
            const updated = await AuthService.uploadAvatar(file);
            setUserData(updated);
            setAvatar(updated.profilePicture);
            toast("Profile picture updated.", "success", "Avatar Saved");
        } catch (error: any) {
            setAvatar(userData?.profilePicture || null);
            toast(error.message || "Failed to upload avatar", "error", "Upload Failed");
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        setRemovingAvatar(true);
        try {
            const updated = await AuthService.removeProfilePicture();
            setUserData(updated);
            setAvatar(null);
            toast("Profile picture removed.", "success", "Updated");
        } catch (error: any) {
            toast(error.message || "Failed to remove profile picture", "error", "Error");
        } finally {
            setRemovingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/50">
                <Navbar userRole="teacher" />
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans">
            <Navbar userRole="teacher" />

            <main className="max-w-5xl mx-auto px-6 py-12">
                {/* Profile Header Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative group">
                        <div
                            onClick={handleAvatarClick}
                            className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-[var(--brand)]/20 cursor-pointer overflow-hidden transition-transform hover:scale-105 active:scale-95"
                        >
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                (userData?.name || name || "T").charAt(0)
                            )}
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            </div>
                        </div>
                        {avatar && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                                disabled={removingAvatar}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg text-xs font-bold z-10"
                                title="Remove profile picture"
                            >
                                {removingAvatar ? '…' : '✕'}
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">{userData?.name || "No Name Set"}</h1>
                        <p className="text-sm font-bold text-slate-400 mb-6">{userData?.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className="px-4 py-1.5 bg-[var(--brand-lighter)] text-[var(--brand)] text-[11px] font-black uppercase tracking-widest rounded-full border border-[var(--brand-light)]">
                                {userData?.role || "Instructor"}
                            </span>
                            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest rounded-full">
                                Teacher ID: {userData?.rollNumber || userData?.id?.substring(0, 8) || "N/A"}
                            </span>
                            {userData?.department && (
                                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest rounded-full">
                                    {userData?.department} Department
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Settings Navigation */}
                    <nav className="w-full lg:w-64 bg-white rounded-3xl border border-slate-100 p-3 shadow-sm flex lg:flex-col gap-1 shrink-0">
                        <TabButton
                            active={activeTab === 'general'}
                            onClick={() => !userData?.mustChangePassword && setActiveTab('general')}
                            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                            label="General"
                            disabled={userData?.mustChangePassword}
                        />
                        <TabButton
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                            label="Security"
                        />
                    </nav>

                    {/* Settings Content Area */}
                    <div className="flex-1 w-full bg-white rounded-3xl border border-slate-100 p-10 shadow-sm min-h-[500px] animate-in slide-in-from-right-4 duration-500">
                        {activeTab === 'general' ? (
                            <div className="space-y-8 max-w-2xl">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2">Instructor Profile</h2>
                                    <p className="text-sm font-medium text-slate-400">Manage your teaching credentials and personal details.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] focus:border-[var(--brand)] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Work Email</label>
                                        <input
                                            type="email"
                                            value={userData?.email || ""}
                                            disabled
                                            className="w-full h-12 bg-slate-100 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={saving || !name.trim()}
                                    className="px-8 py-3 bg-[var(--brand)] text-white rounded-xl text-sm font-black shadow-lg shadow-[var(--brand)]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 max-w-2xl">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 mb-2">Security & Privacy</h2>
                                    <p className="text-sm font-medium text-slate-400">Manage your instructor account security.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Current Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={currentPass}
                                            onChange={(e) => setCurrentPass(e.target.value)}
                                            className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] focus:border-[var(--brand)] transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">New Password</label>
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] focus:border-[var(--brand)] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Confirm New Password</label>
                                            <input
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPass}
                                                onChange={(e) => setConfirmPass(e.target.value)}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] focus:border-[var(--brand)] transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleChangePassword}
                                    disabled={saving}
                                    className="px-8 py-3 bg-slate-800 text-white rounded-xl text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function TabButton({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: any; label: string; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[13px] font-black transition-all ${active
                ? 'bg-[var(--brand)] text-white shadow-xl shadow-[var(--brand)]/20'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        >
            {icon}
            {label}
        </button>
    );
}
