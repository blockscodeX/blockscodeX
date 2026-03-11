"use client";
import React from 'react';
import { BRAND } from '../constants/brand';
import { useOrganization } from '../context/OrganizationContext';

interface UserDetails {
    name: string;
    rollId: string;
    examName: string;
    submittedAt: string;
}

interface ExamSuccessViewProps {
    userDetails: UserDetails;
    onDone: () => void;
}

export default function ExamSuccessView({ userDetails, onDone }: ExamSuccessViewProps) {
    const { organization: orgContext } = useOrganization();
    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;
    return (
        <div className="w-full h-full bg-white flex flex-col font-sans overflow-hidden relative animate-in fade-in duration-700">
            {/* Success Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full relative z-10">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20 animate-in zoom-in duration-500">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>

                <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight text-center">Exam Submitted Successfully!</h1>
                <p className="text-slate-500 font-medium mb-12 text-lg text-center max-w-lg">
                    You have completed all sections. Your submission has been securely recorded and locked.
                </p>

                {/* User Details Card */}
                <div className="w-full bg-slate-50/80 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 p-10 mb-12 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-6 mb-8 border-b border-slate-200/60 pb-8">
                        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-700 shadow-sm">
                            {userDetails.name ? userDetails.name.charAt(0) : "?"}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{userDetails.name}</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Student ID: {userDetails.rollId}</p>
                        </div>
                        {displayLogo ? (
                            <img src={displayLogo} alt="Logo" className="w-10 h-10 object-contain ml-auto" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm overflow-hidden ml-auto">
                                <span className="text-white font-black text-[10px]">{BRAND.logoText}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Exam Title</p>
                            <p className="text-slate-800 font-bold">{userDetails.examName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Submitted At</p>
                            <p className="text-slate-800 font-bold">{userDetails.submittedAt}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Verified & Saved</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 w-full max-w-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        You can now safely close this window.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>&copy; {new Date().getFullYear()} {displayName}</span>
                <span>Proctorship System v4.2.0</span>
            </div>
        </div>
    );
}
