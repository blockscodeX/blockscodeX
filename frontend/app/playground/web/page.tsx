"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import WebEditor from "@/app/components/WebEditor/WebEditor";

export default function WebPlaygroundPage() {
    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            <Navbar />
            <div className="flex-1 overflow-hidden relative">
                <WebEditor
                    showFiles={{
                        html: true,
                        css: true,
                        js: true
                    }}
                />
            </div>
        </div>
    );
}
