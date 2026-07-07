import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import ProductPreviewRenderer from '../components/ProductPreviewRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Clock, History, Save, Sparkles, X, Edit2, Trash2, ArrowRight
} from 'lucide-react';

function getFoodImage(name) {
  if (!name) return '/assets/hamburger_1.png';
  const n = name.toLowerCase();
  if (n.includes('alpha') || n.includes('wolf')) return '/assets/hamburger_1.png';
  if (n.includes('ramen') || n.includes('bowl')) return '/assets/hamburger_4.png';
  if (n.includes('pizza') || n.includes('margherita')) return '/assets/hamburger_3.png';
  if (n.includes('fries') || n.includes('loaded')) return '/assets/hamburger_2.png';
  if (n.includes('combo') || n.includes('meal')) return '/assets/hamburger_details.png';
  if (n.includes('coke') || n.includes('cola') || n.includes('drink') || n.includes('lemonade')) return '/assets/hamburger_2.png';
  return '/assets/hamburger_1.png';
}

export default function MenuManagement() {
  const {
    menuCategories, menuItems, modifierGroups, ingredients,
    isDraftDirty, menuVersions, activeVersion, publishedAt,
    addCategory, deleteCategory, addMenuProduct, updateMenuProduct, deleteMenuProduct,
    toggleItemAvailability, publishMenu, rollbackVersion,
    addModifierGroup, updateModifierGroup, addSize, updateSize, deleteSize, setDefaultSize
  } = useRestaurantStore();

  const [activeCategory, setActiveCategory] = useState(menuCategories[0] || 'Burgers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);
  
  const [isImportOpen, setImportOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [editorTab, setEditorTab] = useState('profile');

  // Form states for Modifiers and Ingredients editing
  const [newGroupForm, setNewGroupForm] = useState({ name: '', isRequired: false, min: 1, max: 1 });
  const [newOptionForm, setNewOptionForm] = useState({ name: '', price: 0.0 });
  const [addingOptionGroupId, setAddingOptionGroupId] = useState(null);
  const [newIngForm, setNewIngForm] = useState({ ingredientId: '', extraPrice: 0.0, defaultQuantity: 1, removable: true });
const [newSizeForm, setNewSizeForm] = useState({ name: '', price: 0, prepMins: 0, available: true, isDefault: false });
  const [customIngName, setCustomIngName] = useState('');

  // Modifiers Actions
  const handleLinkModifierGroup = (groupId) => {
    if (!activeProduct) return;
    const updatedIds = [...(activeProduct.modifierGroupIds || [])];
    if (!updatedIds.includes(groupId)) {
      updatedIds.push(groupId);
      handleProductUpdate('modifierGroupIds', updatedIds);
    }
  };

  const handleUnlinkModifierGroup = (groupId) => {
    if (!activeProduct) return;
    const updatedIds = (activeProduct.modifierGroupIds || []).filter(id => id !== groupId);
    handleProductUpdate('modifierGroupIds', updatedIds);
  };

  const handleCreateModifierGroup = () => {
    if (!newGroupForm.name.trim() || !activeProduct) return;
    const newGroupId = 'g_' + Date.now();
    const newGroup = {
      id: newGroupId,
      name: newGroupForm.name,
      minSelections: parseInt(newGroupForm.min) || 0,
      maxSelections: parseInt(newGroupForm.max) || 1,
      isRequired: newGroupForm.isRequired,
      options: []
    };
    addModifierGroup(newGroup);
    
    const updatedIds = [...(activeProduct.modifierGroupIds || []), newGroupId];
    handleProductUpdate('modifierGroupIds', updatedIds);
    setNewGroupForm({ name: '', isRequired: false, min: 1, max: 1 });
  };

  const handleAddOptionToGroup = (groupId) => {
    if (!newOptionForm.name.trim()) return;
    const group = modifierGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const newOption = {
      id: 'o_' + Date.now(),
      name: newOptionForm.name,
      price: parseFloat(newOptionForm.price) || 0.0,
      calories: 50,
      available: true,
      isDefault: false
    };
    const updatedOptions = [...(group.options || []), newOption];
    updateModifierGroup(groupId, { options: updatedOptions });
    setNewOptionForm({ name: '', price: 0.0 });
    setAddingOptionGroupId(null);
  };

  const handleDeleteOptionFromGroup = (groupId, optionId) => {
    const group = modifierGroups.find(g => g.id === groupId);
    if (!group) return;
    const updatedOptions = (group.options || []).filter(o => o.id !== optionId);
    updateModifierGroup(groupId, { options: updatedOptions });
  };

  // Ingredients Actions
  const handleLinkIngredient = () => {
    if (!newIngForm.ingredientId || !activeProduct) return;
    const exists = (activeProduct.ingredients || []).some(i => i.ingredientId === newIngForm.ingredientId);
    if (exists) return;

    const newLink = {
      ingredientId: newIngForm.ingredientId,
      removable: newIngForm.removable,
      extraPrice: parseFloat(newIngForm.extraPrice) || 0.0,
      defaultQuantity: parseInt(newIngForm.defaultQuantity) || 1
    };
    const updatedIngredients = [...(activeProduct.ingredients || []), newLink];
    handleProductUpdate('ingredients', updatedIngredients);
    setNewIngForm({ ingredientId: '', extraPrice: 0.0, defaultQuantity: 1, removable: true });
  };

  const handleCreateCustomIngredient = () => {
    if (!customIngName.trim() || !activeProduct) return;
    const newIngId = 'i_' + Date.now();
    const newMasterIng = {
      id: newIngId,
      name: customIngName.trim(),
      allergens: [],
      calories: 80,
      dietaryTags: [],
      inStock: true
    };
    useRestaurantStore.setState(s => ({
      ingredients: [...s.ingredients, newMasterIng]
    }));

    const newLink = {
      ingredientId: newIngId,
      removable: true,
      extraPrice: 1.0,
      defaultQuantity: 1
    };
    const updatedIngredients = [...(activeProduct.ingredients || []), newLink];
    handleProductUpdate('ingredients', updatedIngredients);
    setCustomIngName('');
  };

  const handleUnlinkIngredient = (ingId) => {
    if (!activeProduct) return;
    const updatedIngredients = (activeProduct.ingredients || []).filter(i => i.ingredientId !== ingId);
    handleProductUpdate('ingredients', updatedIngredients);
  };

  const handleUpdateLinkedIngredient = (ingId, field, value) => {
    if (!activeProduct) return;
    const updatedIngredients = (activeProduct.ingredients || []).map(i => {
      if (i.ingredientId === ingId) {
        return { ...i, [field]: value };
      }
      return i;
    });
    handleProductUpdate('ingredients', updatedIngredients);
  };

  useEffect(() => {
    if (!menuCategories.includes(activeCategory) && menuCategories.length > 0) {
      setActiveCategory(menuCategories[0]);
    }
  }, [menuCategories]);

  const activeProduct = useMemo(() => {
    return menuItems.find(i => i.id === selectedProductId) || null;
  }, [menuItems, selectedProductId]);

  const filteredProducts = useMemo(() => {
    let list = menuItems.filter(item => item.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
    }
    return list;
  }, [menuItems, activeCategory, searchQuery]);

  const handleProductUpdate = (field, value) => {
    if (!selectedProductId) return;
    updateMenuProduct(selectedProductId, { [field]: value });
  };

  const createNewProductPlaceholder = () => {
    const tempId = 'm' + Date.now();
    addMenuProduct({
      id: tempId, name: 'New Item', category: activeCategory, price: 9.99, calories: 350,
      prepMins: 10, available: true, allergens: [], image: '🍔',
      description: 'Describe this amazing dish...', seoSlug: 'new-item',
      dietaryTags: [], pairings: [], ingredients: [], modifierGroupIds: []
    });
    setSelectedProductId(tempId);
  };

  return (
    <div className="w-full h-full text-[var(--text-primary)] bg-[var(--bg-app)] relative overflow-hidden flex flex-col transition-colors duration-300">
      
      {/* Background Ambient Glow */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent-yellow)] opacity-5 blur-[150px] pointer-events-none" />

      {/* ── BIG NAVBAR (Header & Categories) ── */}
      <div className="pt-12 px-12 pb-6 shrink-0 z-10 relative">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2 font-poppins">Menu System</h1>
            <div className="flex items-center gap-3 font-poppins">
              <span className="text-[13px] font-bold px-3 py-1 rounded-full bg-[var(--bg-card-hover)] text-[var(--text-primary)]">
                v{activeVersion}
              </span>
              {isDraftDirty ? (
                <span className="text-[13px] px-3 py-1 rounded-full font-bold bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] flex items-center gap-2 animate-pulse">
                  Draft Pending
                </span>
              ) : (
                <span className="text-[13px] px-3 py-1 rounded-full font-bold bg-[var(--bg-card-hover)] text-[var(--text-secondary)]">
                  Published Live
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 font-poppins">
            <button
              onClick={() => setHistoryOpen(true)}
              className="px-6 py-3 rounded-full border-none bg-[var(--bg-card)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <History size={16} className="inline mr-2" /> History
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="px-6 py-3 rounded-full border-none bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-sm font-bold hover:bg-[var(--accent-yellow)]/20 transition-colors"
            >
              <Sparkles size={16} className="inline mr-2" /> Import
            </button>
            {isDraftDirty && (
              <button
                onClick={() => publishMenu('Update')}
                className="px-8 py-3 rounded-full bg-[var(--accent-yellow)] text-black text-sm font-extrabold hover:brightness-110 transition-all shadow-none"
              >
                <Save size={16} className="inline mr-2" /> Publish Now
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Category Nav */}
        <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {menuCategories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
              className={`px-8 py-4 rounded-full text-lg font-bold whitespace-nowrap transition-all border-none ${
                activeCategory === cat 
                  ? 'bg-[var(--accent-yellow)] text-black font-poppins shadow-none' 
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-poppins'
              }`}
            >
              {cat}
            </button>
          ))}
          {isAddingCategory ? (
            <form onSubmit={e => { e.preventDefault(); if (newCategoryName.trim()) { addCategory(newCategoryName.trim()); setActiveCategory(newCategoryName.trim()); setIsAddingCategory(false); } }} className="flex">
              <input type="text" autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category" className="px-6 py-4 rounded-full bg-[var(--bg-card)] border-none text-[var(--text-primary)] outline-none w-48 font-poppins" />
            </form>
          ) : (
            <button onClick={() => setIsAddingCategory(true)} className="px-6 py-4 rounded-full border border-dashed border-[var(--text-secondary)]/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors whitespace-nowrap flex items-center gap-2 font-poppins">
              <Plus size={18} /> Add
            </button>
          )}
        </div>
      </div>

      {/* ── CLEAN SPACE (Item Grid) ── */}
      <div className="flex-1 px-12 pb-12 overflow-y-auto z-10 relative">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96 font-poppins">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder={`Search ${activeCategory}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-card)] border-none rounded-full py-4 pl-14 pr-6 text-[var(--text-primary)] outline-none focus:bg-[var(--bg-card-hover)] transition-colors text-sm"
            />
          </div>
          <button
            onClick={createNewProductPlaceholder}
            className="w-14 h-14 rounded-full bg-[var(--accent-yellow)] text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Customer App Style Horizontal Item Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProducts.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.id}
                onClick={() => setSelectedProductId(item.id)}
                className="bg-[var(--bg-card)] rounded-[26px] p-4 hover:bg-[var(--bg-card-hover)] flex gap-4 group transition-all duration-300 cursor-pointer active:scale-[0.99] relative border-none"
              >
                {/* Left side: Circular Figma Food Image container with local Out of Stock overlay */}
                <div className="w-[110px] h-[110px] bg-[var(--bg-card-hover)] rounded-[20px] overflow-hidden flex items-center justify-center shrink-0 p-1 relative z-0">
                  <img src={getFoodImage(item.name)} alt={item.name} className="max-h-[95px] max-w-[95px] object-contain group-hover:scale-105 transition-transform duration-300" />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/75 flex items-center justify-center backdrop-blur-xs rounded-[20px]">
                      <span className="text-[13px] font-extrabold text-[var(--accent-red)] uppercase tracking-wider font-poppins">Out of Stock</span>
                    </div>
                  )}
                </div>
                
                {/* Right side: details */}
                <div className={`text-left flex-1 flex flex-col justify-between min-w-0 font-poppins transition-opacity duration-300 ${item.available ? 'opacity-100' : 'opacity-60'}`}>
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-poppins font-bold text-[15.5px] text-[var(--text-primary)] group-hover:text-[var(--accent-red)] transition-colors truncate pr-1">
                        {item.name}
                      </h4>
                      
                      {/* Availability Toggle and Edit Button */}
                      <div className="flex items-center gap-2 shrink-0 z-20">
                        {/* Toggle switch for inventory availability */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleItemAvailability(item.id); }}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${item.available ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card-hover)]'}`}
                          title={item.available ? "Mark Out of Stock" : "Mark Available"}
                        >
                          <motion.div 
                            layout 
                            className="w-4.5 h-4.5 bg-white rounded-full shadow" 
                            style={{ marginLeft: item.available ? 'auto' : '0' }}
                          />
                        </button>
                        <button className="w-6 h-6 rounded-full bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] flex items-center justify-center transition-all shadow-sm">
                          <Edit2 size={10} />
                        </button>
                      </div>
                    </div>
                    <p className="font-roboto text-[13px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-transparent">
                    <span className="font-poppins font-black text-[15px] text-[var(--accent-red)] font-bold">
                      ${item.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-roboto font-bold text-[13px]">
                      <span className="text-[var(--accent-yellow)]">★</span>
                      <span className="text-[var(--text-primary)]">{item.rating || '4.8'}</span>
                      <span>• {item.prepMins}m</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── IMMERSIVE EDITOR MODAL ── */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="w-full max-w-7xl h-full max-h-[90vh] bg-[var(--bg-card)] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border-none"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-8 bg-[var(--bg-card-hover)] border-none">
                <h2 className="text-2xl font-extrabold text-[var(--text-primary)] font-poppins">{activeProduct.name}</h2>
                <button 
                  onClick={() => setSelectedProductId(null)}
                  className="w-12 h-12 rounded-full bg-[var(--bg-card)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <X size={20} className="text-[var(--text-primary)]" />
                </button>
              </div>

              {/* Modal Body: Split Layout (Editor | Preview) */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Editor Forms */}
                <div className="w-1/2 overflow-y-auto p-12 border-r border-transparent">
                  <div className="flex space-x-8 border-none mb-8 pb-4">
                    {['profile', 'modifiers', 'ingredients', 'sizes'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setEditorTab(tab)}
                        className={`text-lg font-bold transition-colors pb-2 ${editorTab === tab ? 'text-[var(--accent-yellow)] border-b-2 border-[var(--accent-yellow)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {editorTab === 'profile' && (
                    <div className="space-y-8 text-left">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Item Title</label>
                        <input type="text" value={activeProduct.name} onChange={e => handleProductUpdate('name', e.target.value)} className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-4 text-[var(--text-primary)] text-lg focus:ring-1 focus:ring-[var(--accent-yellow)] outline-none font-poppins" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Price ($)</label>
                          <input type="number" value={activeProduct.price} onChange={e => handleProductUpdate('price', parseFloat(e.target.value)||0)} className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-4 text-[var(--text-primary)] text-lg focus:ring-1 focus:ring-[var(--accent-yellow)] outline-none font-bold font-poppins" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Prep Time (Mins)</label>
                          <input type="number" value={activeProduct.prepMins} onChange={e => handleProductUpdate('prepMins', parseInt(e.target.value)||0)} className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-4 text-[var(--text-primary)] text-lg focus:ring-1 focus:ring-[var(--accent-yellow)] outline-none font-bold font-poppins" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Category</label>
                          <select 
                            value={activeProduct.category} 
                            onChange={e => handleProductUpdate('category', e.target.value)}
                            className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-4 text-[var(--text-primary)] text-sm outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] font-poppins"
                          >
                            {menuCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Dietary Category</label>
                          <div className="flex flex-wrap gap-2">
                            {['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Healthy', 'Spicy'].map(tag => {
                              const hasTag = (activeProduct.dietaryTags || []).includes(tag.toLowerCase());
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    const currentTags = activeProduct.dietaryTags || [];
                                    const newTags = hasTag
                                      ? currentTags.filter(t => t !== tag.toLowerCase())
                                      : [...currentTags, tag.toLowerCase()];
                                    handleProductUpdate('dietaryTags', newTags);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer ${
                                    hasTag 
                                      ? 'bg-[var(--accent-yellow)] text-black font-poppins font-bold'
                                      : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 font-poppins">Description</label>
                        <textarea rows={4} value={activeProduct.description} onChange={e => handleProductUpdate('description', e.target.value)} className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-4 text-[var(--text-primary)] text-lg focus:ring-1 focus:ring-[var(--accent-yellow)] outline-none resize-none font-poppins" />
                      </div>

                      <div className="flex items-center justify-between p-6 rounded-2xl bg-[var(--bg-card-hover)] border-none font-poppins">
                        <span className="text-lg font-bold text-[var(--text-primary)]">Available to Order</span>
                        <button onClick={() => toggleItemAvailability(activeProduct.id)} className={`w-14 h-8 rounded-full p-1 transition-colors ${activeProduct.available ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}>
                          <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-md" style={{ marginLeft: activeProduct.available ? 'auto' : '0' }} />
                        </button>
                      </div>
                    </div>
                  )}

                  {editorTab === 'modifiers' && (
                    <div className="space-y-8 font-poppins text-left">
                      {/* Linked Groups */}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Linked Addons & Options</h4>
                        <div className="space-y-4">
                          {(activeProduct.modifierGroupIds || []).map(groupId => {
                            const group = modifierGroups.find(g => g.id === groupId);
                            if (!group) return null;
                            return (
                              <div key={groupId} className="bg-[var(--bg-card-hover)] p-5 rounded-2xl relative">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h5 className="font-bold text-[var(--text-primary)] text-lg">{group.name}</h5>
                                    <span className="text-[13px] text-[var(--text-secondary)] uppercase">
                                      {group.isRequired ? 'Required' : 'Optional'} • Min: {group.minSelections} • Max: {group.maxSelections}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => handleUnlinkModifierGroup(groupId)}
                                    className="text-[13px] text-[var(--accent-red)] hover:underline border-none bg-transparent cursor-pointer font-bold"
                                  >
                                    Unlink
                                  </button>
                                </div>

                                {/* Options List */}
                                <div className="space-y-2 mt-3 pl-3 border-l-2 border-[var(--accent-yellow)]/30">
                                  {(group.options || []).map(opt => (
                                    <div key={opt.id} className="flex justify-between items-center text-sm py-1.5 border-b border-[var(--text-secondary)]/10">
                                      <span className="text-[var(--text-primary)]">{opt.name}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-[var(--accent-yellow)]">${opt.price.toFixed(2)}</span>
                                        <button 
                                          onClick={() => handleDeleteOptionFromGroup(groupId, opt.id)}
                                          className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent-red)] border-none bg-transparent cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Add Option Form */}
                                  {addingOptionGroupId === groupId ? (
                                    <div className="flex items-center gap-2 mt-4">
                                      <input 
                                        type="text" 
                                        placeholder="Option Name" 
                                        value={newOptionForm.name}
                                        onChange={e => setNewOptionForm(s => ({ ...s, name: e.target.value }))}
                                        className="flex-1 bg-[var(--bg-card)] border-none text-[13px] rounded-lg p-2 text-[var(--text-primary)] outline-none"
                                      />
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="Price ($)" 
                                        value={newOptionForm.price}
                                        onChange={e => setNewOptionForm(s => ({ ...s, price: e.target.value }))}
                                        className="w-20 bg-[var(--bg-card)] border-none text-[13px] rounded-lg p-2 text-[var(--text-primary)] outline-none font-bold"
                                      />
                                      <button 
                                        onClick={() => handleAddOptionToGroup(groupId)}
                                        className="bg-[var(--accent-yellow)] text-black text-[13px] font-bold px-3 py-2 rounded-lg border-none"
                                      >
                                        Add
                                      </button>
                                      <button 
                                        onClick={() => setAddingOptionGroupId(null)}
                                        className="bg-[var(--bg-card)] text-[var(--text-primary)] text-[13px] font-bold px-3 py-2 rounded-lg border-none"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => { setAddingOptionGroupId(groupId); setNewOptionForm({ name: '', price: 0.0 }); }}
                                      className="text-[13px] text-[var(--accent-yellow)] hover:underline mt-2 border-none bg-transparent cursor-pointer font-bold block"
                                    >
                                      + Add Option
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Link Existing Modifier Group */}
                      <div className="border-t border-[var(--text-secondary)]/10 pt-6">
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Link Existing Addon Group</h4>
                        <div className="flex flex-wrap gap-2">
                          {modifierGroups
                            .filter(g => !(activeProduct.modifierGroupIds || []).includes(g.id))
                            .map(g => (
                              <button
                                key={g.id}
                                onClick={() => handleLinkModifierGroup(g.id)}
                                className="bg-[var(--bg-card-hover)] hover:bg-[var(--accent-yellow)] hover:text-black text-[var(--text-primary)] text-[13px] font-semibold px-4 py-2.5 rounded-full border-none transition-colors"
                              >
                                + {g.name}
                              </button>
                            ))}
                          {modifierGroups.filter(g => !(activeProduct.modifierGroupIds || []).includes(g.id)).length === 0 && (
                            <span className="text-[13px] text-[var(--text-secondary)]">All existing groups linked.</span>
                          )}
                        </div>
                      </div>

                      {/* Create New Modifier Group */}
                      <div className="border-t border-[var(--text-secondary)]/10 pt-6">
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Create New Addon/Side Group</h4>
                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-2xl space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">Group Name</label>
                              <input 
                                type="text"
                                placeholder="e.g. Choose Sauce"
                                value={newGroupForm.name}
                                onChange={e => setNewGroupForm(s => ({ ...s, name: e.target.value }))}
                                className="w-full bg-[var(--bg-card)] border-none rounded-xl p-3 text-[var(--text-primary)] text-[13px] outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between mt-5">
                              <span className="text-[13px] font-bold text-[var(--text-primary)]">Required</span>
                              <button 
                                onClick={() => setNewGroupForm(s => ({ ...s, isRequired: !s.isRequired }))}
                                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${newGroupForm.isRequired ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}
                              >
                                <div className="w-5 h-5 bg-white rounded-full shadow" style={{ marginLeft: newGroupForm.isRequired ? 'auto' : '0' }} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">Min Selections</label>
                              <input 
                                type="number"
                                value={newGroupForm.min}
                                onChange={e => setNewGroupForm(s => ({ ...s, min: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-[var(--bg-card)] border-none rounded-xl p-3 text-[var(--text-primary)] text-[13px] outline-none font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] text-[var(--text-secondary)] mb-1">Max Selections</label>
                              <input 
                                type="number"
                                value={newGroupForm.max}
                                onChange={e => setNewGroupForm(s => ({ ...s, max: parseInt(e.target.value) || 1 }))}
                                className="w-full bg-[var(--bg-card)] border-none rounded-xl p-3 text-[var(--text-primary)] text-[13px] outline-none font-bold"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={handleCreateModifierGroup}
                            className="bg-[var(--accent-yellow)] text-black text-[13px] font-bold px-6 py-3 rounded-xl border-none hover:scale-102 transition-transform"
                          >
                            Create & Link Group
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {editorTab === 'ingredients' && (
                    <div className="space-y-8 font-poppins text-left">
                      {/* Linked Ingredients */}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Current Ingredients</h4>
                        <div className="space-y-3">
                          {(activeProduct.ingredients || []).map(pi => {
                            const ing = ingredients.find(i => i.id === pi.ingredientId);
                            if (!ing) return null;
                            return (
                              <div key={pi.ingredientId} className="bg-[var(--bg-card-hover)] p-4 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <span className="font-bold text-[var(--text-primary)] text-sm">{ing.name}</span>
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-secondary)]">Extra price:</span>
                                      <input 
                                        type="number"
                                        step="0.1"
                                        value={pi.extraPrice}
                                        onChange={e => handleUpdateLinkedIngredient(pi.ingredientId, 'extraPrice', parseFloat(e.target.value) || 0.0)}
                                        className="w-16 bg-[var(--bg-card)] border-none rounded-md px-2 py-0.5 text-[var(--text-primary)] outline-none text-center font-bold"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-secondary)]">Qty:</span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleUpdateLinkedIngredient(pi.ingredientId, 'defaultQuantity', Math.max(1, pi.defaultQuantity - 1))}
                                          className="w-6 h-6 bg-[var(--bg-card)] text-[var(--text-primary)] border-none rounded-md"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-bold">{pi.defaultQuantity}</span>
                                        <button 
                                          onClick={() => handleUpdateLinkedIngredient(pi.ingredientId, 'defaultQuantity', pi.defaultQuantity + 1)}
                                          className="w-6 h-6 bg-[var(--bg-card)] text-[var(--text-primary)] border-none rounded-md"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-[var(--text-secondary)]">Removable:</span>
                                      <button 
                                        onClick={() => handleUpdateLinkedIngredient(pi.ingredientId, 'removable', !pi.removable)}
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${pi.removable ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}
                                      >
                                        <div className="w-4 h-4 bg-white rounded-full shadow" style={{ marginLeft: pi.removable ? 'auto' : '0' }} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleUnlinkIngredient(pi.ingredientId)}
                                  className="text-xs text-[var(--accent-red)] hover:underline border-none bg-transparent cursor-pointer font-bold shrink-0"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                          {(activeProduct.ingredients || []).length === 0 && (
                            <span className="text-xs text-[var(--text-secondary)] block">No ingredients defined for this item yet.</span>
                          )}
                        </div>
                      </div>

                      {/* Link Existing Ingredients */}
                      <div className="border-t border-[var(--text-secondary)]/10 pt-6">
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Link Master Ingredient</h4>
                        <div className="flex gap-2">
                          <select 
                            value={newIngForm.ingredientId}
                            onChange={e => setNewIngForm(s => ({ ...s, ingredientId: e.target.value }))}
                            className="bg-[var(--bg-card-hover)] border-none rounded-xl p-3 text-[var(--text-primary)] text-xs outline-none flex-1 font-poppins"
                          >
                            <option value="">Select ingredient...</option>
                            {ingredients
                              .filter(i => !(activeProduct.ingredients || []).some(pi => pi.ingredientId === i.id))
                              .map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                              ))}
                          </select>
                          <button 
                            onClick={handleLinkIngredient}
                            className="bg-[var(--accent-yellow)] text-black text-xs font-bold px-4 py-3 rounded-xl border-none whitespace-nowrap"
                          >
                            Link
                          </button>
                        </div>
                      </div>

                      {/* Create Custom Ingredient */}
                      <div className="border-t border-[var(--text-secondary)]/10 pt-6">
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Create New Master Ingredient</h4>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="e.g. Avocado Slice"
                            value={customIngName}
                            onChange={e => setCustomIngName(e.target.value)}
                            className="bg-[var(--bg-card-hover)] border-none rounded-xl p-3 text-[var(--text-primary)] text-xs outline-none flex-1 font-poppins"
                          />
                          <button 
                            onClick={handleCreateCustomIngredient}
                            className="bg-[var(--accent-yellow)] text-black text-xs font-bold px-4 py-3 rounded-xl border-none whitespace-nowrap"
                          >
                            Create & Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {editorTab === 'sizes' && (
                    <div className="space-y-8">
                      {/* Header */}
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] font-poppins">Size Variants</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 font-poppins">Add available sizes (S, M, L, XL, etc.) with individual pricing</p>
                      </div>

                      {/* Existing Sizes List */}
                      {(activeProduct.sizes || []).length > 0 && (
                        <div className="space-y-3">
                          {(activeProduct.sizes || []).map(sz => (
                            <div key={sz.id} className="bg-[var(--bg-card-hover)] rounded-2xl p-5 flex items-center justify-between group hover:bg-[var(--bg-card-hover)]/80 transition-all">
                              <div className="flex items-center gap-4">
                                {/* Size badge */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black uppercase font-poppins ${sz.isDefault ? 'bg-[var(--accent-yellow)] text-black shadow-[0_0_15px_rgba(255,184,0,0.3)]' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--text-secondary)]/20'}`}>
                                  {sz.name.length <= 3 ? sz.name : sz.name.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[var(--text-primary)] font-poppins">{sz.name}</span>
                                    {sz.isDefault && (
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] text-[10px] font-bold uppercase tracking-wider font-poppins">Default</span>
                                    )}
                                    {!sz.available && (
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-red)]/20 text-[var(--accent-red)] text-[10px] font-bold uppercase tracking-wider font-poppins">Unavailable</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-[var(--accent-yellow)] font-bold font-poppins">${parseFloat(sz.price || 0).toFixed(2)}</span>
                                    {sz.prepMins > 0 && (
                                      <span className="text-xs text-[var(--text-secondary)] font-poppins flex items-center gap-1">
                                        <Clock size={10} /> +{sz.prepMins} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Toggle availability */}
                                <button
                                  onClick={() => updateSize(activeProduct.id, sz.id, { available: !sz.available })}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border-none transition-colors font-poppins ${sz.available ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'}`}
                                >
                                  {sz.available ? 'Available' : 'Hidden'}
                                </button>
                                {/* Set as default */}
                                {!sz.isDefault && (
                                  <button
                                    onClick={() => setDefaultSize(activeProduct.id, sz.id)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border-none hover:bg-[var(--accent-yellow)]/20 transition-colors font-poppins"
                                  >
                                    Set Default
                                  </button>
                                )}
                                {/* Delete */}
                                <button
                                  onClick={() => deleteSize(activeProduct.id, sz.id)}
                                  className="p-1.5 rounded-lg bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 border-none transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(activeProduct.sizes || []).length === 0 && (
                        <div className="bg-[var(--bg-card-hover)] rounded-2xl p-8 text-center">
                          <p className="text-sm text-[var(--text-secondary)] font-poppins">No sizes added yet. Add sizes below to let customers pick their preferred portion.</p>
                        </div>
                      )}

                      {/* Add New Size Form */}
                      <div className="border-t border-[var(--text-secondary)]/10 pt-6 space-y-5">
                        <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider font-poppins">Add New Size</h4>
                        
                        {/* Quick preset buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {['S', 'M', 'L', 'XL', 'XXL'].map(preset => {
                            const alreadyExists = (activeProduct.sizes || []).some(s => s.name.toUpperCase() === preset);
                            return (
                              <button
                                key={preset}
                                disabled={alreadyExists}
                                onClick={() => setNewSizeForm(f => ({ ...f, name: preset }))}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all font-poppins ${
                                  alreadyExists
                                    ? 'bg-transparent border-[var(--text-secondary)]/10 text-[var(--text-secondary)]/30 cursor-not-allowed'
                                    : newSizeForm.name === preset
                                      ? 'bg-[var(--accent-yellow)] text-black border-[var(--accent-yellow)] shadow-[0_0_10px_rgba(255,184,0,0.3)]'
                                      : 'bg-transparent border-[var(--text-secondary)]/20 text-[var(--text-secondary)] hover:border-[var(--accent-yellow)] hover:text-[var(--accent-yellow)]'
                                }`}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom name input */}
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 font-poppins">Size Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Small, Regular, Family..."
                            value={newSizeForm.name}
                            onChange={e => setNewSizeForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-3 text-[var(--text-primary)] text-sm outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] font-poppins"
                          />
                        </div>

                        {/* Price and Prep Time side by side */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 font-poppins">Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={newSizeForm.price || ''}
                              onChange={e => setNewSizeForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-3 text-[var(--text-primary)] text-sm outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] font-poppins"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 font-poppins">Extra Prep (min)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={newSizeForm.prepMins || ''}
                              onChange={e => setNewSizeForm(f => ({ ...f, prepMins: parseInt(e.target.value) || 0 }))}
                              className="w-full bg-[var(--bg-card-hover)] border-none rounded-xl p-3 text-[var(--text-primary)] text-sm outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] font-poppins"
                            />
                          </div>
                        </div>

                        {/* Available + Default toggles */}
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newSizeForm.available}
                              onChange={e => setNewSizeForm(f => ({ ...f, available: e.target.checked }))}
                              className="accent-[var(--accent-yellow)] w-4 h-4"
                            />
                            <span className="text-xs text-[var(--text-primary)] font-poppins">Available</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newSizeForm.isDefault}
                              onChange={e => setNewSizeForm(f => ({ ...f, isDefault: e.target.checked }))}
                              className="accent-[var(--accent-yellow)] w-4 h-4"
                            />
                            <span className="text-xs text-[var(--text-primary)] font-poppins">Set as Default</span>
                          </label>
                        </div>

                        {/* Add button */}
                        <button
                          onClick={() => {
                            if (!newSizeForm.name.trim()) return;
                            addSize(activeProduct.id, newSizeForm);
                            setNewSizeForm({ name: '', price: 0, prepMins: 0, available: true, isDefault: false });
                          }}
                          disabled={!newSizeForm.name.trim()}
                          className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider border-none transition-all font-poppins flex items-center justify-center gap-2 ${
                            newSizeForm.name.trim()
                              ? 'bg-[var(--accent-yellow)] text-black hover:shadow-[0_0_20px_rgba(255,184,0,0.3)] cursor-pointer'
                              : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)]/40 cursor-not-allowed'
                          }`}
                        >
                          <Plus size={14} />
                          Add Size "{newSizeForm.name || '...'}"
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Live Preview */}
                <div className="w-1/2 bg-[var(--bg-app)] flex flex-col items-center justify-center p-12 relative border-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-yellow)]/5 to-transparent pointer-events-none" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/50 mb-8 absolute top-12 font-poppins">Customer App Live Preview</h3>
                  <div className="scale-110 shadow-2xl rounded-[3rem] overflow-hidden border-8 border-[var(--bg-card-hover)]">
                     <ProductPreviewRenderer product={activeProduct} />
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
