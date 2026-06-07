import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useCartStore } from '../store/useCartStore';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Flame, Sparkles, Check, Info, ShoppingBag } from 'lucide-react';

export default function ProductPreviewRenderer({ product }) {
  const { modifierGroups, conditionalModifiers, ingredients } = useRestaurantStore();
  const { addToCart } = useCartStore();
  const navigate = useNavigate();
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [totalPrice, setTotalPrice] = useState(product?.price || 0);

  // Reset selections when product changes
  useEffect(() => {
    if (!product) return;
    const defaults = {};
    
    // Auto-select defaults
    product.modifierGroupIds?.forEach(groupId => {
      const group = modifierGroups.find(g => g.id === groupId);
      if (group) {
        if (group.minSelections === 1 && group.maxSelections === 1) {
          const defaultOpt = group.options.find(o => o.isDefault);
          if (defaultOpt) {
            defaults[group.id] = [defaultOpt.id];
          }
        }
      }
    });

    setSelectedModifiers(defaults);
    setRemovedIngredients([]);
    setTotalPrice(product.price);
  }, [product, modifierGroups]);

  // Recalculate price in real-time
  useEffect(() => {
    if (!product) return;
    let base = product.price;

    // Sum active modifiers
    Object.keys(selectedModifiers).forEach(groupId => {
      const group = modifierGroups.find(g => g.id === groupId);
      if (!group) return;

      selectedModifiers[groupId].forEach(optId => {
        const option = group.options.find(o => o.id === optId);
        if (option) {
          base += option.price;
        }

        // Apply conditional modifiers surcharge if parentOption selected
        conditionalModifiers.forEach(rule => {
          if (rule.parentOptionId === optId) {
            // If the triggered nested modifier group also has active options, apply price modifier surcharge
            const activeOptions = selectedModifiers[rule.childModifierGroupId] || [];
            base += activeOptions.length * rule.priceModifier;
          }
        });
      });
    });

    // Sum extra ingredients prices
    product.ingredients?.forEach(ing => {
      const isRemoved = removedIngredients.includes(ing.ingredientId);
      if (!isRemoved && ing.defaultQuantity > 1) {
        base += ing.extraPrice * (ing.defaultQuantity - 1);
      }
    });

    setTotalPrice(base);
  }, [selectedModifiers, removedIngredients, product, modifierGroups, conditionalModifiers]);

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 border border-dashed rounded-[2.5rem] bg-neutral-50">
        <Info size={32} strokeWidth={1.5} className="mb-2" />
        <p className="text-xs font-semibold text-center leading-normal">
          Select an item from your catalog to view the customer app simulation
        </p>
      </div>
    );
  }

  // Handle modifier selections
  const handleModifierToggle = (groupId, optionId, min, max) => {
    const current = selectedModifiers[groupId] || [];
    let updated = [...current];

    if (min === 1 && max === 1) {
      updated = [optionId]; // Radio behavior
    } else {
      if (updated.includes(optionId)) {
        updated = updated.filter(id => id !== optionId);
      } else {
        if (updated.length < max) {
          updated.push(optionId);
        }
      }
    }

    setSelectedModifiers(prev => ({
      ...prev,
      [groupId]: updated
    }));
  };

  // Check if conditional modifier group should be visible
  const getVisibleModifierGroups = () => {
    const list = [...(product.modifierGroupIds || [])];

    // Evaluate conditional modifiers
    Object.keys(selectedModifiers).forEach(groupId => {
      selectedModifiers[groupId].forEach(optId => {
        conditionalModifiers.forEach(rule => {
          if (rule.parentOptionId === optId && !list.includes(rule.childModifierGroupId)) {
            list.push(rule.childModifierGroupId); // Mount dependent group dynamically
          }
        });
      });
    });

    return list.map(id => modifierGroups.find(g => g.id === id)).filter(Boolean);
  };

  // Toggle ingredient removal
  const toggleIngredient = (ingId) => {
    if (removedIngredients.includes(ingId)) {
      setRemovedIngredients(prev => prev.filter(id => id !== ingId));
    } else {
      setRemovedIngredients(prev => [...prev, ingId]);
    }
  };

  const visibleGroups = getVisibleModifierGroups();

  return (
    <div 
      className="w-72 h-[560px] rounded-[36px] border-8 border-neutral-900 shadow-2xl flex flex-col overflow-hidden bg-white shrink-0 relative"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Mobile Top Status Bar */}
      <div className="h-6 bg-neutral-900 px-5 flex items-center justify-between text-[9px] font-bold text-white shrink-0 z-10">
        <span>9:41</span>
        <div className="w-16 h-3.5 bg-black rounded-b-md absolute left-1/2 -translate-x-1/2 top-0" />
        <div className="flex gap-1.5">
          <span>5G</span>
          <div className="w-4 h-2 border rounded-sm bg-white" />
        </div>
      </div>

      {/* Mobile Customer View Body */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header Image */}
        <div className="h-32 bg-amber-50 relative flex items-center justify-center overflow-hidden">
          {product.image && (product.image.startsWith('data:') || product.image.startsWith('http') || product.image.startsWith('/') || /\.(png|jpe?g|gif|svg|webp)$/i.test(product.image)) ? (
            <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
          ) : (
            <span className="text-5xl">{product.image || '🍔'}</span>
          )}
          <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black bg-opacity-70 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Clock size={9} /> {product.prepMins}m
          </span>
        </div>

        {/* Product Meta */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-black leading-tight text-neutral-900">{product.name}</h3>
            <span className="mono text-xs font-extrabold text-neutral-800 shrink-0">
              ${product.price.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            {product.description}
          </p>

          <div className="flex gap-2 text-[10px] font-bold">
            <span className="flex items-center gap-0.5 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
              <Flame size={10} fill="currentColor" /> {product.calories} kcal
            </span>
            {product.dietaryTags?.map(tag => (
              <span key={tag} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Ingredients Customizer Removals */}
        {product.ingredients?.length > 0 && (
          <div className="px-4 py-3 border-t border-b border-neutral-100 bg-neutral-50">
            <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2">
              Customize Ingredients
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {product.ingredients.map(pi => {
                const ing = ingredients.find(i => i.id === pi.ingredientId);
                if (!ing) return null;
                const isRemoved = removedIngredients.includes(pi.ingredientId);
                return (
                  <button
                    key={pi.ingredientId}
                    type="button"
                    onClick={() => toggleIngredient(pi.ingredientId)}
                    className="text-[10px] px-2 py-1 rounded-full font-semibold border cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isRemoved ? '#FEF2F2' : '#FFFFFF',
                      borderColor: isRemoved ? '#FCA5A5' : '#E5E7EB',
                      color: isRemoved ? '#DC2626' : '#374151',
                    }}
                  >
                    {isRemoved ? `No ${ing.name}` : ing.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modifier groups list */}
        <div className="p-4 space-y-4">
          {visibleGroups.map(group => {
            const currentSelections = selectedModifiers[group.id] || [];
            const isSatisfied = currentSelections.length >= group.minSelections;
            const parentRule = conditionalModifiers.find(r => r.childModifierGroupId === group.id);
            const parentOption = parentRule ? modifierGroups.flatMap(g => g.options).find(o => o.id === parentRule.parentOptionId) : null;

            return (
              <div 
                key={group.id} 
                className="space-y-2 p-3 rounded-[2.5rem] border border-neutral-100 bg-white"
                style={{
                  boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                  borderLeft: group.isRequired && !isSatisfied ? '3px solid #EF4444' : '1px solid #F3F4F6'
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                      {group.name}
                      {group.isRequired && (
                        <span className="text-red-500 font-extrabold">*</span>
                      )}
                    </h5>
                    {parentOption && (
                      <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                        <Sparkles size={9} /> Dependent on {parentOption.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                    {group.minSelections === 1 && group.maxSelections === 1 ? 'Select 1' : `Max ${group.maxSelections}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.options.map(opt => {
                    const isChecked = currentSelections.includes(opt.id);
                    const isRadio = group.minSelections === 1 && group.maxSelections === 1;
                    
                    // Add conditional price calculations
                    let priceOffset = opt.price;
                    if (parentRule && currentSelections.includes(opt.id)) {
                      priceOffset += parentRule.priceModifier;
                    }

                    return (
                      <label 
                        key={opt.id} 
                        className="flex items-center justify-between py-1.5 px-2 rounded-2xl cursor-pointer hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type={isRadio ? "radio" : "checkbox"}
                            name={group.id}
                            checked={isChecked}
                            onChange={() => handleModifierToggle(group.id, opt.id, group.minSelections, group.maxSelections)}
                            className="text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] text-neutral-700 font-medium">
                            {opt.name}
                          </span>
                        </div>
                        <span className="mono text-[10px] font-extrabold text-neutral-500">
                          {priceOffset > 0 ? `+$${priceOffset.toFixed(2)}` : 'Free'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Add to Cart Simulator Button */}
      <div 
        className="absolute bottom-0 inset-x-0 p-4 border-t bg-white bg-opacity-90 backdrop-blur-sm z-15 flex flex-col gap-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => {
            // Validate required groups
            const unsatisfied = visibleGroups.filter(g => {
              const selected = selectedModifiers[g.id] || [];
              return g.isRequired && selected.length < g.minSelections;
            });

            if (unsatisfied.length > 0) {
              alert(`Please complete required modifier selections: ${unsatisfied.map(g => g.name).join(', ')}`);
              return;
            }

            // Map selected options into detailed modifiers
            const structuredModifiers = {};
            Object.entries(selectedModifiers).forEach(([groupId, optionIds]) => {
              const group = modifierGroups.find(g => g.id === groupId);
              if (group) {
                structuredModifiers[groupId] = optionIds.map(optId => {
                   const opt = group.options.find(o => o.id === optId);
                   return { id: opt.id, name: opt.name, price: opt.price };
                });
              }
            });

            const removedIngData = removedIngredients.map(ingId => {
              const ing = ingredients.find(i => i.id === ingId);
              return { id: ing.id, name: ing.name };
            });

            addToCart({
              productId: product.id,
              name: product.name,
              basePrice: product.price,
              image: product.image,
              category: product.category,
              quantity: 1,
              selectedModifiers: structuredModifiers,
              removedIngredients: removedIngData
            });

            navigate('/checkout');
          }}
          className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[2.5rem] text-xs font-bold flex items-center justify-between px-4 transition-colors cursor-pointer"
        >
          <span>Add to Cart & Checkout</span>
          <span className="mono font-black text-sm">${totalPrice.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}
