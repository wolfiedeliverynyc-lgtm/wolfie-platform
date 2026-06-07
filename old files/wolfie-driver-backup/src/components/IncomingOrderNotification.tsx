import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ArrowRight, Navigation } from 'lucide-react'

interface IncomingOrderProps {
  order: any
  onAccept: () => void
  onDecline: () => void
}

export default function IncomingOrderNotification({ order, onAccept, onDecline }: IncomingOrderProps) {
  if (!order) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="absolute top-2 left-2 right-2 z-50 bg-[#151515]/95 backdrop-blur-md border border-[#333333] rounded-xl shadow-2xl p-3 overflow-hidden flex flex-col gap-2"
      >
        <div className="absolute inset-0 bg-[#FF5A00]/5 animate-pulse pointer-events-none"></div>

        {/* Top Row: Pay & Countdown */}
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">${order.pay?.toFixed(2) || '8.75'}</h2>
            <span className="bg-[#28A745]/20 text-[#28A745] text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">New</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white font-bold text-sm">5.4 km</p>
              <p className="text-[#737373] text-[10px]">20 min</p>
            </div>
            <div className="w-8 h-8 relative flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="14" stroke="#333333" strokeWidth="2.5" fill="none" />
                <circle cx="16" cy="16" r="14" stroke="#FF5A00" strokeWidth="2.5" fill="none" strokeDasharray="88" strokeDashoffset="0" style={{ animation: 'countdownRing 15s linear forwards' }} />
              </svg>
              <span className="absolute text-[10px] font-bold text-white">15</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Compact Locations */}
        <div className="relative z-10 flex items-center gap-2 bg-[#0A0A0A] rounded-lg p-2 border border-[#222222]">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#FF5A00]"></div>
            <div className="w-0.5 h-3 bg-[#333333]"></div>
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>
          </div>
          <div className="flex-1 flex flex-col gap-2 justify-center">
            <p className="text-white text-xs font-medium truncate">{order.restaurantName || 'Pizza Palace'}</p>
            <p className="text-white text-xs font-medium truncate">{order.customerName || 'John Smith'}</p>
          </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="relative z-10 flex gap-2 mt-1">
          <button 
            onClick={onDecline}
            className="flex-1 py-2 bg-[#222222] rounded-lg text-[#A3A3A3] text-xs font-bold uppercase active:scale-95 transition-transform"
          >
            Decline
          </button>
          <button 
            onClick={onAccept}
            className="flex-[2] py-2 bg-[#FF5A00] rounded-lg text-white text-xs font-bold uppercase flex justify-center items-center gap-1 active:scale-95 transition-transform"
          >
            Accept Order <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
