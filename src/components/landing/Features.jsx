"use client";
import { FaMapMarkerAlt, FaUserShield, FaChartPie, FaClock as ClockIcon, FaMobile, FaShieldAlt, FaBell } from 'react-icons/fa';
import { motion } from 'framer-motion';

const features = [
  {
    icon: <FaMapMarkerAlt className="h-5 w-5 text-blue-600" />,
    title: "Geofenced Attendance",
    desc: "Accurate on‑site verification with perimeter‑based auto clock in/out and manual override when needed.",
    color: "from-blue-100 to-blue-50",
    iconColor: "bg-blue-100 text-blue-600"
  },
  {
    icon: <FaUserShield className="h-5 w-5 text-emerald-600" />,
    title: "Admin Control",
    desc: "Manage locations, monitor live attendance, and configure roles and permissions securely.",
    color: "from-emerald-100 to-emerald-50",
    iconColor: "bg-emerald-100 text-emerald-600"
  },
  {
    icon: <FaChartPie className="h-5 w-5 text-purple-600" />,
    title: "Analytics & Insights",
    desc: "Understand utilization and trends with daily counts and weekly hours per staff member.",
    color: "from-purple-100 to-purple-50",
    iconColor: "bg-purple-100 text-purple-600"
  },
  {
    icon: <ClockIcon className="h-5 w-5 text-amber-600" />,
    title: "Real-time Tracking",
    desc: "Monitor staff attendance in real-time with live updates and instant notifications.",
    color: "from-amber-100 to-amber-50",
    iconColor: "bg-amber-100 text-amber-600"
  },
  {
    icon: <FaMobile className="h-5 w-5 text-cyan-600" />,
    title: "Mobile First",
    desc: "Fully responsive design that works perfectly on any device, with or without internet.",
    color: "from-cyan-100 to-cyan-50",
    iconColor: "bg-cyan-100 text-cyan-600"
  },
  {
    icon: <FaShieldAlt className="h-5 w-5 text-green-600" />,
    title: "Enterprise Security",
    desc: "Bank-grade encryption and compliance with healthcare data protection standards.",
    color: "from-green-100 to-green-50",
    iconColor: "bg-green-100 text-green-600"
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Features() {
  return (
    <section className="relative overflow-hidden bg-white py-20">
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 text-sm font-medium text-blue-700 backdrop-blur-sm">
            <FaBell className="h-3.5 w-3.5 text-blue-500" />
            <span>Trusted by healthcare teams worldwide</span>
          </div>
          <h2 className="mt-6 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
            Everything you need to manage your team
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-600">
            Designed specifically for healthcare professionals who demand reliability and ease of use.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={feature.title}
              variants={item}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${feature.color} p-6 backdrop-blur-sm`}
            >
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20" />
              <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconColor} mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold leading-7 text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">{feature.desc}</p>
              
              {/* Animated border effect on hover */}
              <div className="absolute inset-0 -z-10 rounded-2xl bg-white/80 opacity-0 transition-opacity duration-300 hover:opacity-100" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
