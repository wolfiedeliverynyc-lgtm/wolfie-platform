'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { legalData, LegalDocument } from '@/data/legalData';

// Inner component that uses search params
function LegalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedTab, setSelectedTab] = useState('terms-of-service');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync tab state with URL search param "?tab="
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && legalData.some(doc => doc.id === tabParam)) {
      setSelectedTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    setMobileMenuOpen(false);
    // Update URL query parameter without full reload
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tabId);
    router.push(`/legal?${params.toString()}`, { scroll: false });
    
    // Smooth scroll to top of content area on mobile
    if (window.innerWidth < 768) {
      const element = document.getElementById('legal-content-title');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper function to search within a document's sections
  const countMatches = (doc: LegalDocument, query: string): number => {
    if (!query) return 0;
    const lowerQuery = query.toLowerCase();
    let count = 0;
    
    if (doc.title.toLowerCase().includes(lowerQuery) || doc.subtitle.toLowerCase().includes(lowerQuery)) {
      count += 1;
    }
    
    doc.sections.forEach(section => {
      if (section.title.toLowerCase().includes(lowerQuery)) {
        count += 1;
      }
      section.content.forEach(paragraph => {
        if (paragraph.toLowerCase().includes(lowerQuery)) {
          count += 1;
        }
      });
    });
    
    return count;
  };

  // Filter sections within a document based on query
  const getFilteredSections = (doc: LegalDocument, query: string) => {
    if (!query) return doc.sections;
    const lowerQuery = query.toLowerCase();
    
    return doc.sections.filter(section => {
      const matchTitle = section.title.toLowerCase().includes(lowerQuery);
      const matchContent = section.content.some(paragraph => 
        paragraph.toLowerCase().includes(lowerQuery)
      );
      return matchTitle || matchContent;
    });
  };

  // Highlight helper
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-[#FF6B00]/30 text-[#FF6B00] font-semibold px-0.5 rounded border border-[#FF6B00]/20">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const activeDoc = legalData.find(doc => doc.id === selectedTab) || legalData[0];
  const filteredSections = getFilteredSections(activeDoc, searchQuery);
  const activeDocMatches = countMatches(activeDoc, searchQuery);

  // Find other documents that contain matches
  const docsWithMatches = legalData.map(doc => ({
    doc,
    count: countMatches(doc, searchQuery)
  })).filter(item => item.count > 0);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#F5F0E8] font-sans selection:bg-[#FF6B00] selection:text-white overflow-x-hidden">
      
      {/* Background Grids & Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#88888805_1px,transparent_1px),linear-gradient(to_bottom,#88888805_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF6B00] opacity-5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFEA00] opacity-3 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0a0a0a]/80 border-b border-neutral-800/40 px-6 py-4 md:px-12 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/')}
            className="text-2xl font-display font-bold tracking-tighter text-[#FF6B00] hover:scale-105 transition-transform"
          >
            WOLFIE.
          </button>
          <span className="hidden sm:inline-block text-xs uppercase tracking-[0.2em] px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold rounded-full">
            Legal & Policy Hub
          </span>
        </div>

        <button 
          onClick={() => router.push('/')}
          className="group flex items-center space-x-2 text-sm font-bold uppercase tracking-wider text-neutral-400 hover:text-[#FF6B00] transition-colors"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Back to Home</span>
        </button>
      </header>

      {/* Mobile Sticky Selector */}
      <div className="md:hidden sticky top-[68px] z-30 w-full bg-[#0d0d0d] border-b border-neutral-800/80 px-6 py-3 flex justify-between items-center">
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-bold">
          Active Section: <span className="text-[#FF6B00]">{activeDoc.title}</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-neutral-900 border border-neutral-800 text-xs px-3 py-1.5 font-bold uppercase tracking-wider text-neutral-300 hover:text-white"
        >
          {mobileMenuOpen ? 'Close Menu' : 'Browse Files'}
        </button>
      </div>

      {/* Mobile Selector Dropdown Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-[113px] left-0 w-full bg-[#0d0d0d] border-b border-neutral-800 z-20 max-h-[70vh] overflow-y-auto px-6 py-6 shadow-2xl"
          >
            {/* Mobile Search */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search legal directory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 px-4 py-3 pl-10 text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all rounded-none text-white placeholder-neutral-500"
              />
              <span className="absolute left-3 top-3.5 text-neutral-500 text-sm">🔍</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-neutral-500 text-xs hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Mobile List */}
            <div className="space-y-2">
              {legalData.map((doc) => {
                const matches = countMatches(doc, searchQuery);
                const hasMatches = searchQuery && matches > 0;
                
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleTabChange(doc.id)}
                    className={`w-full text-left p-3.5 flex justify-between items-center transition-all border ${
                      selectedTab === doc.id 
                        ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-white font-bold' 
                        : 'border-neutral-800/40 bg-neutral-900/40 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-display tracking-tight">{doc.title}</span>
                    {hasMatches ? (
                      <span className="bg-[#FF6B00] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {matches}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid Wrapper */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-20 z-10 relative flex flex-col md:flex-row gap-12">
        
        {/* Desktop Left Sidebar (Sticky) */}
        <aside className="hidden md:block w-1/4 min-w-[280px] self-start sticky top-28 space-y-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF6B00] mb-2 font-sans">Legal & Policies</h2>
            <p className="text-neutral-400 text-xs leading-relaxed font-sans">Official documents & guidelines regulating the Brooklyn Wolfie Grid network.</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search policies (e.g. tips)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950/60 backdrop-blur-xl border border-neutral-800/80 px-4 py-3.5 pl-10 text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all rounded-none text-white placeholder-neutral-600"
            />
            <span className="absolute left-3.5 top-4 text-neutral-600 text-sm">🔍</span>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-4 text-neutral-500 text-xs hover:text-[#FF6B00] transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Document list */}
          <nav className="flex flex-col space-y-1.5">
            {legalData.map((doc) => {
              const matches = countMatches(doc, searchQuery);
              const hasMatches = searchQuery && matches > 0;
              const isSelected = selectedTab === doc.id;
              
              return (
                <button
                  key={doc.id}
                  onClick={() => handleTabChange(doc.id)}
                  className={`w-full text-left p-3.5 transition-all duration-300 relative border flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-neutral-900/60 border-[#FF6B00] text-[#FF6B00] font-bold shadow-[inset_4px_0_0_0_#FF6B00]' 
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/20'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-display tracking-tight">{doc.title}</span>
                    <span className="text-[10px] text-neutral-500 font-sans tracking-wider uppercase mt-0.5 group-hover:text-neutral-400 transition-colors">
                      {doc.lastUpdated}
                    </span>
                  </div>

                  {hasMatches ? (
                    <span className="bg-[#FF6B00] text-white text-[10px] font-bold px-2 py-0.5 rounded-full transition-transform scale-110">
                      {matches}
                    </span>
                  ) : searchQuery ? (
                    <span className="opacity-0 w-2 h-2 rounded-full bg-neutral-800"></span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Need help card */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 p-6 rounded-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B00]/5 rounded-full blur-xl pointer-events-none"></div>
            <h4 className="font-display font-bold text-sm mb-2 text-white">Need Support?</h4>
            <p className="text-neutral-400 text-xs leading-relaxed mb-4">Have questions about our regulatory setup or contractor models? Reach out directly.</p>
            <a 
              href="mailto:legal@wolfie.delivery" 
              className="text-[#FF6B00] text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
            >
              Contact Legal Office →
            </a>
          </div>
        </aside>

        {/* Content Area */}
        <main className="w-full md:w-3/4 min-h-[60vh] bg-neutral-950/20 md:border-l md:border-neutral-800/40 md:pl-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Document Header */}
              <div id="legal-content-title" className="mb-12">
                <span className="text-xs uppercase tracking-[0.2em] font-sans font-bold text-[#FF6B00]">
                  Official Document
                </span>
                <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tighter mt-3 mb-4 leading-none">
                  {highlightText(activeDoc.title, searchQuery)}
                </h1>
                <p className="text-lg md:text-xl text-neutral-400 font-sans font-medium max-w-2xl leading-relaxed">
                  {highlightText(activeDoc.subtitle, searchQuery)}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-neutral-800/60 text-xs text-neutral-500 uppercase tracking-widest font-bold">
                  <span>Owner: Wolfie Tech Inc.</span>
                  <span className="hidden sm:inline text-neutral-800">•</span>
                  <span>Last Updated: {activeDoc.lastUpdated}</span>
                  <span className="hidden sm:inline text-neutral-800">•</span>
                  <span className="text-green-500">Active Framework</span>
                </div>
              </div>

              {/* Search Info banner */}
              {searchQuery && (
                <div className="mb-8 p-4 bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm font-sans text-neutral-300">
                    Showing matches for <span className="text-[#FF6B00] font-bold">"{searchQuery}"</span> inside this document. Found <span className="font-bold text-white">{activeDocMatches}</span> references.
                  </div>
                  {activeDocMatches === 0 && docsWithMatches.length > 0 && (
                    <div className="text-xs font-sans text-neutral-400">
                      Matches found in other files:
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {docsWithMatches.map((item) => (
                          <button
                            key={item.doc.id}
                            onClick={() => handleTabChange(item.doc.id)}
                            className="bg-neutral-800 hover:bg-[#FF6B00]/20 hover:text-white px-2.5 py-1 text-[10px] text-neutral-300 uppercase font-bold tracking-wider transition-colors border border-neutral-700"
                          >
                            {item.doc.title} ({item.count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sections list */}
              <div className="space-y-12">
                {filteredSections.length > 0 ? (
                  filteredSections.map((section, idx) => (
                    <section 
                      key={idx} 
                      className="border-l-2 border-[#FF6B00]/40 pl-6 md:pl-8 py-1 hover:border-[#FF6B00] transition-colors group"
                    >
                      <h3 className="text-2xl font-display font-bold text-white mb-5 tracking-tight group-hover:text-[#FF6B00] transition-colors">
                        {highlightText(section.title, searchQuery)}
                      </h3>
                      
                      <div className="space-y-4 text-neutral-300 leading-relaxed font-sans text-base md:text-lg">
                        {section.content.map((paragraph, pIdx) => {
                          const isBullet = paragraph.trim().startsWith('-') || paragraph.trim().startsWith('*') || /^\d+\./.test(paragraph.trim());
                          
                          if (isBullet) {
                            // Strip starting symbol for customized styling
                            const cleanText = paragraph.replace(/^[-*]\s*|^\d+\.\s*/, '');
                            return (
                              <div key={pIdx} className="flex items-start space-x-3 pl-2">
                                <span className="text-[#FF6B00] mt-1.5 text-sm select-none">▪</span>
                                <p className="flex-1">{highlightText(cleanText, searchQuery)}</p>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={pIdx} className="whitespace-pre-line">
                              {highlightText(paragraph, searchQuery)}
                            </p>
                          );
                        })}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="py-20 text-center border border-dashed border-neutral-800/80">
                    <p className="text-neutral-500 text-lg mb-4">No matching clauses found in this document.</p>
                    {docsWithMatches.length > 0 ? (
                      <div className="max-w-md mx-auto">
                        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold mb-3">Try checking other documents:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {docsWithMatches.map((item) => (
                            <button
                              key={item.doc.id}
                              onClick={() => handleTabChange(item.doc.id)}
                              className="bg-neutral-900 border border-neutral-800 hover:border-[#FF6B00]/60 hover:text-white px-3 py-1.5 text-xs text-neutral-300 uppercase tracking-wider transition-colors"
                            >
                              {item.doc.title} ({item.count})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-[#FF6B00] text-sm font-bold uppercase tracking-wider hover:underline"
                      >
                        Reset Search Query
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer notice */}
              <div className="mt-20 pt-8 border-t border-neutral-900 text-xs text-neutral-500 font-sans leading-relaxed">
                <p className="mb-2">Disclaimer: This legal framework was drafted specifically for the early operations of the WOLFIE Delivery network in Brooklyn, NY. Subject to amendments as local state and federal laws evolve.</p>
                <p>© 2026 Wolfie Tech Inc. All rights reserved. Registered trademark of Wolfie Delivery.</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}

// Wrapper to provide Suspense context for useSearchParams
export default function LegalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-[#F5F0E8] flex flex-col justify-center items-center font-display">
        <div className="text-[#FF6B00] text-3xl font-bold tracking-tighter mb-4 animate-pulse">WOLFIE.</div>
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-bold">Loading Legal Center...</div>
      </div>
    }>
      <LegalContent />
    </Suspense>
  );
}
