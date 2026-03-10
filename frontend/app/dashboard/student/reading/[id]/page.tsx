"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import UnitSidebar from "@/app/components/UnitSidebar";
import UnitRenderer from "@/app/components/UnitRenderer";

const sidebarUnits = [
    { id: "1", type: "Reading", title: "Introduction to Web development", done: true, active: true },
    { id: "2", type: "Coding", title: "JS: Object Methods", done: false, active: false },
    { id: "3", type: "Coding", title: "CSS Display: Float and Clear", done: false, active: false },
];

export default function ReadingUnitPage() {
    const [showSidebar, setShowSidebar] = React.useState(false);

    const sidebarUnitsMapped = sidebarUnits.map(u => ({ ...u, done: u.done, active: u.active }));

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                <UnitRenderer
                    question={{
                        id: '1',
                        type: 'Reading',
                        title: 'Introduction to Web development',
                        description: `
                            <p>Web development is the building and maintenance of websites; it's the work that happens behind the scenes to make a website look <strong>great</strong>, work fast and perform well with a seamless user experience.</p>
                            <p>Web developers, or ‘devs’, do this by using a variety of coding languages. The languages they use depends on the types of tasks they are performing and the platforms on which they are working.</p>
                            <h2 class="text-xl font-black text-slate-800 mt-12 mb-4">Core Concepts</h2>
                            <p>There are three primary languages used in web development and that are:</p>
                            <ul class="list-decimal list-inside space-y-2 font-medium">
                                <li>HTML ( Hypertext Markup Language )</li>
                                <li>CSS ( Cascading Style Sheet )</li>
                                <li>JS ( Javascript )</li>
                            </ul>
                            <h2 class="text-xl font-black text-slate-800 mt-12 mb-4">Code Demonstration</h2>
                            <p>Below is an example of a simple function in C++ that demonstrates logic execution. You can run this directly to see the output.</p>
                        `,
                        topic: "Basics",
                        difficulty: "Easy",
                        codingConfig: {
                            languageId: "cpp",
                            initialCode: `int addNumbers(int a, int b)\n{\n    // function definition\n    int result;\n    result = a + b;\n    return result;\n}\n\n// Main logic to test\n#include <iostream>\nint main() {\n    std::cout << "Sum = " << addNumbers(20, 20) << std::endl;\n    return 0;\n}`,
                            header: '',
                            footer: ''
                        }
                    }}
                    showSidebar={showSidebar}
                    onToggleSidebar={() => setShowSidebar(!showSidebar)}
                    sidebar={
                        <UnitSidebar
                            units={sidebarUnitsMapped}
                            moduleTitle="Frontend Development"
                            sectionTitle="Basics"
                            onToggle={() => setShowSidebar(false)}
                        />
                    }
                />
            </div>
        </div>
    );
}
