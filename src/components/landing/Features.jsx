"use client";

const features = [
  {
    title: "Geofenced Attendance",
    desc: "Accurate on‑site verification with perimeter‑based auto clock in/out and manual override when needed.",
  },
  {
    title: "Admin Control",
    desc: "Manage locations, monitor live attendance, and configure roles and permissions securely.",
  },
  {
    title: "Analytics & Insights",
    desc: "Understand utilization and trends with daily counts and weekly hours per staff member.",
  },
];

export default function Features() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Why teams choose Lief Clock</h2>
          <p className="mt-2 text-gray-600">Purpose‑built for hospitals and care organizations</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="mb-3 h-10 w-10 rounded-lg bg-blue-600/10" />
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
