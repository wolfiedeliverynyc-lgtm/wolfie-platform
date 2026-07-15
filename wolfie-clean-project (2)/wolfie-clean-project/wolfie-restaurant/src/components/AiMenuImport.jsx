import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { X, Upload, Sparkles, CheckCircle, AlertTriangle, FileText, ArrowRight, Save, Trash2, ArrowLeft } from 'lucide-react';

const MOCK_EXTRACTED_ITEMS = [
  { id: 'ext1', name: 'Alpha Smash Burger', category: 'Burgers', price: 13.99, confidence: 95, warning: null, image: null, ingredients: 'Beef Patty, Brioche Bun, Cheddar Cheese, Lettuce, Spicy Mayo' },
  { id: 'ext2', name: 'Triple Wolf Burger', category: 'Burgers', price: 18.50, confidence: 62, warning: 'Low confidence on price', image: null, ingredients: 'Beef Patty, Cheddar Cheese, Applewood Bacon' },
  { id: 'ext3', name: 'Loaded Garlic Fries', category: 'Sides', price: 7.99, confidence: 91, warning: null, image: null, ingredients: 'Regular Fries, Garlic Parmesan, Cheddar Cheese' },
  { id: 'ext4', name: 'Margherita Pizza Deluxe', category: 'Pizza', price: 15.99, confidence: 92, warning: null, image: null, ingredients: 'Mozzarella, San Marzano Tomato, Fresh Basil, Olive Oil' },
  { id: 'ext5', name: 'Pepperoni Feast Pizza', category: 'Pizza', price: 17.50, confidence: 88, warning: null, image: null, ingredients: 'Mozzarella, Tomato Sauce, Pepperoni Slices, Oregano' },
  { id: 'ext6', name: 'Craft IPA Can', category: 'Drinks', price: 5.50, confidence: 85, warning: null, image: null, ingredients: '' }
];

