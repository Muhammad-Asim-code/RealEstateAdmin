import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-slate-50 font-sans p-6 text-center">
      <div className="max-w-2xl bg-white p-12 rounded-2xl shadow-xl border border-slate-100">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">
          Real Estate Admin Dashboard
        </h1>
        <p className="text-lg text-slate-600 mb-10 leading-relaxed">
          Manage your property listings, track sales, and oversee rentals with our comprehensive real estate management platform.
        </p>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Go to Dashboard
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}

