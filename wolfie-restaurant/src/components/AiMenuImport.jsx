import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { X, Upload, Sparkles, AlertTriangle, FileText, ArrowRight, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AiMenuImport({ isOpen, onClose }) {
  const { addCategory, addMenuProduct } = useRestaurantStore();
  const [step, setStep] = useState(1);

  // Step 1: Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [scannedImage, setScannedImage] = useState(null);

  // Step 2: Processing
  const [logs, setLogs] = useState([]);
  const [logIndex, setLogIndex] = useState(0);
  const [ocrError, setOcrError] = useState(null);

  // Step 3: Review Grid
  const [extractedItems, setExtractedItems] = useState([]);
  const [previewTab, setPreviewTab] = useState('menu'); // 'menu' | 'scan'

  const processingSteps = [
    { text: 'Uploading menu file to AI scanner...', delay: 400 },
    { text: 'Analyzing document layout & columns...', delay: 900 },
    { text: 'Running Gemini AI Vision OCR scan...', delay: 1200 },
    { text: 'Categorizing menu sections & items...', delay: 800 },
    { text: 'Extracting item names, prices & ingredients...', delay: 1000 },
    { text: 'Formatting structured catalog data...', delay: 600 },
    { text: 'Extraction complete! Loading review board...', delay: 400 },
  ];

  // Log print iteration for Step 2
  useEffect(() => {
    if (step !== 2) return;
    if (ocrError) return; // Stop log stream if error occurred
    if (logIndex >= processingSteps.length) return;
    const timer = setTimeout(() => {
      setLogs(prev => [...prev, processingSteps[logIndex].text]);
      setLogIndex(prev => prev + 1);
    }, processingSteps[logIndex].delay);
    return () => clearTimeout(timer);
  }, [step, logIndex, ocrError]);

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file) return;
    setRawFile(file);
    setSelectedFile({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      type: file.type || ''
    });

    const isImage = (file.type && file.type.startsWith('image/')) ||
      (/\.(jpe?g|png|gif|webp|svg|heic)$/i.test(file.name));

    if (isImage) {
      if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
        import('heic2any').then(heic2any => {
          heic2any.default({ blob: file, toType: 'image/jpeg' }).then(result => {
            const reader = new FileReader();
            reader.onload = (e) => setScannedImage(e.target.result);
            reader.readAsDataURL(result);
          });
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => setScannedImage(e.target.result);
        reader.readAsDataURL(file);
      }
    } else {
      setScannedImage(null);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    handleFile(e.dataTransfer.files?.[0]);
  };
  const handleFileChange = (e) => handleFile(e.target.files?.[0]);

  const startOcr = async () => {
    if (!rawFile) return;
    setOcrError(null);
    setLogs([]);
    setLogIndex(0);
    setStep(2);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', rawFile);

      let endpoint = `${API_BASE}/api/v1/ai/menu-ocr`;
      if (API_BASE && !API_BASE.endsWith('/api/v1')) {
        endpoint = `${API_BASE.replace(/\/+$/, '')}/api/v1/ai/menu-ocr`;
      } else if (!API_BASE) {
        const origin = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://wolfie-backend-pt9u.onrender.com';
        endpoint = `${origin}/api/v1/ai/menu-ocr`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('No menu items could be extracted. Try a clearer, higher-resolution image.');
      }

      setExtractedItems(data.items);
      // wait for last log to finish printing before moving to step 3
      setTimeout(() => setStep(3), 1000);
    } catch (err) {
      console.error('AI Menu OCR Error:', err);
      setOcrError(err.message || 'Menu extraction failed. Please try again.');
    }
  };

  // Step 3 Actions
  const handleItemEdit = (id, field, value) => {
    setExtractedItems(prev => prev.map(item => {
      if (item.id === id) {
        let val = value;
        if (field === 'price') val = parseFloat(value) || 0;
        return { ...item, [field]: val, warning: field === 'price' && val > 0 ? null : item.warning };
      }
      return item;
    }));
  };

  const handleItemDelete = (id) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id));
  };

  // Step 4: Final Import
  const handleFinalImport = () => {
    extractedItems.forEach(item => {
      addCategory(item.category);
      addMenuProduct({
        name: item.name,
        category: item.category,
        price: item.price,
        calories: Math.floor(200 + Math.random() * 600),
        prepMins: Math.floor(5 + Math.random() * 15),
        available: true,
        allergens: [],
        image: item.image || (item.category === 'Burgers' ? '🍔' : item.category === 'Drinks' ? '🥤' : item.category === 'Pizza' ? '🍕' : '🍟'),
        description: 'AI Extracted: Imported from menu scan.',
        seoSlug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        dietaryTags: [],
        pairings: [],
        rawIngredientsTextList: item.ingredients ? item.ingredients.split(',').map(i => i.trim()).filter(Boolean) : [],
        modifierGroupIds: []
      });
    });

    onClose();
    setStep(1);
    setSelectedFile(null);
    setRawFile(null);
    setScannedImage(null);
    setExtractedItems([]);
    setOcrError(null);
    alert(`✅ ${extractedItems.length} menu items imported into your draft catalog!`);
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setSelectedFile(null);
    setRawFile(null);
    setScannedImage(null);
    setExtractedItems([]);
    setOcrError(null);
    setLogs([]);
    setLogIndex(0);
  };

  const handleRetry = () => {
    setOcrError(null);
    setLogs([]);
    setLogIndex(0);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 backdrop-blur-sm p-6">
      <div
        className="w-full max-w-5xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>
                AI Menu Structuring Wizard
              </h3>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Upload your menu — Gemini AI extracts categories, items, prices & ingredients.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1 rounded-2xl hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          className="px-6 py-3 bg-neutral-50 flex items-center gap-4 text-xs font-semibold shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {[
            { num: 1, label: 'Upload file' },
            { num: 2, label: 'AI extraction' },
            { num: 3, label: 'Review board' },
            { num: 4, label: 'Confirm import' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: step === s.num ? 'var(--primary)' : step > s.num ? 'var(--success)' : 'var(--border)',
                  color: step >= s.num ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {s.num}
              </span>
              <span style={{ color: step === s.num ? 'var(--text)' : 'var(--text-secondary)' }}>
                {s.label}
              </span>
              {s.num < 4 && <ArrowRight size={12} className="text-neutral-300" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 ${step === 3 || step === 4 ? 'overflow-hidden' : 'overflow-y-auto'}`}>

          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="min-h-full flex flex-col items-center justify-center p-8 space-y-6">
              <input
                type="file"
                id="ai-menu-file-picker"
                accept="image/*,application/pdf"
                className="hidden"
                onClick={(e) => { e.target.value = null; }}
                onChange={handleFileChange}
              />
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('ai-menu-file-picker').click()}
                className="w-full max-w-xl p-12 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-amber-50 hover:bg-opacity-20"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
                  <Upload size={28} />
                </div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  Drag & Drop or Click to Upload
                </h4>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Supports images (JPG, PNG, HEIC), screenshots, PDFs, and hand-written menus.
                </p>
                <p className="text-[10px] mt-2 text-amber-600 font-semibold">
                  🤖 Powered by Gemini AI — no API key needed
                </p>
              </div>

              {selectedFile && (
                <div
                  className="w-full max-w-xl p-4 rounded-[2.5rem] border flex items-center justify-between"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={24} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {selectedFile.size}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={startOcr}
                    className="btn-primary flex items-center gap-1.5 px-4 py-2 font-extrabold text-xs uppercase"
                  >
                    <Sparkles size={14} /> Scan Menu
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Processing Terminal */}
          {step === 2 && (
            <div className="h-full bg-neutral-950 p-6 flex flex-col font-sans text-xs">
              <div className="flex-1 overflow-y-auto space-y-2.5 text-neutral-300">
                {logs.map((log, index) => (
                  <p key={index} className={`leading-relaxed ${log.startsWith('[ERROR]') ? 'text-red-400' : ''}`}>
                    <span className={`mr-2 ${log.startsWith('[ERROR]') ? 'text-red-500' : log.startsWith('[SUCCESS]') ? 'text-green-400' : 'text-amber-500'}`}>➜</span>
                    {log}
                  </p>
                ))}
                {logIndex < processingSteps.length && !ocrError && (
                  <span className="inline-block w-2 h-4 bg-white animate-pulse" />
                )}
              </div>

              {ocrError && (
                <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertTriangle size={14} />
                    <span>Extraction failed. Please try a higher-quality image or PDF.</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-2xl hover:bg-amber-600 transition-colors w-fit cursor-pointer"
                  >
                    ← Try Again
                  </button>
                </div>
              )}

              {!ocrError && (
                <div className="pt-4 border-t border-neutral-900 flex justify-between items-center text-neutral-500 text-[10px]">
                  <span>AI OCR Active Stream — Gemini 3.5 Flash</span>
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={10} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Side-by-side Review */}
          {step === 3 && (
            <div className="h-full flex divide-x overflow-hidden" style={{ borderColor: 'var(--border)' }}>

              {/* Left Column */}
              <div className="w-1/3 p-6 bg-neutral-100 flex flex-col justify-between overflow-y-auto border-r border-neutral-200">
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="flex bg-neutral-200 p-0.5 rounded-2xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('menu')}
                      className={`flex-1 py-1.5 text-center rounded-md cursor-pointer transition-colors ${previewTab === 'menu' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                    >
                      Clean Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('scan')}
                      className={`flex-1 py-1.5 text-center rounded-md cursor-pointer transition-colors ${previewTab === 'scan' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                    >
                      Original Scan
                    </button>
                  </div>

                  {previewTab === 'scan' ? (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        Original Scan Reference
                      </h4>
                      {scannedImage ? (
                        <img
                          src={scannedImage}
                          className="w-full rounded-[2.5rem] border object-contain max-h-[360px] shadow-sm bg-white"
                          alt="Scanned menu"
                        />
                      ) : (
                        <div className="p-6 border rounded-[2.5rem] bg-white text-center text-neutral-400 text-xs">
                          <FileText size={32} className="mx-auto mb-2 opacity-30" />
                          <p>PDF document uploaded — no image preview available.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Menu Preview */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          Clean Menu Preview
                        </h4>
                        <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                          Live ⚡
                        </span>
                      </div>
                      <div className="space-y-4">
                        {Array.from(new Set(extractedItems.map(i => i.category || 'Uncategorized'))).map(catName => {
                          const catItems = extractedItems.filter(i => (i.category || 'Uncategorized') === catName);
                          return (
                            <div key={catName} className="space-y-2">
                              <h5 className="text-[11px] font-bold text-neutral-800 border-b pb-1 flex items-center gap-1">
                                <span>{catName === 'Burgers' ? '🍔' : catName === 'Pizza' ? '🍕' : catName === 'Drinks' ? '🥤' : catName === 'Desserts' ? '🍰' : catName === 'Salads' ? '🥗' : '🍟'}</span>
                                <span>{catName}</span>
                              </h5>
                              <div className="space-y-2">
                                {catItems.map(item => (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-2xl border bg-white flex gap-2.5 shadow-sm items-start"
                                    style={{ borderColor: 'var(--border)' }}
                                  >
                                    <span className="text-lg shrink-0">
                                      {item.category === 'Burgers' ? '🍔' : item.category === 'Drinks' ? '🥤' : item.category === 'Pizza' ? '🍕' : item.category === 'Desserts' ? '🍰' : '🍟'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline gap-1">
                                        <h6 className="text-[10px] font-black text-neutral-900 truncate">{item.name || 'Unnamed Item'}</h6>
                                        <span className="text-[10px] font-bold text-amber-600">${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}</span>
                                      </div>
                                      {item.ingredients ? (
                                        <p className="text-[9px] text-neutral-400 mt-1 line-clamp-2">
                                          {item.ingredients}
                                        </p>
                                      ) : (
                                        <p className="text-[9px] text-neutral-300 italic mt-1">No ingredients</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-[10px] leading-relaxed mt-4">
                  ⚠️ Review highlighted items. Low confidence fields are flagged in red.
                </div>
              </div>

              {/* Right Review Grid */}
              <div className="w-2/3 flex flex-col overflow-hidden h-full bg-white">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Extracted Items Review Board
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-semibold">{extractedItems.length} items</span>
                  </div>

                  <div className="space-y-3">
                    {extractedItems.map((item) => {
                      let confColor = 'bg-red-50 text-red-700 border-red-200';
                      if (item.confidence >= 90) confColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (item.confidence >= 70) confColor = 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-[2.5rem] border flex flex-col gap-3 transition-shadow hover:shadow-md"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleItemEdit(item.id, 'name', e.target.value)}
                                  className="px-2.5 py-1.5 border rounded-2xl text-xs font-semibold outline-none focus:border-amber-500"
                                  style={{ borderColor: 'var(--border)' }}
                                  placeholder="Item Name"
                                />
                                <input
                                  type="text"
                                  value={item.category}
                                  onChange={(e) => handleItemEdit(item.id, 'category', e.target.value)}
                                  className="px-2.5 py-1.5 border rounded-2xl text-xs font-semibold outline-none focus:border-amber-500"
                                  style={{ borderColor: 'var(--border)' }}
                                  placeholder="Category"
                                />
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-neutral-400">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => handleItemEdit(item.id, 'price', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border rounded-2xl text-xs font-bold outline-none focus:border-amber-500"
                                    style={{ borderColor: 'var(--border)' }}
                                    placeholder="Price"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-[9px] uppercase tracking-wider font-bold border px-2 py-0.5 rounded-full ${confColor}`}>
                                  {item.confidence}%
                                </span>
                                <button
                                  onClick={() => handleItemDelete(item.id)}
                                  className="text-neutral-400 hover:text-red-500 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider w-20 shrink-0">Ingredients:</span>
                              <input
                                type="text"
                                value={item.ingredients || ''}
                                onChange={(e) => handleItemEdit(item.id, 'ingredients', e.target.value)}
                                className="w-full px-2.5 py-1 border rounded-2xl text-[11px] font-medium outline-none focus:border-amber-500"
                                style={{ borderColor: 'var(--border)' }}
                                placeholder="Comma-separated ingredients..."
                              />
                            </div>
                          </div>
                          {item.warning && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                              <AlertTriangle size={12} />
                              <span>{item.warning}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="p-4 bg-neutral-50 border-t shrink-0 flex justify-between items-center"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs font-bold text-neutral-500 bg-transparent border-none cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back to Upload
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="btn-primary font-extrabold text-xs uppercase"
                    disabled={extractedItems.length === 0}
                  >
                    Confirm & Import →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Diff import confirm */}
          {step === 4 && (
            <div className="h-full flex flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Catalog Changes Summary (Import Diff)
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Confirm the items below before writing them into your draft menu catalog.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">
                      New Categories
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(extractedItems.map(i => i.category))).map(cat => (
                        <span key={cat} className="text-xs px-2.5 py-1 rounded bg-green-50 text-green-700 font-bold border border-green-200">
                          + {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">
                      Items to Add ({extractedItems.length})
                    </h5>
                    <div className="border rounded-[2.5rem] divide-y" style={{ borderColor: 'var(--border)' }}>
                      {extractedItems.map(item => (
                        <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-neutral-800">{item.name}</span>
                            <span className="text-[10px] text-neutral-400 font-medium ml-2">in {item.category}</span>
                          </div>
                          <span className="font-bold text-green-600">+ ${parseFloat(item.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="p-4 bg-neutral-50 border-t shrink-0 flex justify-between"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Back to Review
                </button>
                <button
                  onClick={handleFinalImport}
                  className="btn-primary font-extrabold text-xs uppercase"
                >
                  Confirm & Write to Catalog
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
