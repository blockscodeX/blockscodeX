"use client";
import React from 'react';
import Navbar from '@/app/components/Navbar';
import NotebookPlayground from '@/app/components/Playground/NotebookPlayground';

export default function PythonNotebookPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans">
            <Navbar />
            <NotebookPlayground />
        </div>
    );
}
