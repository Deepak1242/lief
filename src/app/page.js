"use client";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <CTA />
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-gray-500 sm:px-6">© {new Date().getFullYear()} Lief Clock</div>
      </footer>
    </main>
  );
}
