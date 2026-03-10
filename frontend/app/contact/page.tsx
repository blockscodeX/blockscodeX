"use client"

import { siteConfig } from "../config/site"

import type React from "react"

import { useState, useRef } from "react"
import { motion, useInView } from "motion/react"
import { MapPin, Calendar, Send, Loader2, CheckCircle, ArrowLeft, Shield, Video, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function ContactPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      website: formData.get("website") || "", // Honeypot - ensure string
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Contact form error:", result)
        throw new Error(result.error || "Something went wrong")
      }

      setIsSuccess(true)
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div ref={ref} className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-40">
          <defs>
            <linearGradient id="contactGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#3B82F6", stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: "#60A5FA", stopOpacity: 0.1 }} />
            </linearGradient>
            <pattern id="contact-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#3B82F6" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#contact-dots)" />
          <motion.circle
            cx="5%"
            cy="15%"
            r="80"
            fill="url(#contactGrad1)"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.circle
            cx="95%"
            cy="85%"
            r="100"
            fill="url(#contactGrad1)"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
          />
        </svg>

        {/* Floating shapes - hidden on mobile */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute hidden md:block"
            style={{ left: `${20 + i * 30}%`, top: `${10 + i * 20}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 5 + i * 2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.5 }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3B82F6" strokeWidth="1.5" opacity="0.4" />
            </svg>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header with Back Button */}
        <motion.div
          className="flex items-center justify-between mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <Link href="/">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </motion.div>
          </Link>

          <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-blue-400 rounded-lg blur-md opacity-50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              />
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-blue-600 font-semibold text-sm sm:text-base hidden sm:block">{siteConfig.name}</span>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Send a Message</h2>
                    <p className="text-gray-500 text-xs sm:text-sm">Fill out the form below to get in touch</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {isSuccess ? (
                  <motion.div
                    className="flex flex-col items-center justify-center py-8 sm:py-12 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 text-sm sm:text-base mb-6 max-w-sm">
                      Thank you for contacting us. We've received your message and will respond shortly.
                    </p>
                    <motion.button
                      onClick={() => setIsSuccess(false)}
                      className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-all text-sm sm:text-base font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Send Another Message
                    </motion.button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    {/* Honeypot Field */}
                    <input type="text" name="website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 font-medium text-sm">
                          Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          required
                          minLength={2}
                          placeholder="John Doe"
                          className="h-11 sm:h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="john@example.com"
                          className="h-11 sm:h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-700 font-medium text-sm">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        required
                        minLength={5}
                        placeholder="How can we help?"
                        className="h-11 sm:h-12 rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-700 font-medium text-sm">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        minLength={10}
                        placeholder="Tell us more about your inquiry..."
                        className="min-h-[120px] sm:min-h-[150px] rounded-xl border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info Column */}
          <div className="space-y-6">
            {/* Google Meet Section */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Schedule a Meeting</h2>
                      <p className="text-gray-500 text-xs sm:text-sm">Prefer a face-to-face conversation?</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 sm:p-6 rounded-2xl border border-blue-100">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Google Meet Consultation</h3>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1">
                          Book a 30-minute consultation to discuss your needs and see how we can help.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 text-gray-500 text-xs sm:text-sm">
                      <Clock className="w-4 h-4" />
                      <span>30 minutes • Free consultation</span>
                    </div>

                    <motion.button
                      className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                      Book a Time Slot
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Map Section */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Visit Us</h2>
                      <p className="text-gray-500 text-xs sm:text-sm">Come say hello at our office</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-video w-full bg-gray-100 relative">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.1422937950147!2d-73.98731968482413!3d40.75889497932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c6480299%3A0x55194ec5a1ae072e!2sTimes%20Square!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0"
                      title="Google Maps Location"
                    />
                  </div>
                  <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                        <MapPin className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Headquarters</h4>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1">
                          123 Innovation Drive
                          <br />
                          Tech City, TC 90210
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}