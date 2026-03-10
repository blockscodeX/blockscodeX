"use client";
import React, { useState } from 'react';
import { BRAND } from '../constants/brand';
import { useOrganization } from '../context/OrganizationContext';

interface ExamFeedbackViewProps {
    onSubmitFeedback: (rating: number, comment: string) => void;
}

export default function ExamFeedbackView({ onSubmitFeedback }: ExamFeedbackViewProps) {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState("");
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const { organization: orgContext } = useOrganization();

    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;

    const handleSubmit = () => {
        if (rating === 0) return;
        onSubmitFeedback(rating, comment);
    };

    const ratingDescriptions: { [key: number]: string } = {
        1: "Poor",
        2: "Fair",
        3: "Good",
        4: "Very Good",
        5: "Excellent"
    };

    return (
        <div className="w-full h-full bg-slate-50 flex flex-col font-sans overflow-hidden relative animate-in fade-in duration-500">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-64 bg-slate-100/50 -z-10 skew-y-2 origin-top-left transform" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
                {/* Logo Area */}
                <div className="mb-12 flex flex-col items-center">
                    {displayLogo ? (
                        <img src={displayLogo} alt="Logo" className="w-12 h-12 object-contain mb-4" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 overflow-hidden mb-4">
                            <span className="text-white font-black text-lg">{BRAND.logoText}</span>
                        </div>
                    )}
                    <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                </div>

                <div className="w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />

                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">How was your experience?</h1>
                    <p className="text-slate-500 font-medium mb-10 text-lg">Your feedback helps us make exams better for everyone.</p>

                    {/* Rating Section */}
                    <div className="mb-10">
                        <div className="flex justify-center gap-4 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    onClick={() => setRating(star)}
                                    className={`
                                        w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 transform
                                        ${(hoveredRating || rating) >= star
                                            ? 'bg-indigo-600 text-white scale-110 shadow-xl shadow-indigo-200 ring-4 ring-indigo-50'
                                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400'}
                                        active:scale-95
                                    `}
                                >
                                    {star <= (hoveredRating || rating) ? '★' : '☆'}
                                </button>
                            ))}
                        </div>
                        <div className="h-6">
                            {(hoveredRating || rating) > 0 && (
                                <span className="text-indigo-600 font-black uppercase tracking-widest text-xs animate-in slide-in-from-bottom-2 duration-300">
                                    {ratingDescriptions[hoveredRating || rating]}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Comment Section */}
                    <div className="mb-8">
                        <textarea
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0}
                        className={`
                            w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300
                            ${rating > 0
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                        `}
                    >
                        Submit Feedback
                    </button>

                    <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Powered by {displayName} &bull; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
