import { ArrowLeft, MessageSquare, Phone, ShieldAlert, FileText, ChevronRight } from 'lucide-react'
import { useDriverStore } from '../store/useDriverStore'

export default function HelpPage() {
  const { setActiveTab } = useDriverStore()

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto pb-24 text-white">
      {/* Header */}
      <div className="pt-12 px-4 pb-4 flex items-center gap-3">
        <button 
          onClick={() => setActiveTab('account')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#151515] hover:bg-[#222222] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </div>

      <div className="px-6 space-y-6">
        {/* Emergency Section */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-lg font-bold text-red-500">Emergency Support</h2>
          </div>
          <p className="text-sm text-red-400/80 mb-4">If you are in immediate danger or have been involved in an accident.</p>
          <button className="w-full py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Phone size={18} /> CALL EMERGENCY ASSISTANCE
          </button>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-bold text-[#A3A3A3] uppercase tracking-wider mb-3">Support Categories</h3>
          <div className="bg-[#151515] rounded-xl border border-[#222222] overflow-hidden divide-y divide-[#222222]">
            {[
              { icon: MessageSquare, title: 'Live Chat', desc: 'Chat with Wolfie Support (Avg wait: 2m)' },
              { icon: FileText, title: 'Trip Issues & Adjustments', desc: 'Missing tolls, wrong payouts, etc.' },
              { icon: ShieldAlert, title: 'Report a Complaint', desc: 'Issues with restaurants or customers' },
            ].map((item, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors text-left">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-[#FF5A00] shrink-0">
                    <item.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs text-[#A3A3A3] mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#737373]" />
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h3 className="text-sm font-bold text-[#A3A3A3] uppercase tracking-wider mb-3 mt-2">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {[
              'How are my earnings calculated?',
              'What do I do if the restaurant is closed?',
              'The customer is not responding',
              'My app is glitching / GPS issues'
            ].map((q, idx) => (
              <div key={idx} className="bg-[#151515] p-4 rounded-xl border border-[#222222] flex items-center justify-between">
                <span className="text-sm font-medium">{q}</span>
                <ChevronRight size={16} className="text-[#737373]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
