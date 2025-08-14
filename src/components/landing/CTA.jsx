"use client";
import Link from "next/link";
import { FaArrowRight, FaCheckCircle, FaHospital } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function CTA() {
  const benefits = [
    'No credit card required',
    '14-day free trial',
    'Cancel anytime',
    '24/7 support'
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700">
      {/* Decorative elements */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <FaHospital className="h-4 w-4" />
            <span>Trusted by healthcare organizations worldwide</span>
          </div>
          
          <h2 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to transform your workforce management?
          </h2>
          
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-100">
            Join thousands of healthcare providers who trust Lief Clock for accurate, reliable attendance tracking.
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/api/auth/login?screen_hint=signup&returnTo=/post-login"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-base font-semibold !text-white border border-white/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-white/50 hover:ring-offset-2 sm:text-lg"
              >
                <span>Start Free Trial</span>
                <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/api/auth/login?returnTo=/post-login"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-8 py-4 text-base font-semibold !text-white border border-white/50 shadow-lg transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-white/50 hover:ring-offset-2 sm:text-lg"
              >
                Schedule a Demo
              </Link>
            </motion.div>
          </div>
          
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-blue-100">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FaCheckCircle className="h-4 w-4 text-emerald-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
   
    </section>
  );
}
