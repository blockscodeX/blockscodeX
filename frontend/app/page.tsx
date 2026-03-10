"use client"

import { siteConfig } from "./config/site"

import { motion, useInView } from "motion/react"
import { useRef, useState } from "react"
import {
  Shield,
  GraduationCap,
  Brain,
  Zap,
  Lock,
  Code,
  BookOpen,
  BarChart3,
  Award,
  ArrowRight,
  CheckCircle,
  Mail,
  LogIn,
  Download,
  Smartphone,
  Apple,
  Chrome,
  Info,
  Monitor,
} from "lucide-react"

export default function App() {
  return (
    <div className="min-h-screen bg-white overflow-y-auto md:overflow-y-scroll snap-y snap-proximity md:snap-mandatory h-screen overscroll-none">
      <SlideOne />
      <SlideTwo />
      <SlideDownload />
      <SlideThree />
    </div>
  )
}

function SlideOne() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white snap-start snap-always">
      {/* Animated SVG Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Geometric Shapes */}
        <svg className="absolute inset-0 w-full h-full opacity-40">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                style={{
                  stopColor: "#3B82F6",
                  stopOpacity: 0.3,
                }}
              />
              <stop
                offset="100%"
                style={{
                  stopColor: "#60A5FA",
                  stopOpacity: 0.1,
                }}
              />
            </linearGradient>
          </defs>

          {/* Animated Circles - reduced size on mobile */}
          <motion.circle
            cx="10%"
            cy="20%"
            r="50"
            fill="url(#grad1)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            className="sm:r-[80px] lg:r-[150px]"
          />
          <motion.circle
            cx="90%"
            cy="80%"
            r="60"
            fill="url(#grad1)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 3,
              delay: 0.5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            className="sm:r-[100px] lg:r-[200px]"
          />

          {/* Curved Lines */}
          <motion.path
            d="M 0 400 Q 400 200 800 400 T 1600 400"
            stroke="#3B82F6"
            strokeWidth="2"
            fill="none"
            opacity="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
          <motion.path
            d="M 0 600 Q 400 800 800 600 T 1600 600"
            stroke="#60A5FA"
            strokeWidth="2"
            fill="none"
            opacity="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 4,
              delay: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        </svg>

        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute hidden sm:block"
            style={{
              left: `${10 + i * 18}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 6 + i,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.3,
            }}
          >
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
              <path
                d="M8 9L10 12L8 15"
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M13 15H16" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        ))}

        {/* Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-6xl mx-auto py-16 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          {/* Logo/Brand */}
          <motion.div
            className="inline-flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-blue-400 rounded-lg sm:rounded-xl blur-md sm:blur-lg opacity-50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              />
              <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-white rounded-lg sm:rounded-xl shadow-sm">
                <img src={siteConfig.logo} alt={siteConfig.name} className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
            </div>
            <h3 className="text-blue-600 text-lg sm:text-2xl font-semibold">{siteConfig.name}</h3>
          </motion.div>

          {/* Main Heading - adjusted mobile size */}
          <motion.h1
            className="text-gray-900 mb-4 sm:mb-6 text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Education Management
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Reimagined</span>
          </motion.h1>

          {/* Description - adjusted mobile size */}
          <motion.p
            className="text-gray-600 max-w-3xl mx-auto text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 leading-relaxed px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            A comprehensive platform that empowers educators to create engaging courses and provides students with
            secure, immersive learning experiences.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.a
              href="/login"
              className="inline-flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl text-sm sm:text-base"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 60px rgba(59, 130, 246, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              Login to Platform
            </motion.a>

            <motion.a
              href="/about"
              className="inline-flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 60px rgba(59, 130, 246, 0.2)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              About Us
            </motion.a>

            <motion.a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 60px rgba(59, 130, 246, 0.2)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              Contact Us
            </motion.a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator - hidden on mobile */}
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

function SlideTwo() {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px",
  })
  const [activeTab, setActiveTab] = useState<"educators" | "students">("educators")

  const educatorFeatures = [
    {
      icon: BookOpen,
      title: "Course Creation",
      description: "Build engaging courses with rich multimedia content",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Shield,
      title: "Exam Platform",
      description: "Comprehensive exam management for teachers and institutions",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track progress with comprehensive dashboards",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Code,
      title: "Coding Challenges",
      description: "Support for 40+ languages with auto-grading",
      color: "from-orange-500 to-orange-600",
    },
  ]

  const studentFeatures = [
    {
      icon: GraduationCap,
      title: "Immersive Learning",
      description: "Interactive content and hands-on exercises",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      icon: Award,
      title: "Skills Validation",
      description: "Earn certificates through secure exams",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: Zap,
      title: "Personalized Pace",
      description: "Adaptive learning paths at your speed",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      icon: Brain,
      title: "Smart Assessments",
      description: "MCQ, coding, and essay question types",
      color: "from-red-500 to-red-600",
    },
  ]

  const features = activeTab === "educators" ? educatorFeatures : studentFeatures

  return (
    <section
      id="platform"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white overflow-hidden snap-start snap-always py-12 sm:py-8"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#3B82F6" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 rounded-full hidden sm:block"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)",
              left: `${30 + i * 40}%`,
              top: `${20 + i * 30}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-6 sm:mb-10"
        >
          <h2 className="mb-2 sm:mb-3 text-gray-900 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
            Built for{" "}
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Everyone</span>
          </h2>
          <p className="text-gray-500 text-sm sm:text-base lg:text-lg px-4">
            Powerful tools for educators, immersive experiences for students
          </p>
        </motion.div>

        {/* Tab Switcher - improved mobile spacing */}
        <motion.div
          className="flex justify-center gap-2 mb-6 sm:mb-10 px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            onClick={() => setActiveTab("educators")}
            className={`relative px-4 sm:px-8 lg:px-10 py-2.5 sm:py-3 rounded-full transition-all overflow-hidden text-xs sm:text-sm lg:text-base ${activeTab === "educators" ? "text-white" : "text-gray-600 hover:text-blue-600"
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "educators" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                layoutId="activeTab"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            <span className="relative z-10">For Educators</span>
          </motion.button>

          <motion.button
            onClick={() => setActiveTab("students")}
            className={`relative px-4 sm:px-8 lg:px-10 py-2.5 sm:py-3 rounded-full transition-all overflow-hidden text-xs sm:text-sm lg:text-base ${activeTab === "students" ? "text-white" : "text-gray-600 hover:text-blue-600"
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "students" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                layoutId="activeTab"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            <span className="relative z-10">For Students</span>
          </motion.button>
        </motion.div>

        {/* Features Grid - improved mobile layout */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto" layout>
          {features.map((feature, index) => (
            <motion.div
              key={`${activeTab}-${index}`}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
              }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-100 hover:border-blue-200 transition-all h-full shadow-sm hover:shadow-lg">
                <div
                  className={`absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                />

                <div className="relative">
                  <motion.div
                    className={`mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${feature.color} rounded-lg sm:rounded-xl flex items-center justify-center shadow-md`}
                    whileHover={{
                      rotate: [0, -5, 5, -5, 0],
                      scale: 1.1,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </motion.div>

                  <h3 className="mb-1 sm:mb-2 text-gray-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function SlideDownload() {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  const appFeatures = [
    {
      icon: Shield,
      title: "Secure Environment",
      description: "AI-powered monitoring and browser lockdown for exam integrity",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Monitor,
      title: "Multi-Platform",
      description: "Works seamlessly on Windows and Mac",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Zap,
      title: "Real-time Sync",
      description: "Automatic progress saving with zero interruptions",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "End-to-end encryption with industry-leading standards",
      color: "from-orange-500 to-orange-600",
    },
  ]

  const downloadLinks = [
    {
      icon: Download,
      label: "Download",
      color: "from-blue-500 to-blue-600",
      bgHover: "hover:from-blue-600 hover:to-blue-700",
      href: "https://github.com/Sumanydv/electron-app-download/releases/download/v0.0.1/blockscode-Setup-0.0.1.exe",
    },
  ]

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden bg-white snap-start snap-always py-12 sm:py-8"
    >
      {/* Minimal Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="dots-download" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#3B82F6" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-download)" />
        </svg>

        {/* Subtle floating shapes */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 sm:w-96 sm:h-96 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)",
              left: `${20 + i * 30}%`,
              top: `${10 + i * 25}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-14 lg:mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-4 sm:px-6 py-2 sm:py-3 bg-blue-50 rounded-full border border-blue-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2 }}
          >
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="text-blue-600 text-xs sm:text-sm font-semibold">MAC & DESKTOP APP</span>
          </motion.div>

          <h2 className="mb-4 sm:mb-6 text-gray-900 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold">
            Download the{" "}
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Exam App</span>
          </h2>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto px-2">
            Take secure, proctored exams with our powerful native application
          </p>
        </motion.div>

        {/* Download Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-14 sm:mb-16 lg:mb-20 px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
        >
          {downloadLinks.map((link, index) => (
            <motion.a
              key={index}
              href={link.href}
              className={`group relative w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r ${link.color} ${link.bgHover} text-white rounded-2xl sm:rounded-2xl inline-flex items-center gap-2 sm:gap-3 justify-center transition-all shadow-lg hover:shadow-xl overflow-hidden text-base sm:text-lg font-semibold`}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <link.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{link.label}</span>
            </motion.a>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
        >
          {appFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.7 + index * 0.08,
              }}
              whileHover={{ y: -8 }}
              className="relative group"
            >
              <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-blue-200 transition-all h-full shadow-sm hover:shadow-lg">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                />

                <div className="relative">
                  {/* Icon */}
                  <motion.div
                    className={`mb-4 sm:mb-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${feature.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg`}
                    whileHover={{
                      rotate: [0, -5, 5, -5, 0],
                      scale: 1.1,
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="mb-2 sm:mb-3 text-gray-900 group-hover:text-blue-600 transition-colors text-base sm:text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function SlideThree() {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-50px",
  })

  const benefits = [
    {
      icon: CheckCircle,
      text: "Start instantly",
      color: "from-green-500 to-emerald-600",
    },
    {
      icon: CheckCircle,
      text: "Setup in minutes",
      color: "from-blue-500 to-cyan-600",
    },
    {
      icon: CheckCircle,
      text: "24/7 support",
      color: "from-purple-500 to-pink-600",
    },
    {
      icon: CheckCircle,
      text: "Enterprise security",
      color: "from-orange-500 to-red-600",
    },
  ]

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden bg-white snap-start snap-always py-12 sm:py-8"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="dots-slide3" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#3B82F6" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-slide3)" />
        </svg>

        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 rounded-full hidden sm:block"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)",
              left: `${30 + i * 40}%`,
              top: `${20 + i * 30}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Heading Section */}
          <motion.div
            className="mb-6 sm:mb-8 px-2"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <h2 className="mb-2 sm:mb-3 text-gray-900 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
              Start Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Journey</span>{" "}
              Today
            </h2>

            <p className="text-gray-500 text-sm sm:text-base lg:text-lg max-w-xl mx-auto">
              Transform your educational experience with our secure platform
            </p>
          </motion.div>

          {/* Benefits - improved mobile layout */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-3xl mx-auto px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.4,
                  delay: 0.5 + index * 0.08,
                }}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white rounded-full border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all"
              >
                <motion.div
                  className={`w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br ${benefit.color} rounded-full flex items-center justify-center flex-shrink-0`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <benefit.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </motion.div>
                <span className="text-gray-700 text-xs sm:text-sm">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons - improved mobile layout */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-10 px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9 }}
          >
            <motion.a
              href="/login"
              className="group relative w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full inline-flex items-center gap-2 justify-center transition-all shadow-lg overflow-hidden text-sm sm:text-base"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 50px rgba(59, 130, 246, 0.4)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative z-10">Get Started Now</span>
              <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>

            <motion.a
              href="#platform"
              className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-full inline-flex items-center gap-2 justify-center hover:bg-blue-50 transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Learn More</span>
            </motion.a>
          </motion.div>

          {/* Footer - simplified for mobile */}
          <motion.div
            className="pt-6 sm:pt-8 border-t border-gray-100 max-w-4xl mx-auto px-2"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 1.1 }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              {/* Brand */}
              <motion.div className="flex items-center gap-2 sm:gap-3" whileHover={{ scale: 1.05 }}>
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-blue-400 rounded-lg blur-md opacity-50"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center shadow-md p-1">
                    <img src={siteConfig.logo} alt={siteConfig.name} className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="text-left">
                  <h4 className="text-gray-900 text-sm sm:text-base font-semibold">{siteConfig.company}</h4>
                  <p className="text-gray-500 text-[10px] sm:text-xs">Enterprise Education Platform</p>
                </div>
              </motion.div>

              {/* Copyright & Social */}
              <div className="flex items-center gap-3 sm:gap-4">
                <p className="text-gray-400 text-xs">&copy; {new Date().getFullYear()} {siteConfig.company}</p>

                <motion.a
                  href="/contact"
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}