import React, { useState, useEffect } from 'react'
import { Upload, CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react'
import { useDriverStore } from '../store/useDriverStore'

interface DocumentSlot {
  id: string
  label: string
  desc: string
  status: 'empty' | 'uploading' | 'pending_review' | 'approved' | 'rejected'
  fileName?: string
  errorReason?: string
}

export default function DocumentUploadPage({ onComplete }: { onComplete: () => void }) {
  const { driverProfile, kycStatus, setKycStatus, resetStore } = useDriverStore()
  const vehicleType = driverProfile?.vehicleType || 'Motorcycle'
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Initialize slots dynamically based on vehicleType
  const [docs, setDocs] = useState<DocumentSlot[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const list: DocumentSlot[] = [
      { id: 'selfie', label: "Selfie Photo", desc: 'Clear portrait photo of your face', status: 'empty' }
    ]

    // License or ID Card depending on requirements
    if (vehicleType === 'Motorcycle' || vehicleType === 'Car') {
      list.push({ id: 'license', label: "Driver's License", desc: "Front photo of valid driver's license", status: 'empty' })
    } else {
      list.push({ id: 'id_card', label: "Government ID / Passport", desc: "National ID or Passport (for couriers who don't need a driver's license)", status: 'empty' })
    }

    // Vehicle photo
    if (vehicleType === 'Car') {
      list.push({ id: 'vehicle_photo', label: 'Car Photo', desc: 'Clear photo of your car showing the license plate', status: 'empty' })
    } else if (vehicleType === 'Motorcycle' || vehicleType === 'E-Bike') {
      list.push({ id: 'vehicle_photo', label: 'Scooter Photo', desc: 'Clear photo of your scooter or e-bike', status: 'empty' })
    }

    setDocs(list)
  }, [vehicleType])

  const handleUpload = (id: string) => {
    setLoadingId(id)
    setProgress(10)
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

  const allUploaded = docs.length > 0 && docs.every(d => d.status === 'pending_review' || d.status === 'approved')

  const handleSubmit = () => {
    setIsSubmitted(true)
    setKycStatus('pending')
  }

  if (isSubmitted || kycStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center bg-bg-app space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-3xl animate-pulse">
          ⏳
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-text-primary">KYC Review In Progress</h1>
        <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
          Verifying KYC. Please wait, we will send you an email.
        </p>
        <button 
          onClick={() => resetStore()} 
          className="w-full py-4 bg-bg-card hover:bg-bg-card-hover border border-slate-800 text-text-primary font-bold uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer"
        >
          LOGOUT / RETURN TO LOGIN
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-6 py-10 overflow-y-auto bg-bg-app">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary text-black border border-primary/20 flex items-center justify-center text-lg">📄</div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-text-primary">KYC Documents</h1>
          <p className="text-xs text-text-secondary mt-0.5">Upload required verification documents</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border mb-6 space-y-1 bg-bg-card border-slate-850">
        <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide"><AlertCircle size={14} /> Verification Required</h4>
        <p className="text-xs text-text-secondary leading-relaxed">Before taking orders, our compliance team must review your credentials. Review time: 2-4 hours.</p>
      </div>

      <div className="space-y-4 flex-1">
        {docs.map(doc => {
          const isUploading = loadingId === doc.id
          return (
            <div key={doc.id} className="p-4 rounded-xl border flex flex-col gap-3 transition-all bg-bg-card border-slate-850">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-bg-app flex items-center justify-center text-text-secondary shrink-0"><FileText size={20} /></div>
                  <div><h3 className="text-sm font-bold text-text-primary">{doc.label}</h3><p className="text-[11px] text-text-secondary leading-normal">{doc.desc}</p></div>
                </div>
                {!isUploading && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${doc.status === 'empty' ? 'bg-bg-app text-text-secondary' : doc.status === 'pending_review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{doc.status.replace('_', ' ')}</span>
                )}
              </div>
              {isUploading ? (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-text-secondary"><span>Uploading...</span><span>{progress}%</span></div>
                  <div className="w-full h-1 bg-bg-app rounded-full overflow-hidden"><div className="h-full bg-primary text-black transition-all duration-200" style={{ width: `${progress}%` }} /></div>
                </div>
              ) : doc.status === 'empty' ? (
                <button onClick={() => handleUpload(doc.id)} className="w-full py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-primary text-xs font-bold text-text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"><Upload size={14} /> Upload Document</button>
              ) : (
                <div className="flex justify-between items-center bg-bg-app p-2.5 rounded-lg border border-slate-850 text-xs">
                  <span className="font-mono text-text-secondary truncate max-w-[200px]">{doc.fileName}</span>
                  <button onClick={() => handleUpload(doc.id)} className="text-[10px] font-bold text-primary hover:text-primary-hover bg-transparent border-0 cursor-pointer">Replace</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-6 mt-auto">
        <button onClick={handleSubmit} disabled={!allUploaded} className={`w-full py-4 rounded-2xl text-base font-extrabold uppercase tracking-widest transition-all border-none ${allUploaded ? 'bg-primary text-black hover:bg-primary-hover active:scale-[0.98] cursor-pointer' : 'bg-bg-card text-text-secondary cursor-not-allowed'}`}>{allUploaded ? 'SUBMIT FOR REVIEW →' : 'UPLOAD ALL DOCUMENTS'}</button>
      </div>
    </div>
  )
}
