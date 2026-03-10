"use client"

import { siteConfig } from "../config/site"

import { motion, useInView } from "motion/react"
import { useRef } from "react"
import {
    Rocket,
    BookOpen,
    Briefcase,
    Target,
    TrendingUp,
    ArrowRight,
    Building2,
    Brain,
    Award,
    ChevronRight,
    Mail,
    Shield,
    Sparkles,
    Eye,
    Wrench,
    MapPin,
    Heart,
    Globe,
    Users,
    GraduationCap,
    Code,
    CheckCircle,
    Zap,
    Handshake,
    Mountain,
    CheckCircle2,
    Code2,
    ArrowLeft,
    Home,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white lg:snap-y lg:snap-mandatory lg:overflow-y-auto lg:h-screen">
            <HeroSection />
            <TheFounders />
            <HowItStarted />
            <WhatWeDeliver />
            <HowWeBuildTalent />
            <Offerings />
            <WhyThisMatters />
            <OurBacking />
        </div>
    )
}

function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 lg:snap-start lg:snap-always">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute inset-0 w-full h-full opacity-40">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "#3B82F6", stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: "#0EA5E9", stopOpacity: 0.1 }} />
                        </linearGradient>
                    </defs>
                    <motion.circle
                        cx="10%"
                        cy="20%"
                        r="80"
                        fill="url(#grad1)"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                    />
                    <motion.circle
                        cx="90%"
                        cy="80%"
                        r="100"
                        fill="url(#grad1)"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 3, delay: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                    />
                    <motion.path
                        d="M 0 400 Q 400 200 800 400 T 1600 400"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        fill="none"
                        opacity="0.2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                </svg>
                <svg className="absolute inset-0 w-full h-full opacity-5">
                    <defs>
                        <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                </svg>
            </div>

            <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto py-20">
                {/* Back Button */}
                <motion.div
                    className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Link href="/">
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                            whileHover={{ scale: 1.05, x: -5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Back to Home</span>
                        </motion.div>
                    </Link>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
                    <Link href="/">
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6 hover:bg-blue-100 transition-colors cursor-pointer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700 text-sm font-medium">{siteConfig.name}</span>
                        </motion.div>
                    </Link>

                    <motion.h1
                        className="text-gray-900 mb-6 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-balance"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        Turning Nepal into a Global{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                            Tech Talent Powerhouse
                        </span>
                    </motion.h1>

                    <motion.p
                        className="text-gray-600 max-w-3xl mx-auto text-base sm:text-lg lg:text-xl mb-8 leading-relaxed text-pretty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        Our mission is to revolutionize coding education in Nepal, making it practical and globally competitive. Through BlockCode, we will teach coding in every school, college, and university, provide computer-based exams, monitor students’ activities, and deliver quick, skill based results, ensuring students’ abilities are reflected in real-world scenarios.
                    </motion.p>

                    <motion.div
                        className="flex flex-wrap justify-center gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Link
                            href="#journey"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            Our Story
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="#offerings"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-all"
                        >
                            Explore Platform
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-all"
                        >
                            <Home className="w-4 h-4" />
                            Homepage
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-6 sm:bottom-10 left-1/2 transform -translate-x-1/2 hidden md:block"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
                <div className="w-6 h-10 border-2 border-blue-400 rounded-full p-1">
                    <motion.div
                        className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto"
                        animate={{ y: [0, 20, 0] }}
                        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                    />
                </div>
            </motion.div>
        </section>
    )
}

function TheFounders() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const leaders = [
        {
            name: "---",
            image: "/professional-nepali-male-ceo-portrait.jpg",
            description:
                "--- experienced modern, hands-on education while studying in India and returned to Nepal determined to bring the same transformative learning approach to his homeland.",
            highlights: [
                "Passionate about practical education that creates real jobs",
                "Driving the shift from theory to hands-on learning",
                "Building Nepal's tech talent pipeline",
            ],
        },
        {
            name: "---",
            image: "/professional-nepali-male-founder-portrait-tech.jpg",
            description:
                `--- founded ${siteConfig.company} with a clear mission: to give Nepalese students the practical skills and opportunities they need to compete globally.`,
            highlights: [
                "Pioneering practical tech education in Nepal",
                "Creating pathways from learning to employment",
                "Championing talent from every corner of Nepal",
            ],
        },
    ]

    return (
        <section
            id="journey"
            ref={ref}
            className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 overflow-hidden lg:snap-start lg:snap-always"
        >
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Meet the{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Founders</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Two visionaries who met in India and returned to Nepal with a mission to transform tech education.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {leaders.map((leader, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
                            animate={isInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                            className="group"
                        >
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-xl h-full">
                                <div className="flex flex-col items-center text-center">
                                    <motion.div
                                        className="relative mb-6"
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full blur-lg opacity-30" />
                                        <Image
                                            src={leader.image || "/placeholder.svg"}
                                            alt={leader.name}
                                            width={160}
                                            height={160}
                                            className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-white shadow-lg"
                                        />
                                    </motion.div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{leader.name}</h3>
                                    <p className="text-gray-600 mb-6 leading-relaxed">{leader.description}</p>
                                    <ul className="space-y-3 w-full">
                                        {leader.highlights.map((highlight, i) => (
                                            <motion.li
                                                key={i}
                                                className="flex items-start gap-3 text-left"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={isInView ? { opacity: 1, x: 0 } : {}}
                                                transition={{ delay: 0.5 + i * 0.1 }}
                                            >
                                                <div className="mt-1 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <ChevronRight className="w-3 h-3 text-blue-600" />
                                                </div>
                                                <span className="text-gray-600 text-sm">{highlight}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function HowItStarted() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const journey = [
        {
            year: "2018",
            title: "A Spark of Inspiration",
            location: "India",
            description:
                "Two ambitious students, --- and ---, crossed paths while studying in India. There, they experienced something that would change their lives forever — hands-on, practical education that didn't just teach concepts, but transformed how people think, build, and create.",
            emotion: "The excitement of discovery",
            icon: Sparkles,
            color: "from-amber-500 to-orange-500",
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200",
        },
        {
            year: "2019",
            title: "Seeing the Hard Truth",
            location: "Nepal",
            description:
                "Returning home to Nepal, reality hit hard. They saw brilliant, motivated young minds — students full of potential and dreams — trapped in a system of rote memorization and theory-only teaching. The gap between what students learned and what employers needed felt like an ocean.",
            emotion: "The frustration that ignites change",
            icon: Eye,
            color: "from-red-500 to-rose-500",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
        },
        {
            year: "2020",
            title: "Building the Bridge",
            location: "Kathmandu",
            description:
                `That frustration became fuel. --- and --- founded ${siteConfig.company} with a radical idea: what if education could be different? They built a platform focused on real projects, practical skills, and secure assessments — shifting the entire paradigm from memorizing answers to solving problems.`,
            emotion: "The courage to start something new",
            icon: Wrench,
            color: "from-blue-600 to-sky-500",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
        },
        {
            year: "The Future",
            title: "A Vision for Tomorrow",
            location: "Across Nepal",
            description:
                "Our mission is clear: to transform how Nepal educates its future — one learner, one project, one career at a time. From remote villages to bustling cities, we're building a movement to prove that world-class talent can emerge from anywhere when given the right opportunity.",
            emotion: "The ambition to transform a nation",
            icon: Rocket,
            color: "from-emerald-500 to-green-500",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
        },
    ]

    return (
        <section
            ref={ref}
            className="min-h-screen flex items-center py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden lg:snap-start lg:snap-always"
        >
            <div className="max-w-5xl mx-auto w-full">
                <motion.div
                    className="text-center mb-10 sm:mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.1 }}
                    >
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 text-sm font-medium">Our Story</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        How It All{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Started</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
                        Every great journey begins with a single step. Ours started with a question:{" "}
                        <span className="font-medium text-gray-900">"Why can't education be better?"</span>
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Vertical Timeline Line - Mobile */}
                    <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-200 via-blue-200 to-emerald-200 rounded-full" />

                    {/* Animated Progress - Mobile */}
                    <motion.div
                        className="md:hidden absolute left-6 top-0 w-0.5 bg-gradient-to-b from-amber-500 via-blue-500 to-emerald-500 rounded-full origin-top"
                        initial={{ height: "0%" }}
                        animate={isInView ? { height: "100%" } : {}}
                        transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
                    />

                    {/* Horizontal Timeline Line - Desktop */}
                    <div className="hidden md:block absolute top-[60px] left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-blue-200 to-emerald-200 rounded-full" />

                    {/* Animated Progress - Desktop */}
                    <motion.div
                        className="hidden md:block absolute top-[60px] left-0 h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 rounded-full"
                        initial={{ width: "0%" }}
                        animate={isInView ? { width: "100%" } : {}}
                        transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
                    />

                    {/* Mobile Layout - Vertical Timeline */}
                    <div className="md:hidden space-y-6">
                        {journey.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={isInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.2 + index * 0.15, duration: 0.5 }}
                                className="relative flex gap-4 pl-2"
                            >
                                {/* Timeline Node */}
                                <div className="flex-shrink-0 z-10">
                                    <motion.div
                                        className="relative"
                                        initial={{ scale: 0 }}
                                        animate={isInView ? { scale: 1 } : {}}
                                        transition={{ delay: 0.4 + index * 0.15, type: "spring", stiffness: 200 }}
                                    >
                                        <div
                                            className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}
                                        >
                                            <item.icon className="w-5 h-5 text-white" />
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Card Content */}
                                <div className="flex-1 pb-2">
                                    {/* Year Badge */}
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 bg-gradient-to-r ${item.color} text-white text-xs font-bold rounded-full shadow-sm mb-2`}
                                    >
                                        {item.year}
                                    </span>

                                    <div className={`${item.bgColor} ${item.borderColor} border p-4 rounded-xl shadow-sm`}>
                                        {/* Location */}
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-500 font-medium">{item.location}</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">{item.title}</h3>

                                        {/* Description */}
                                        <p className="text-gray-600 text-sm leading-relaxed mb-3">{item.description}</p>

                                        {/* Emotion */}
                                        <div className="pt-2 border-t border-gray-200/50">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 italic">
                                                <Heart className="w-3 h-3 text-rose-400" />
                                                {item.emotion}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Desktop Layout - Horizontal Grid */}
                    <div className="hidden md:grid md:grid-cols-4 gap-6">
                        {journey.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.2 + index * 0.15, duration: 0.5 }}
                                className="flex flex-col"
                            >
                                {/* Timeline Node */}
                                <div className="flex flex-col items-center mb-4">
                                    <motion.div
                                        className="relative z-10"
                                        initial={{ scale: 0 }}
                                        animate={isInView ? { scale: 1 } : {}}
                                        transition={{ delay: 0.4 + index * 0.15, type: "spring", stiffness: 200 }}
                                    >
                                        <div
                                            className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-lg border-4 border-white`}
                                        >
                                            <item.icon className="w-6 h-6 text-white" />
                                        </div>
                                        {/* Pulse */}
                                        <motion.div
                                            className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-full opacity-30`}
                                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                                        />
                                    </motion.div>

                                    {/* Year Badge */}
                                    <div className="mt-3">
                                        <span
                                            className={`inline-flex px-3 py-1 bg-gradient-to-r ${item.color} text-white text-sm font-bold rounded-full shadow-md`}
                                        >
                                            {item.year}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Content - Fixed Height */}
                                <motion.div
                                    className={`flex-1 ${item.bgColor} ${item.borderColor} border p-5 rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col`}
                                    whileHover={{ y: -3 }}
                                >
                                    {/* Location */}
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-xs text-gray-500 font-medium">{item.location}</span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{item.title}</h3>

                                    {/* Description */}
                                    <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-1">{item.description}</p>

                                    {/* Emotion */}
                                    <div className="pt-3 border-t border-gray-200/50 mt-auto">
                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 italic">
                                            <Heart className="w-3 h-3 text-rose-400" />
                                            {item.emotion}
                                        </span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function WhatWeDeliver() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const features = [
        {
            icon: Shield,
            title: "Secure Exams & Assessments",
            description: "Fair, cheat-proof testing with automatic grading to keep things honest.",
            color: "from-blue-500 to-blue-600",
        },
        {
            icon: BookOpen,
            title: "Easy Course Builder",
            description: "Create engaging courses, hands-on labs, and projects — no tech headaches.",
            color: "from-sky-500 to-sky-600",
        },
        {
            icon: Users,
            title: "Teacher & Institution Tools",
            description: "Manage classes, track progress, attendance, and insights — everything you need.",
            color: "from-indigo-500 to-indigo-600",
        },
        {
            icon: Code,
            title: "Project-Based Learning",
            description: "Learn by doing real industry projects, not just memorizing theory.",
            color: "from-blue-500 to-sky-500",
        },
        {
            icon: Briefcase,
            title: "Job Connections",
            description: "We partner with top employers to match your skills with real jobs and clear career paths.",
            color: "from-sky-500 to-indigo-500",
        },
        {
            icon: Globe,
            title: "Built to Scale",
            description: "Cloud-based, supports local languages, secure — ready for campuses across Nepal.",
            color: "from-blue-600 to-blue-500",
        },
    ]

    return (
        <section
            ref={ref}
            className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 lg:snap-start lg:snap-always"
        >
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        What We{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Deliver</span>
                    </h2>
                    <p className="text-gray-600 max-w-3xl mx-auto text-lg">
                        A modern education ecosystem tailored for Nepal's schools, teachers, and learners.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -8 }}
                            className="group"
                        >
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-xl h-full">
                                <motion.div
                                    className={`mb-5 w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-md`}
                                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                >
                                    <feature.icon className="w-7 h-7 text-white" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function HowWeBuildTalent() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const steps = [
        {
            icon: Target,
            title: "Discover",
            description: "We find passionate learners everywhere — from big cities to remote areas often overlooked.",
            color: "from-blue-500 to-blue-600",
        },
        {
            icon: Brain,
            title: "Train",
            description: "Master fundamentals, sharpen problem-solving, and tackle projects that mirror real tech work.",
            color: "from-sky-500 to-sky-600",
        },
        {
            icon: CheckCircle,
            title: "Certify & Launch",
            description: "Prove your skills with our certifications and get connected to employers who need you now.",
            color: "from-indigo-500 to-indigo-600",
        },
    ]

    return (
        <section
            ref={ref}
            className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 bg-white lg:snap-start lg:snap-always"
        >
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        How We Build{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                            Talent That Wins
                        </span>
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 40 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.15 }}
                            className="relative"
                        >
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all hover:shadow-lg h-full text-center">
                                <div className="flex justify-center mb-6">
                                    <motion.div
                                        className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                    >
                                        <step.icon className="w-10 h-10 text-white" />
                                    </motion.div>
                                </div>
                                <div className="text-sm font-bold text-blue-600 mb-2">Step {index + 1}</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                            </div>

                            {/* Connector arrow */}
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                                    <ArrowRight className="w-6 h-6 text-blue-300" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function Offerings() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const offerings = [
        {
            title: "For Universities & Institutions",
            subtitle: "Upgrade Your Campus",
            description:
                `Partner with ${siteConfig.company} to bring project-based learning that works. Get seamless curriculum tools, automated assessments, student dashboards, and full support to focus on outcomes, not exams.`,
            features: [
                { title: "Curriculum Integration", desc: "Infuse real-world projects into your existing coursework." },
                { title: "Learning Platform", desc: "Track and monitor every student's skill development in real-time." },
                { title: "Assessment Platform", desc: "Automate exams and skill evaluations with our scalable tools." },
                { title: "Career Readiness", desc: "Equip students with practical skills aligned to industry needs." },
            ],
            cta: "Transform your institution with education that creates real job outcomes.",
            icon: Building2,
            color: "from-blue-600 to-blue-500",
        },
        {
            title: "For Educators & Trainers",
            subtitle: "Run Better Courses",
            description:
                "Big or small — deliver training that truly prepares students for success. Run secure exams, track progress effortlessly, and create courses that make a real difference.",
            features: [
                { title: "Easy Course Creation", desc: "Build engaging content with our intuitive course builder." },
                { title: "Secure Assessments", desc: "Cheat-proof exams with automatic grading and analytics." },
                { title: "Progress Tracking", desc: "Monitor student performance with detailed insights." },
            ],
            cta: "Empower your teaching with tools designed for real results.",
            icon: GraduationCap,
            color: "from-sky-600 to-sky-500",
        },
        {
            title: "For Students & Future Builders",
            subtitle: "Learn by Building Real Things",
            description:
                "Master software and AI by working on real projects. Get practical skills, fair assessments, and step into jobs ready to make an impact from day one.",
            features: [
                { title: "Hands-On Projects", desc: "Build and deploy live applications under expert guidance." },
                { title: "Industry-Aligned Skills", desc: "Learn what employers actually need right now." },
                { title: "Job Connections", desc: "Get matched with opportunities that fit your skills." },
            ],
            cta: "Start your journey to becoming a world-class tech professional.",
            icon: Rocket,
            color: "from-indigo-600 to-indigo-500",
        },
    ]

    return (
        <section
            id="offerings"
            ref={ref}
            className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 lg:snap-start lg:snap-always"
        >
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Explore Our{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Platform</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Solutions designed for every stakeholder in Nepal's education ecosystem.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {offerings.map((offering, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.15 }}
                            className="group"
                        >
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all shadow-sm hover:shadow-xl h-full flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <div
                                        className={`w-14 h-14 bg-gradient-to-br ${offering.color} rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}
                                    >
                                        <offering.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{offering.title}</h3>
                                        <p className="text-blue-600 text-sm font-medium">{offering.subtitle}</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-6 leading-relaxed text-sm">{offering.description}</p>
                                <div className="space-y-3 mb-6 flex-grow">
                                    {offering.features.map((feature, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex items-start gap-3"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={isInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ delay: 0.4 + i * 0.1 }}
                                        >
                                            <div className="mt-0.5 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 text-sm">{feature.title}</span>
                                                <span className="text-gray-600 text-sm"> — {feature.desc}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-100 mt-auto">
                                    <p className="text-blue-600 font-medium text-sm">{offering.cta}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function WhyThisMatters() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    const points = [
        {
            icon: TrendingUp,
            title: "Huge Opportunity",
            description:
                "Nepal's education sector is ready for a digital revolution, with exploding demand for practical tech skills.",
        },
        {
            icon: Award,
            title: "Proven Impact",
            description: "Our mix of smart teaching, secure tools, and job alignment delivers real results.",
        },
        {
            icon: Briefcase,
            title: "Smart Business",
            description: "Clear revenue through institution licenses, trainer subscriptions, and employer partnerships.",
        },
        {
            icon: Handshake,
            title: "Real Social Good",
            description: "We're creating pathways for students from all backgrounds to rise and thrive.",
        },
    ]

    return (
        <section
            ref={ref}
            className="min-h-screen flex items-center py-20 px-4 sm:px-6 lg:px-8 bg-white lg:snap-start lg:snap-always"
        >
            <div className="max-w-6xl mx-auto w-full">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Why This{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Matters</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">For investors and partners who want to make a difference.</p>
                </motion.div>

                <div className="grid sm:grid-cols-2 gap-6">
                    {points.map((point, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all h-full flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                                    <point.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{point.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{point.description}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function OurBacking() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    return (
        <section
            ref={ref}
            className="min-h-screen flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-700 lg:snap-start lg:snap-always"
        >
            <div className="max-w-4xl mx-auto w-full text-center flex-1 flex flex-col justify-center">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Our <span className="bg-gradient-to-r from-white to-sky-100 bg-clip-text text-transparent">Backing</span>
                    </h2>
                    <p className="text-blue-100 max-w-2xl mx-auto mb-8">
                        We're open to investors and
                        collaborators ready to build lasting impact.
                    </p>

                    <motion.div
                        className="bg-white p-8 sm:p-10 rounded-2xl text-gray-900 shadow-lg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.3 }}
                    >
                        <Zap className="w-12 h-12 mx-auto mb-6 text-yellow-400" />
                        <h3 className="text-2xl sm:text-3xl font-bold mb-4">Join the Movement</h3>
                        <p className="text-gray-700 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
                            If you're an investor, university leader, teacher, or employer excited about Nepal's tech future —{" "}
                            <strong className="text-gray-900">let's build it together.</strong>
                        </p>
                        <p className="text-gray-900 font-medium text-lg">
                            {siteConfig.name} is here to turn motivated learners into world-class professionals.
                        </p>
                        <Link
                            href="/contact"
                            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all"
                        >
                            <Mail className="w-5 h-5" />
                            Get in Touch
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            <motion.div
                className="max-w-4xl mx-auto w-full mt-12 pt-8 border-t border-white/20"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 }}
            >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    {/* Brand */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                            <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center p-1">
                                <img src={siteConfig.logo} alt={siteConfig.name} className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <div className="text-left">
                            <h4 className="text-white text-sm sm:text-base font-semibold">{siteConfig.name}</h4>
                            <p className="text-blue-200 text-[10px] sm:text-xs">Powering Nepal's Tech Talent for the World</p>
                        </div>
                    </div>

                    {/* Copyright */}
                    <p className="text-blue-200 text-xs">© {new Date().getFullYear()} {siteConfig.company}</p>
                </div>
            </motion.div>
        </section>
    )
}
