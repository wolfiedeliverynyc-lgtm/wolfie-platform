import React, { useState } from 'react'
import { Upload, CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react'

interface DocumentSlot {
  id: string
  label: string
  desc: string
  status: 'empty' | 'uploading' | 'pending_review' | 'approved' | 'rejected'
  fileName?: string
  errorReason?: string
}

export default function DocumentUploadPage({ onComplete }: { onComplete: () => void }) {
  const [docs, setDocs] = useState<DocumentSlot[]>([
    { id: 'license', label: 'Driver\'s License', desc: 'Front and back photo of valid license', status: 'empty' },
    { id: 'insurance', label: 'Vehicle Insurance', desc: 'Proof of current liability coverage', status: 'empty' },
    { id: 'id_card', label: 'Government ID / Passport', desc: 'National ID card or passport details page', status: 'empty' },
    { id: 'registration', label: 'Vehicle Registration', desc: 'State vehicle registration certificate', status: 'empty' },
  ])

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleUpload = (id: string) => {
    setLoadingId(id)
    setProgress(10)
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'pending_review', fileName: `${id}_document.jpg` } : d))
          setLoadingId(null)
          return 0
        }
        return p + 30
      })
    }, 300)
  }

  const allUploaded = docs.every(d => d.status === 'pending_review' || d.status === 'approved')

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-lg">
          📄
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">KYC Documents</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Upload required verification documents</p>
        </div>
      </div>

      {/* Intro info box */}
      <div className="p-4 rounded-xl border mb-6 space-y-1 bg-neutral-900 border-neutral-800">
        <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wide">
          <AlertCircle size={14} /> Verification Required
        </h4>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Before taking orders on the Wolfie network, our compliance team must review your vehicle credentials. Review time averages 2-4 hours.
        </p>
      </div>

      {/* Slots List */}
      <div className="space-y-4 flex-1">
        {docs.map(doc => {
          const isUploading = loadingId === doc.id
          return (
            <div
              key={doc.id}
              className="p-4 rounded-xl border flex flex-col gap-3 transition-all bg-neutral-900 border-neutral-800"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{doc.label}</h3>
                    <p className="text-[11px] text-neutral-500 leading-normal">{doc.desc}</p>
                  </div>
                </div>

                {/* Status Chips */}
                {!isUploading && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      doc.status === 'empty' ? 'bg-neutral-800 text-neutral-400' :
                      doc.status === 'pending_review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {doc.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Upload actions or progress */}
              {isUploading ? (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : doc.status === 'empty' ? (
                <button
                  onClick={() => handleUpload(doc.id)}
                  className="w-full py-2.5 rounded-lg border border-dashed border-neutral-700 hover:border-amber-500 text-xs font-bold text-neutral-400 hover:text-amber-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} /> Upload Document File
                </button>
              ) : (
                <div className="flex justify-between items-center bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-xs">
                  <span className="mono text-neutral-400 truncate max-w-[200px]">{doc.fileName}</span>
                  <button
                    onClick={() => handleUpload(doc.id)}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-600 bg-transparent border-0 cursor-pointer"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="pt-6 mt-auto">
        <button
          onClick={onComplete}
          disabled={!allUploaded}
          className={`w-full py-4 rounded-2xl text-base font-extrabold uppercase tracking-widest transition-all ${
            allUploaded 
              ? 'bg-amber-500 text-neutral-950 hover:bg-amber-600 active:scale-[0.98] cursor-pointer'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {allUploaded ? 'SUBMIT FOR REVIEW →' : 'UPLOAD ALL DOCUMENTS'}
        </button>
      </div>
    </div>
  )
}