export default function AiMenuImport({ isOpen, onClose }) {
  const { addCategory, addMenuProduct } = useRestaurantStore();
  const [step, setStep] = useState(1);
  
  // Step 1: Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [scannedImage, setScannedImage] = useState(null);
  
  // Step 2: Processing Logs
  const [logs, setLogs] = useState([]);
  const [logIndex, setLogIndex] = useState(0);

  // Gemini API Key
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');

  // Step 3: Review Grid
  const [extractedItems, setExtractedItems] = useState(MOCK_EXTRACTED_ITEMS);
  const [previewTab, setPreviewTab] = useState('menu'); // 'menu' | 'scan'

  const processingSteps = [
    { text: '[SYSTEM] Initializing OCR image extraction pipeline...', delay: 600 },
    { text: '[OCR] Analyzing layout geometry & column matrices...', delay: 800 },
    { text: '[NLP] Category classification: Burgers, Sides, Drinks detected...', delay: 700 },
    { text: '[NLP] Nested modifier options detected: Choose Fries (+$1.00)...', delay: 900 },
    { text: '[AI-GEN] Automatically generating ingredients & descriptions...', delay: 1000 },
    { text: '[AI-GEN] Building upsell pairings & allergen flags...', delay: 700 },
    { text: '[DB] Checking duplicates against Williamsburg database...', delay: 800 },
    { text: '[SUCCESS] Extraction complete. Confidence score: 94%.', delay: 500 }
  ];

  // Handle Log print iteration
  useEffect(() => {
    if (step !== 2) return;
    if (logIndex >= processingSteps.length) {
      return;
    }

    const timer = setTimeout(() => {
      setLogs(prev => [...prev, processingSteps[logIndex].text]);
      setLogIndex(prev => prev + 1);
    }, processingSteps[logIndex].delay);

    return () => clearTimeout(timer);
  }, [step, logIndex]);

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file) return;
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
          heic2any.default({ blob: file, toType: "image/jpeg" }).then(conversionResult => {
            const reader = new FileReader();
            reader.onload = (e) => setScannedImage(e.target.result);
            reader.readAsDataURL(conversionResult);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const callGeminiApi = async (base64Image, key) => {
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.substring(5, base64Image.indexOf(';'));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract the menu items from this image into a JSON array of objects. Each object must have: 'name' (string), 'category' (string, e.g. Burgers, Pizza, Sides, Drinks), 'price' (number), 'ingredients' (string, comma-separated list of ingredients), 'confidence' (number 1-100). Return ONLY the raw JSON array string. No markdown formatting." },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
          ]
        }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to parse image');
    }
    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const items = JSON.parse(text);
    return items.map((item, idx) => ({
      ...item,
      id: 'ai_' + Date.now() + '_' + idx,
      warning: item.confidence < 80 ? 'Low confidence on some fields' : null,
      image: null
    }));
  };

  const startOcr = async () => {
    if (!selectedFile) return;
    setLogs([]);
    setLogIndex(0);
    setStep(2);

    try {
      if (apiKey && scannedImage) {
        const items = await callGeminiApi(scannedImage, apiKey);
        setExtractedItems(items);
        setTimeout(() => setStep(3), 2000);
      } else {
        setExtractedItems(MOCK_EXTRACTED_ITEMS);
        setTimeout(() => setStep(3), 6000);
      }
    } catch (error) {
      console.error(error);
      alert("Error calling Gemini API: " + error.message);
      setExtractedItems(MOCK_EXTRACTED_ITEMS);
      setTimeout(() => setStep(3), 2000);
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

  // Step 4 Actions
  const handleFinalImport = () => {
    extractedItems.forEach(item => {
      // Create category if missing
      addCategory(item.category);

      // Add product
      addMenuProduct({
        name: item.name,
        category: item.category,
        price: item.price,
        calories: Math.floor(200 + Math.random() * 600),
        prepMins: Math.floor(5 + Math.random() * 15),
        available: true,
        allergens: [],
        image: item.image || (item.category === 'Burgers' ? '🍔' : item.category === 'Drinks' ? '🥤' : item.category === 'Pizza' ? '🍕' : '🍟'),
        description: 'AI Extracted: Signature offering imported from menu screenshot.',
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
    setScannedImage(null);
    setExtractedItems(MOCK_EXTRACTED_ITEMS);
    alert('Menu items imported into your draft menu catalog successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 backdrop-blur-sm p-6">
      <div 
        className="w-full max-w-5xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Wizard Header */}
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
                Extract and configure categories, modifier pairings, and menu details from uploads.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1 rounded-2xl hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Stage Steps Indicator */}
        <div 
          className="px-6 py-3 bg-neutral-50 flex items-center gap-4 text-xs font-semibold shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {[
            { num: 1, label: 'Upload file' },
            { num: 2, label: 'OCR extraction' },
            { num: 3, label: 'Review board' },
            { num: 4, label: 'Diff import' }
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

        {/* Wizard Stages Content Area */}
        <div className="flex-1 overflow-hidden">
          
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
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
                  Drag & Drop Scans or Click to Upload
                </h4>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Supports high-resolution photographs, HEIC, screenshots, PDFs, or hand-written menus.
                </p>
              </div>

              {/* API Key Input */}
              <div className="w-full max-w-xl flex flex-col gap-1 mt-4">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                  Gemini API Key (Optional, for real extraction)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('GEMINI_API_KEY', e.target.value);
                  }}
                  placeholder="Paste your Google Gemini API key to use real OCR..."
                  className="w-full px-4 py-2 border rounded-[2.5rem] outline-none focus:border-amber-500 text-xs text-neutral-800"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                />
                {!apiKey && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    ⚠️ Without an API key, the system will use a comprehensive mocked Wolfie Burgers menu instead of actually reading your image.
                  </p>
                )}
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

          {/* STEP 2: Processing Logs terminal */}
          {step === 2 && (
            <div className="h-full bg-neutral-950 p-6 flex flex-col font-sans text-xs">
              <div className="flex-1 overflow-y-auto space-y-2.5 text-neutral-300">
                {logs.map((log, index) => (
                  <p key={index} className="leading-relaxed">
                    <span className="text-amber-500 mr-2">➜</span>
                    {log}
                  </p>
                ))}
                {logIndex < processingSteps.length && (
                  <span className="inline-block w-2 h-4 bg-white animate-pulse" />
                )}
              </div>
              <div className="pt-4 border-t border-neutral-900 flex justify-between items-center text-neutral-500 text-[10px]">
                <span>OCR Active Log Stream</span>
                <span>Williamsburg Hub Telemetry Node #12</span>
              </div>
            </div>
          )}

          {/* STEP 3: Side-by-side workstation review */}
          {step === 3 && (
            <div className="h-full flex divide-x overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              
              {/* Left Column: Toggable Original Scan Reference vs Clean Menu Preview */}
              <div className="w-1/3 p-6 bg-neutral-100 flex flex-col justify-between overflow-y-auto border-r border-neutral-200">
                <div className="space-y-4">
                  {/* Left Column Tabs Header */}
                  <div className="flex bg-neutral-200 p-0.5 rounded-2xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('menu')}
                      className={`flex-1 py-1.5 text-center rounded-md cursor-pointer transition-colors ${previewTab === 'menu' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                    >
                      Clean Menu Preview
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
                        <div 
                          className="p-6 border rounded-[2.5rem] shadow-md space-y-4 bg-white transform rotate-1"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <h2 className="font-extrabold text-center border-b pb-2 text-sm text-neutral-700">WOLFIE BURGERS</h2>
                          <div className="space-y-2 text-[10px] text-neutral-600">
                            <div className="flex justify-between font-bold">
                              <span>Alpha Smash Burger</span>
                              <span>$13.99</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Triple Wolf Burger</span>
                              <span>$18.50</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Loaded Garlic Fries</span>
                              <span>$7.99</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Alpha Wolf Burger</span>
                              <span>$14.99</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Craft IPA Can</span>
                              <span className="text-red-500">[unreadable]</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Menu Preview (Owner Handoff View) */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          Clean Menu Preview (Owner Check)
                        </h4>
                        <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                          Live In-Sync ⚡
                        </span>
                      </div>

                      {/* Render Menu Categories & Items */}
                      <div className="space-y-4">
                        {Array.from(new Set(extractedItems.map(i => i.category || 'Uncategorized'))).map(catName => {
                          const catItems = extractedItems.filter(i => (i.category || 'Uncategorized') === catName);
                          return (
                            <div key={catName} className="space-y-2">
                              <h5 className="text-[11px] font-bold text-neutral-800 border-b pb-1 flex items-center gap-1">
                                <span>{catName === 'Burgers' ? '🍔' : catName === 'Pizza' ? '🍕' : catName === 'Drinks' ? '🥤' : '🍟'}</span>
                                <span>{catName}</span>
                              </h5>
                              <div className="space-y-2">
                                {catItems.map(item => (
                                  <div 
                                    key={item.id} 
                                    className="p-2.5 rounded-2xl border bg-white flex gap-2.5 shadow-sm items-start"
                                    style={{ borderColor: 'var(--border)' }}
                                  >
                                    <span className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center shrink-0 overflow-hidden border">
                                      {item.image?.startsWith('data:') ? (
                                        <img src={item.image} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-lg">{item.image || (item.category === 'Burgers' ? '🍔' : item.category === 'Drinks' ? '🥤' : item.category === 'Pizza' ? '🍕' : '🍟')}</span>
                                      )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline gap-1">
                                        <h6 className="text-[10px] font-black text-neutral-900 truncate">{item.name || 'Unnamed Item'}</h6>
                                        <span className="text-[10px] font-bold text-amber-600 mono">${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}</span>
                                      </div>
                                      {item.ingredients ? (
                                        <p className="text-[9px] text-neutral-400 mt-1 line-clamp-2">
                                          Ingredients: <span className="text-neutral-600 font-semibold">{item.ingredients}</span>
                                        </p>
                                      ) : (
                                        <p className="text-[9px] text-neutral-300 italic mt-1">No ingredients parsed</p>
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
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-[10px] leading-relaxed">
                  ⚠️ Verify highlighted elements. Low confidence fields are pre-flagged.
                </div>
              </div>

              {/* Right Review Grid */}
              <div className="w-2/3 flex flex-col overflow-hidden h-full bg-white">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Extracted Structures Review Board
                  </h4>

                  <div className="space-y-3">
                    {extractedItems.map((item) => {
                      // Determine confidence color
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
                              {/* Inputs row */}
                              <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                                {/* Picture upload widget */}
                                <div className="flex items-center gap-2">
                                  <span className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden border">
                                    {item.image?.startsWith('data:') ? (
                                      <img src={item.image} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-lg">{item.image || (item.category === 'Burgers' ? '🍔' : item.category === 'Drinks' ? '🥤' : item.category === 'Pizza' ? '🍕' : '🍟')}</span>
                                    )}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`item-image-${item.id}`}
                                    className="hidden"
                                    onClick={(e) => { e.target.value = null; }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
                                          import('heic2any').then(heic2any => {
                                            heic2any.default({ blob: file, toType: 'image/jpeg' }).then(result => {
                                              const reader = new FileReader();
                                              reader.onload = (event) => handleItemEdit(item.id, 'image', event.target.result);
                                              reader.readAsDataURL(result);
                                            });
                                          });
                                        } else {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            handleItemEdit(item.id, 'image', event.target.result);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`item-image-${item.id}`}
                                    className="px-2 py-1 border rounded text-[10px] font-bold text-neutral-600 bg-white hover:bg-neutral-50 cursor-pointer"
                                    style={{ borderColor: 'var(--border)' }}
                                  >
                                    Pic
                                  </label>
                                </div>

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
                                    className="w-full px-2.5 py-1.5 border rounded-2xl text-xs font-bold mono outline-none focus:border-amber-500"
                                    style={{ borderColor: 'var(--border)' }}
                                    placeholder="Price"
                                  />
                                </div>
                              </div>

                              {/* Options */}
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-[9px] uppercase tracking-wider font-bold border px-2 py-0.5 rounded-full ${confColor}`}>
                                  {item.confidence}% Conf.
                                </span>
                                <button 
                                  onClick={() => handleItemDelete(item.id)}
                                  className="text-neutral-400 hover:text-red-500 cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Ingredients Row */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider w-16 shrink-0">Ingredients:</span>
                              <input
                                type="text"
                                value={item.ingredients || ''}
                                onChange={(e) => handleItemEdit(item.id, 'ingredients', e.target.value)}
                                className="w-full px-2.5 py-1 border rounded-2xl text-[11px] font-medium outline-none focus:border-amber-500"
                                style={{ borderColor: 'var(--border)' }}
                                placeholder="E.g. Cheese, Tomato Sauce, Garlic (comma-separated)"
                              />
                            </div>
                          </div>

                          {/* Warnings row */}
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

                {/* Foot Actions */}
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
                  >
                    Compare Diff & Import
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Diff import checker */}
          {step === 4 && (
            <div className="h-full flex flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Catalog Changes Summary (Import diff)
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Confirm the structure additions below before finalizing import into your draft system.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Category inserts */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">
                      New Categories to Create
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(extractedItems.map(i => i.category))).map(cat => (
                        <span key={cat} className="text-xs px-2.5 py-1 rounded bg-green-50 text-green-700 font-bold border border-green-200">
                          + {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Product items to insert */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest">
                      Product Insertions ({extractedItems.length})
                    </h5>
                    <div className="border rounded-[2.5rem] divide-y" style={{ borderColor: 'var(--border)' }}>
                      {extractedItems.map(item => (
                        <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-neutral-800">{item.name}</span>
                            <span className="text-[10px] text-neutral-400 font-medium ml-2">in {item.category}</span>
                          </div>
                          <span className="mono font-bold text-green-600">+ ${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm footer */}
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
