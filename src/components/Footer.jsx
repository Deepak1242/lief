import Link from "next/link";
import { FaGithub, FaTwitter, FaLinkedin, FaClock } from "react-icons/fa";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white !text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo and description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="./logo2.png" alt="Lief Clock Logo" className="h-10 w-auto color-blue-400" />
            
            </div>
            <p className="text-sm !text-blue-800">
              Time tracking made simple and efficient for modern teams and individuals.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="!text-blue-800 hover:text-white transition-colors">
                <span className="sr-only">GitHub</span>
                <FaGithub className="h-5 w-5" />
              </a>
              <a href="#" className="!text-blue-800 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <FaTwitter className="h-5 w-5" />
              </a>
              <a href="#" className="!text-blue-800 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <FaLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/features" className="text-sm !text-blue-800 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-sm !text-blue-800 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/about" className="text-sm !text-blue-800 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="text-sm !text-blue-800 hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/docs" className="text-sm !text-blue-800 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/help" className="text-sm !text-blue-800 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/tutorials" className="text-sm !text-blue-800 hover:text-white transition-colors">Tutorials</Link></li>
              <li><Link href="/api" className="text-sm !text-blue-800 hover:text-white transition-colors">API</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/privacy" className="text-sm !text-blue-800 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm !text-blue-800 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm !text-blue-800 hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link href="/gdpr" className="text-sm !text-blue-800 hover:text-white transition-colors">GDPR</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-12 border-t border-blue-500/30 pt-8">
          <p className="text-center text-xs !text-blue-800">
            &copy; {currentYear} Lief Clock. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
