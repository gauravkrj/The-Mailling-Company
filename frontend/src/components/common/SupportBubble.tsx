import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mail, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';

export const SupportBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close on Escape key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const whatsappUrl = 'https://wa.me/918670628044?text=Hi%2C%20I%20need%20help%20with%20The%20Mailling%20Company';
  const emailUrl = 'mailto:support@themaillingcompany.com?subject=Support%20Request%20-%20The%20Mailling%20Company';

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute bottom-16 right-0 w-80 sm:w-88 bg-white border-2 border-black rounded-3xl shadow-card p-5 overflow-hidden origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#054048]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1A1A1A] leading-tight">Need help?</h3>
                  <p className="text-[11px] text-[#5A5A5A] font-bold">We usually reply in a few minutes</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#5A5A5A] hover:text-black hover:bg-[#F0F0F0] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-black/20"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact Options List */}
            <div className="space-y-3">
              {/* WhatsApp Option */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between p-3.5 bg-[#E6F4F1] hover:bg-[#25D366]/10 border-2 border-black rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white border-2 border-black flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-5 h-5 fill-white text-[#25D366]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-[#1A1A1A] group-hover:text-[#054048] flex items-center gap-1.5">
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-[#5A5A5A] group-hover:text-[#054048]" />
                    </div>
                    <div className="text-[11px] font-mono text-[#054048] font-bold">+91 86706 28044</div>
                  </div>
                </div>
              </a>

              {/* Email Option */}
              <a
                href={emailUrl}
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between p-3.5 bg-[#FEF6EA] hover:bg-[#FEF6EA]/80 border-2 border-black rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#054048] text-white border-2 border-black flex items-center justify-center shrink-0 shadow-sm">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-[#1A1A1A] group-hover:text-[#054048] flex items-center gap-1.5">
                      <span>Email Support</span>
                      <ExternalLink className="w-3 h-3 text-[#5A5A5A] group-hover:text-[#054048]" />
                    </div>
                    <div className="text-[11px] font-mono text-[#054048] font-bold truncate max-w-[190px]">
                      support@themaillingcompany.com
                    </div>
                  </div>
                </div>
              </a>
            </div>

            {/* Footer Tagline */}
            <div className="mt-4 pt-3 border-t border-black/10 text-center">
              <span className="text-[10px] text-[#5A5A5A] font-bold">
                ⚡ Direct support from The Mailling Company team
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Bubble Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-black flex items-center justify-center cursor-pointer shadow-card transition-colors ${
          isOpen ? 'bg-[#1A1A1A] text-white' : 'bg-[#054048] text-white hover:bg-[#0A5D66]'
        }`}
        title="Contact Support"
        aria-label="Contact Support"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6" />
              {/* Subtle Breathing Pulse Dot */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#25D366] border-2 border-black rounded-full animate-ping opacity-75" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#25D366] border-2 border-black rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default SupportBubble;
