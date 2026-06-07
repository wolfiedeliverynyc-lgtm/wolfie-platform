'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MapPin, 
  CreditCard, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  User, 
  Check, 
  Award,
  Globe
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useRealtimeStore } from '../../../stores/useRealtimeStore';

export default function ProfileDashboard() {
  const { 
    userEmail, 
    addresses, 
    paymentMethods, 
    addAddress, 
    deleteAddress, 
    setDefaultAddress,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod
  } = useAuthStore();

  const { addNotification } = useRealtimeStore();

  // Address Inputs
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home 🏠');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('New York');
  const [addrState, setAddrState] = useState('NY');
  const [addrZip, setAddrZip] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      addNotification('GPS Error ❌', 'Geolocation is not supported by your browser.', 'alert');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            const street = addr.road ? `${addr.house_number || ''} ${addr.road}`.trim() : addr.suburb || addr.neighbourhood || 'Detected Location';
            setAddrStreet(street);
            setAddrZip(addr.postcode || '10011');
            addNotification('GPS Located! 📍', `Detected address: ${street}`, 'success');
          } else {
            throw new Error('Geocoding failed');
          }
        } catch (e) {
          const mockStreet = `${Math.floor(Math.random() * 900) + 100} Broadway`;
          setAddrStreet(mockStreet);
          setAddrZip('10003');
          addNotification('GPS Simulation 📍', `GPS resolved to: ${mockStreet} (NYC simulated)`, 'success');
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        const mockStreet = `${Math.floor(Math.random() * 900) + 100} Broadway`;
        setAddrStreet(mockStreet);
        setAddrZip('10003');
        addNotification('GPS Simulation 📍', `GPS resolved to: ${mockStreet} (NYC simulated)`, 'success');
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Card Inputs
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardLabel, setCardLabel] = useState('Personal Visa');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex'>('visa');

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim() || !addrZip.trim()) {
      addNotification('Form incomplete 📋', 'Please provide a street address and zip code.', 'alert');
      return;
    }

    addAddress({
      label: addrLabel,
      street: addrStreet,
      city: addrCity,
      state: addrState,
      zip: addrZip
    });

    setAddrStreet('');
    setAddrZip('');
    setShowAddressForm(false);
    addNotification('Location Saved! 📍', `Added "${addrLabel}" to saved locations.`, 'success');
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardLastFour.length !== 4 || !cardExpiry.includes('/')) {
      addNotification('Invalid card details 💳', 'Please provide a 4-digit card suffix and expiration date.', 'alert');
      return;
    }

    addPaymentMethod({
      type: 'card',
      label: cardLabel,
      cardType,
      lastFour: cardLastFour,
      expiry: cardExpiry
    });

    setCardLastFour('');
    setCardExpiry('');
    setShowCardForm(false);
    addNotification('Card Mapped! 💳', `Mapped "${cardLabel}" card token to profile vault.`, 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-slate-800 font-sans text-left" id="profile-container-hub">
      {/* Account metadata card */}
      <div className="bg-[#111827] text-white rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-xl border border-slate-800 select-none">
        <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-[#F15A24]/10 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row items-center sm:space-x-6 gap-4">
          <div className="w-20 h-20 bg-slate-800 rounded-full overflow-hidden border-2 border-[#F15A24] flex items-center justify-center text-3xl font-black">
            W
          </div>
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center px-2 py-0.5 bg-[#F15A24] text-white rounded-md text-[8px] font-black uppercase tracking-wider">
              Premium Connoisseur
            </div>
            <h2 className="text-2xl font-black tracking-tight">{userEmail.split('@')[0]}</h2>
            <p className="text-xs text-slate-400 font-bold font-mono">{userEmail}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Saved Addresses */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <MapPin className="w-4 h-4 text-slate-450" />
              <span>Saved Locations</span>
            </div>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="text-xs text-[#F15A24] hover:text-[#E04D1B] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Address
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleSaveAddress} className="p-4 bg-slate-55 rounded-2xl border border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <Globe className={`w-3.5 h-3.5 text-[#F15A24] ${isDetecting ? 'animate-spin' : ''}`} />
                <span>{isDetecting ? 'Detecting Location...' : 'Autofill Current Location'}</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Label</label>
                  <input
                    type="text"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Street *</label>
                  <input
                    type="text"
                    placeholder="124 W 22nd St"
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">City</label>
                  <input
                    type="text"
                    value={addrCity}
                    className="w-full bg-slate-100 border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none text-slate-500 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">State</label>
                  <input
                    type="text"
                    value={addrState}
                    className="w-full bg-slate-100 border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none text-slate-500 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Zip *</label>
                  <input
                    type="text"
                    placeholder="10011"
                    value={addrZip}
                    onChange={(e) => setAddrZip(e.target.value)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Save Location
              </button>
            </form>
          )}

          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  addr.isDefault 
                    ? 'border-[#F15A24] bg-orange-50/20 shadow-2xs' 
                    : 'border-slate-105 bg-white'
                }`}
              >
                <div className="text-left text-xs">
                  <div className="font-black text-slate-800 leading-none">{addr.label}</div>
                  <div className="text-[11px] text-slate-400 font-bold mt-1.5 leading-tight">
                    {addr.street}, {addr.city}, {addr.zip}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="text-[10px] text-slate-400 hover:text-[#F15A24] font-bold cursor-pointer transition-colors px-2.5 py-1.5 hover:bg-slate-50 rounded-lg"
                    >
                      Set Default
                    </button>
                  )}
                  {addresses.length > 1 && (
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                      title="Delete Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Cards */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <CreditCard className="w-4 h-4 text-slate-450" />
              <span>Payment Cards</span>
            </div>
            <button
              onClick={() => setShowCardForm(!showCardForm)}
              className="text-xs text-[#F15A24] hover:text-[#E04D1B] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Card
            </button>
          </div>

          {showCardForm && (
            <form onSubmit={handleSaveCard} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] uppercase font-black text-slate-400 block">Card Label</label>
                <input
                  type="text"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                  className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Card Type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as any)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-semibold focus:outline-none"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Last 4 Digits *</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4242"
                    value={cardLastFour}
                    onChange={(e) => setCardLastFour(e.target.value)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-mono font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase font-black text-slate-400 block">Expiry *</label>
                  <input
                    type="text"
                    placeholder="09/28"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-white border border-slate-150 rounded-xl p-2.5 text-xs font-mono font-semibold focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Save Card Token
              </button>
            </form>
          )}

          <div className="space-y-3">
            {paymentMethods.map((pay) => (
              <div
                key={pay.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  pay.isDefault 
                    ? 'border-[#F15A24] bg-orange-50/20 shadow-2xs' 
                    : 'border-slate-105 bg-white'
                }`}
              >
                <div className="text-left text-xs">
                  <div className="font-black text-slate-800 leading-none">{pay.label}</div>
                  <div className="text-[11px] text-slate-450 font-bold mt-1.5 leading-tight font-mono">
                    {pay.type === 'gpay' ? 'Google Pay link' : `Visa ending in •••• ${pay.lastFour}`}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!pay.isDefault && (
                    <button
                      onClick={() => setDefaultPaymentMethod(pay.id)}
                      className="text-[10px] text-slate-450 hover:text-[#F15A24] font-bold cursor-pointer transition-colors px-2.5 py-1.5 hover:bg-slate-50 rounded-lg"
                    >
                      Set Default
                    </button>
                  )}
                  {paymentMethods.length > 1 && (
                    <button
                      onClick={() => deletePaymentMethod(pay.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-55 rounded-xl cursor-pointer transition-colors"
                      title="Delete Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
