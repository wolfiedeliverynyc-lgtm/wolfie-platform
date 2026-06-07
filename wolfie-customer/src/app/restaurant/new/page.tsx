'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  Layout, 
  Image as ImageIcon, 
  ChefHat, 
  MapPin, 
  Utensils, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2,
  CheckCircle,
  Loader2
} from 'lucide-react';

// Custom inline SVG icons to fix Lucide-react export mismatches
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
import Header from '../../../components/Header';
import NotificationsPanel from '../../../components/NotificationsPanel';
import { useRealtimeStore } from '../../../stores/useRealtimeStore';
import { restaurantApi } from '../../../services/api';
import { Restaurant, MenuItem, RestaurantLayout } from '../../../lib/types';

export default function NewRestaurantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addNotification } = useRealtimeStore();

  // Multi-step form step state
  const [step, setStep] = useState(1);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  
  // Layout and Brand
  const [layout, setLayout] = useState<RestaurantLayout>('bento');
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&h=600&q=80');
  const [logoImage, setLogoImage] = useState('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=150&h=150&q=80');
  
  // Chef details
  const [chefName, setChefName] = useState('');
  const [chefBio, setChefBio] = useState('');
  const [chefImage, setChefImage] = useState('https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&h=300&q=80');

  // Contact Details
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [phone, setPhone] = useState('');

  // Menu items list
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // AI Prompt and generation states
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingMenu, setGeneratingMenu] = useState(false);

  // TanStack Query Mutations
  const registerMutation = useMutation({
    mutationFn: restaurantApi.registerRestaurant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      addNotification(
        'Engine Compiled Successfully! 🚀', 
        `Your customized website for "${data.name}" has been generated. Ready to serve clients!`, 
        'success'
      );
      router.push(`/restaurant/${data.id}`);
    },
    onError: (err) => {
      console.error(err);
      addNotification('Onboarding Error ❌', 'Failed to register restaurant in database ledger.', 'alert');
    }
  });

  // Call API route to generate menu via Gemini
  const handleAiMenuGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingMenu(true);
    addNotification('Consulting Culinary AI 🤖', 'Gemini is drafting menu options based on your prompt...', 'info');

    try {
      const response = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await response.json();
      
      if (response.ok && data.menu) {
        setMenuItems(data.menu);
        addNotification(
          'Menu Drafted! 🍕',
          `AI successfully generated ${data.menu.length} custom dishes matching your vision!`,
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to parse generated menu');
      }
    } catch (e: any) {
      console.error(e);
      addNotification('AI Generation Failed ❌', e?.message || 'Could not reach Gemini model.', 'alert');
    } finally {
      setGeneratingMenu(false);
    }
  };

  const handleManualAddItem = () => {
    const newItem: MenuItem = {
      id: `man_${Date.now()}`,
      name: 'Gourmet Specialty Item',
      description: 'Handcrafted signature dish made with local, organic ingredients.',
      price: 15.00,
      category: 'Main Plates',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300&q=80',
    };
    setMenuItems([...menuItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleUpdateItemField = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(
      menuItems.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const handleRegisterSubmit = () => {
    if (!name || !category || !description) {
      addNotification('Incomplete form 📋', 'Please provide a name, category and description.', 'alert');
      return;
    }

    const newRestaurant: Restaurant = {
      id: `rest_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      name,
      description,
      category,
      rating: 4.8 + parseFloat((Math.random() * 0.2).toFixed(2)),
      ratingCount: 1,
      deliveryTimeMin: 15 + Math.floor(Math.random() * 20),
      deliveryFee: Math.random() > 0.5 ? 0.99 : 1.99,
      priceLevel: '$$',
      status: 'open',
      story: story || `Founded with a vision to serve premium culinary treats, ${name} brings fresh recipes directly to you.`,
      bio: bio || `Artisanal ${category} crafted with pure passion.`,
      chefName: chefName || 'Chef de Cuisine',
      chefBio: chefBio || 'Passionate gastronomy engineer focusing on organic, farm-to-table flavors.',
      chefImage,
      heroImage,
      logoImage,
      address: address || 'Lower Manhattan, New York, NY',
      coordinates: { lat: 40.718 + (Math.random() - 0.5) * 0.01, lng: -74.001 + (Math.random() - 0.5) * 0.01 },
      menu: menuItems.length > 0 ? menuItems : [
        {
          id: `def_${Date.now()}`,
          name: 'House Special Dish',
          description: 'Our signature secret chef creation.',
          price: 18.00,
          category: 'Mains',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=300&q=80',
          isPopular: true
        }
      ],
      layout,
      instagram,
      facebook,
      phone
    };

    registerMutation.mutate(newRestaurant);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Header />
      <NotificationsPanel />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col justify-start select-none">
        
        {/* Step Progress indicators */}
        <div className="flex items-center justify-between mb-10 max-w-xl mx-auto w-full select-none text-xs font-black tracking-wider text-slate-400">
          <div className={`pb-2 border-b-2 flex items-center space-x-1.5 ${step >= 1 ? 'border-[#F15A24] text-slate-850' : 'border-transparent'}`}>
            <span>1. Identity</span>
          </div>
          <div className={`pb-2 border-b-2 flex items-center space-x-1.5 ${step >= 2 ? 'border-[#F15A24] text-slate-850' : 'border-transparent'}`}>
            <span>2. Brand Design</span>
          </div>
          <div className={`pb-2 border-b-2 flex items-center space-x-1.5 ${step >= 3 ? 'border-[#F15A24] text-slate-850' : 'border-transparent'}`}>
            <span>3. Menu Builder</span>
          </div>
        </div>

        {/* Step Cards */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.02)] text-left flex-1 flex flex-col justify-between">
          
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                  <Utensils className="w-7 h-7 text-[#F15A24]" />
                  Restaurant Identity
                </h2>
                <p className="text-xs text-slate-400 font-bold font-sans mt-2">
                  Define your restaurant credentials, locations, and brand narrative.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Restaurant Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Cyber Sushi Soho"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Food Category *</label>
                  <input
                    type="text"
                    placeholder="e.g., Japanese / Sushi"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Short Bio / Tagline *</label>
                <input
                  type="text"
                  placeholder="e.g., Flame-finished rolls & artisanal sake collections."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Detailed Description *</label>
                <textarea
                  rows={2}
                  placeholder="Describe your kitchen concept, signature tastes and ambiance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Dropoff Address *</label>
                  <input
                    type="text"
                    placeholder="e.g., 48 Spring St, New York, NY 10012"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Brand Story Narrative</label>
                  <input
                    type="text"
                    placeholder="e.g., Rooted in Yokohama traditions and brought to Soho..."
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                  <Layout className="w-7 h-7 text-[#F15A24]" />
                  Brand Design & Contact
                </h2>
                <p className="text-xs text-slate-400 font-bold font-sans mt-2">
                  Pick a website generator template and configure your visual media assets.
                </p>
              </div>

              {/* Template layout selectors */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Select Engine layout template</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['bento', 'minimalist', 'cyberpunk', 'elegant'] as RestaurantLayout[]).map((lay) => (
                    <div
                      key={lay}
                      onClick={() => setLayout(lay)}
                      className={`p-4 rounded-2xl border text-center cursor-pointer transition-all select-none capitalize flex flex-col items-center justify-center space-y-2 ${
                        layout === lay 
                          ? 'border-[#F15A24] bg-orange-50/20 text-[#F15A24] shadow-xs' 
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-350 text-slate-600'
                      }`}
                    >
                      <Layout className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-black tracking-tight">{lay}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Hero Image URL</label>
                  <input
                    type="text"
                    value={heroImage}
                    onChange={(e) => setHeroImage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Logo Image URL</label>
                  <input
                    type="text"
                    value={logoImage}
                    onChange={(e) => setLogoImage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Chef details */}
              <div className="p-5 border border-slate-100 rounded-[1.8rem] bg-slate-50/40 space-y-4">
                <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  <ChefHat className="w-4 h-4 text-[#F15A24]" />
                  <span>Chef Spotlight Configuration</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Chef Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Chef Kenji Takahashi"
                      value={chefName}
                      onChange={(e) => setChefName(e.target.value)}
                      className="w-full bg-white border border-slate-105 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Chef Image URL</label>
                    <input
                      type="text"
                      value={chefImage}
                      onChange={(e) => setChefImage(e.target.value)}
                      className="w-full bg-white border border-slate-105 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black tracking-wider text-slate-400">Chef Bio</label>
                  <input
                    type="text"
                    placeholder="e.g., Studied broth chemistry in Tokyo before perfecting his craft..."
                    value={chefBio}
                    onChange={(e) => setChefBio(e.target.value)}
                    className="w-full bg-white border border-slate-105 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all"
                  />
                </div>
              </div>

              {/* Social Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram Handle
                  </label>
                  <input
                    type="text"
                    placeholder="neotokyo_ramen"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook Page
                  </label>
                  <input
                    type="text"
                    placeholder="neotokyo"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (212) 555-0100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-[#F15A24] animate-pulse" />
                  Culinary Menu Creator
                </h2>
                <p className="text-xs text-slate-400 font-bold font-sans mt-2">
                  Instantly design a custom menu manually or use our **Gemini AI Menu generator**!
                </p>
              </div>

              {/* AI generator panel */}
              <div className="p-6 border border-[#FFECE4] rounded-[2.2rem] bg-gradient-to-br from-white to-[#FFFAF9] space-y-4">
                <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-[#F15A24] tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#F15A24]" />
                  <span>AI menu generator powered by Gemini</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Describe your dishes, e.g. High-end ramen with black truffle oil and Wagyu beef toppings..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={generatingMenu}
                    className="flex-1 bg-white border border-slate-105 rounded-2xl p-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAiMenuGenerate}
                    disabled={generatingMenu || !aiPrompt.trim()}
                    className="w-full sm:w-auto py-4 px-6 bg-[#F15A24] hover:bg-[#E04D1B] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-2 cursor-pointer shadow-md transition-all shrink-0 active:scale-98"
                  >
                    {generatingMenu ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Generate Dishes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Menu items listing */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 select-none">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Dish Listings ({menuItems.length})</h3>
                  <button
                    type="button"
                    onClick={handleManualAddItem}
                    className="text-xs text-[#F15A24] hover:text-[#E04D1B] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-none">
                  {menuItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      Zero items in menu. Input a prompt above to generate with AI or add manually.
                    </div>
                  ) : (
                    menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 text-left w-full"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-150 shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                            placeholder="Dish Name"
                            className="sm:col-span-5 bg-white border border-slate-105 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleUpdateItemField(item.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                            className="sm:col-span-2 bg-white border border-slate-105 rounded-xl p-2.5 text-xs font-mono font-semibold focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => handleUpdateItemField(item.id, 'category', e.target.value)}
                            placeholder="Category"
                            className="sm:col-span-3 bg-white border border-slate-105 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                          />
                          <div className="sm:col-span-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action bottom toolbar buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8 shrink-0 select-none">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="py-3 px-6 bg-slate-50 hover:bg-slate-100 border border-slate-205/60 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!name || !category || !description)}
                className="py-3.5 px-6 bg-[#111827] hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ml-auto"
              >
                Next <ArrowRight className="w-4 h-4 text-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegisterSubmit}
                disabled={registerMutation.isPending}
                className="py-3.5 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-98 ml-auto"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Compiling Engine...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Compile & Publish</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
