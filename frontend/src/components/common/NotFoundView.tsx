import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Send } from 'lucide-react';

export default function NotFoundView() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6 font-sans">
      <div className="flex items-center justify-center gap-3 relative">
        <img
          src="/assets/Avatar2.png"
          alt="Page not found avatar"
          className="w-24 h-24 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#FEF6EA]"
        />
        <img
          src="/assets/Avatar3.png"
          alt="Page not found assistant avatar"
          className="w-16 h-16 rounded-2xl border-2 border-black object-cover shadow-sm bg-[#E6F4F1] -ml-4 mt-6"
        />
        <span className="absolute -top-3 bg-[#054048] text-white border-2 border-black text-xs font-black px-3 py-0.5 rounded-full shadow-sm">
          Oops! 404
        </span>
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight">Page Not Found</h1>
        <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
          The page you are looking for doesn't exist or has been moved. Don't worry, our friendly blobs are here to guide you back!
        </p>
      </div>

      <Link
        to="/dashboard"
        className="btn-primary py-3 px-6 text-xs font-extrabold gap-2 inline-flex items-center cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 stroke-[3]" /> Return to Dashboard
      </Link>
    </div>
  );
}
