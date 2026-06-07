/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Address, PaymentMethod } from '../types';
import { MapPin, Plus, Trash2, CheckCircle2, CreditCard, ShieldCheck, Mail, Phone, Map, ChevronRight, User } from 'lucide-react';

interface ProfileDashboardProps {
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  onAddAddress: (address: Omit<Address, 'id' | 'isDefault'>) => void;
  onDeleteAddress: (id: string) => void;
  onSetDefaultAddress: (id: string) => void;
  onAddPaymentMethod: (payment: Omit<PaymentMethod, 'id' | 'isDefault'>) => void;
  onDeletePaymentMethod: (id: string) => void;
  onSetDefaultPaymentMethod: (id: string) => void;
  userEmail: string;
}

export default function ProfileDashboard({
  addresses,
  paymentMethods,
  onAddAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod,
  userEmail,
}: ProfileDashboardProps) {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Form states
  const [addressForm, setAddressForm] = useState({
    label: 'Home 🏠',
    street: '',
    city: 'New York',
    state: 'NY',
    zip: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    type: 'card' as 'card' | 'gpay',
    label: 'Chase Sapphire Preferred',
    cardType: 'visa' as 'visa' | 'mastercard' | 'amex',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.zip) return;
    onAddAddress(addressForm);
    setAddressForm({ label: 'Home 🏠', street: '', city: 'New York', state: 'NY', zip: '' });
    setShowAddressForm(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.type === 'card' && (!paymentForm.cardNumber || !paymentForm.expiry)) return;

    onAddPaymentMethod({
      type: paymentForm.type,
      label: paymentForm.label || 'Credit Card',
      cardType: paymentForm.type === 'card' ? paymentForm.cardType : undefined,
      lastFour: paymentForm.type === 'card' ? paymentForm.cardNumber.slice(-4) || '1111' : undefined,
      expiry: paymentForm.type === 'card' ? paymentForm.expiry : undefined,
    });

    setPaymentForm({
      type: 'card',
      label: 'Personal Premium Card',
      cardType: 'visa',
      cardNumber: '',
      expiry: '',
      cvv: '',
    });
    setShowPaymentForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 py-8 text-slate-800" id="profile-dashboard-layout">
      {/* Left Column: Profile Card */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-3xl p-6 relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-[#ECEFF2] select-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -z-10" />
          <div className="flex flex-col items-center text-center">
            {/* User Profile Avatar */}
            <div className="relative mb-4">
              <div className="w-24 h-24 bg-gradient-to-tr from-[#F15A24] to-amber-400 rounded-full p-1 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center text-white text-3xl font-black font-sans uppercase">
                  {userEmail.substring(0, 2)}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 bg-[#F15A24] w-5 h-5 rounded-full border-4 border-white flex items-center justify-center" title="Online Sync Active">
                <div className="bg-white w-1.5 h-1.5 rounded-full animate-ping" />
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight">Premium Member</h3>
            <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1.5">Connoisseur Club</p>

            <div className="mt-6 w-full space-y-4 border-t border-slate-100 pt-6">
              <div className="flex items-center space-x-3.5 text-left">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="truncate">
                  <div className="text-[9px] uppercase font-black tracking-wider text-slate-400">Registered Email</div>
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[190px]">{userEmail}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 text-left">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-[9px] uppercase font-black tracking-wider text-slate-400">Contact Number</div>
                  <div className="text-xs font-bold text-slate-800">+1 (555) 782-9012</div>
                </div>
              </div>

              <div className="flex items-center space-x-3.5 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <div className="text-[9px] uppercase font-black tracking-wider text-slate-400">Identity Status</div>
                  <div className="text-xs font-bold text-emerald-600 flex items-center">
                    Verified Account
                    <ShieldCheck className="w-3.5 h-3.5 ml-1 stroke-[2]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security badges */}
        <div className="bg-white rounded-3xl p-6 border border-[#ECEFF2] flex items-start space-x-4 select-none shadow-[0_4px_25px_rgba(0,0,0,0.01)]">
          <ShieldCheck className="w-6 h-6 text-[#F15A24] flex-shrink-0 mt-0.5 stroke-[2]" />
          <div>
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-sans">Sovereign Protection</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-bold font-sans mt-2">
              All payment information is shielded under TLS-256 military layers, bypassing client servers directly to tokenized merchant vaults.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Address Book & Payment Options */}
      <div className="lg:col-span-8 space-y-8">
        {/* Saved Addresses Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-[#ECEFF2]" id="address-management">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 select-none">
            <div>
              <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight flex items-center gap-2">
                <MapPin className="w-5.5 h-5.5 text-[#F15A24] stroke-[2]" />
                Delivery Addresses
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Manage physical coordinate points for precision dropoffs.</p>
            </div>
            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="flex items-center space-x-1.5 py-2.5 px-4 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-transform active:scale-98 cursor-pointer font-sans"
                id="btn-add-address"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Address</span>
              </button>
            )}
          </div>

          <AnimatePresence>
            {showAddressForm && (
              <motion.form
                key="address-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddressSubmit}
                className="bg-[#FCFCFD] border border-slate-100 rounded-3xl p-5 mb-6 space-y-4"
                id="add-address-form"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none">
                      Destination Label
                    </label>
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50"
                    >
                      <option value="Home 🏠">Home 🏠</option>
                      <option value="Work 💼">Work 💼</option>
                      <option value="Gym 💪">Gym 💪</option>
                      <option value="Cabin 🌲">Cabin 🌲</option>
                      <option value="Partner 💜">Partner 💜</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="123 Hudson St, Apt A"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      required
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      placeholder="10013"
                      value={addressForm.zip}
                      onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                      required
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50"
                    />
                  </div>

                  <div className="flex items-end justify-end space-x-2.5 pt-4 col-span-1 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-extrabold rounded-2xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-extrabold rounded-2xl shadow-xs cursor-pointer"
                    >
                      Save Location
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`relative p-5 rounded-3xl border transition-all ${
                  addr.isDefault
                    ? 'bg-orange-50/15 border-[#F15A24] shadow-xs'
                    : 'bg-slate-50/50 border-slate-100/80 hover:border-slate-350'
                }`}
                id={`addr-card-${addr.id}`}
              >
                <div className="flex items-start justify-between select-none">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-slate-900 font-sans">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="bg-orange-50 text-[#F15A24] text-[8.5px] font-black tracking-wider uppercase px-2 py-1 rounded-xl border border-orange-100/50">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!addr.isDefault && (
                      <button
                        onClick={() => onSetDefaultAddress(addr.id)}
                        className="text-[9.5px] font-black text-slate-400 hover:text-[#F15A24] transition-colors uppercase cursor-pointer"
                        title="Set Primary Address"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAddress(addr.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-slate-100/60 cursor-pointer"
                      title="Delete Address"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 font-semibold space-y-0.5 font-sans leading-relaxed select-none">
                  <p className="font-bold text-slate-800">{addr.street}</p>
                  <p>
                    {addr.city}, {addr.state} {addr.zip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Payment Methods Section */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-[#ECEFF2]" id="payment-management">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 select-none">
            <div>
              <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight flex items-center gap-2">
                <CreditCard className="w-5.5 h-5.5 text-[#F15A24] stroke-[2]" />
                Payment Methods
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Securely tokenized credentials for lightning-fast orders.</p>
            </div>
            {!showPaymentForm && (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="flex items-center space-x-1.5 py-2.5 px-4 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-transform active:scale-98 cursor-pointer font-sans"
                id="btn-add-payment"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Method</span>
              </button>
            )}
          </div>

          <AnimatePresence>
            {showPaymentForm && (
              <motion.form
                key="payment-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handlePaymentSubmit}
                className="bg-[#FCFCFD] border border-slate-100 rounded-3xl p-5 mb-6 space-y-4"
                id="add-payment-form"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none font-sans">
                      Card Provider Network
                    </label>
                    <select
                      value={paymentForm.cardType}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cardType: e.target.value as any })}
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50"
                    >
                      <option value="visa">Visa Premium</option>
                      <option value="mastercard">Mastercard World Elite</option>
                      <option value="amex">American Express Gold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none font-sans">
                      Card Custom Label
                    </label>
                    <input
                      type="text"
                      placeholder="Chase Sapphire, Amex Gold"
                      value={paymentForm.label}
                      onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })}
                      required
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none font-sans">
                      16-Digit Card Number (Simulation)
                    </label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• 4242"
                      maxLength={16}
                      value={paymentForm.cardNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value.replace(/\D/g, '') })}
                      required
                      className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50 font-mono tracking-widest text-center"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none font-sans">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={paymentForm.expiry}
                        onChange={(e) => setPaymentForm({ ...paymentForm, expiry: e.target.value })}
                        required
                        className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50 font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-slate-450 mb-1.5 select-none font-sans">
                        Security CVV
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        value={paymentForm.cvv}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '') })}
                        required
                        className="w-full bg-white text-slate-805 text-xs p-3.5 font-bold rounded-2xl border border-slate-205 outline-none focus:ring-1 focus:ring-slate-200/50 font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 flex items-end justify-end space-x-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-extrabold rounded-2xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-extrabold rounded-2xl shadow-xs cursor-pointer"
                    >
                      Authorize Card
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Cards Display Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {paymentMethods.map((pay) => {
              const cardDefaultStyles = pay.isDefault
                ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white border-0 shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
                : 'bg-white border-[#ECEFF2] text-slate-800 shadow-xs hover:border-slate-300';
              
              const textPrimaryInverse = pay.isDefault ? 'text-white' : 'text-slate-800';
              const textSecondaryInverse = pay.isDefault ? 'text-slate-400' : 'text-slate-400';
              const textMutedInverse = pay.isDefault ? 'text-slate-300/80' : 'text-slate-700/80';
              const holographicOverlay = pay.isDefault ? 'bg-amber-400/10 border-amber-400/20' : 'bg-slate-500/10 border-slate-550/20';

              return (
                <div
                  key={pay.id}
                  className={`relative rounded-3xl overflow-hidden p-[22px] border flex flex-col justify-between h-[180px] transition-all duration-300 ${cardDefaultStyles}`}
                  id={`pay-card-${pay.id}`}
                >
                  {/* Micro holographic chip metadata decor */}
                  <div className="absolute top-5 right-5 text-right font-sans tracking-tight select-none">
                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                      {pay.type === 'gpay' ? 'Digital Wallet' : pay.cardType?.toUpperCase() || 'Card'}
                    </span>
                    {pay.isDefault && (
                      <div className="bg-[#F15A24] text-white border-0 rounded-xl font-sans text-[8.5px] font-black px-2 py-0.5 mt-1">
                        DEFAULT
                      </div>
                    )}
                  </div>

                  {/* Secure Chip Hologram decoration */}
                  <div className={`w-9 h-6.5 rounded-lg border relative overflow-hidden flex items-center justify-center shrink-0 ${holographicOverlay}`}>
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-slate-550/20" />
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-550/20" />
                    <div className="w-2.5 h-2.5 border border-slate-550/20 rounded-xs bg-slate-500/5" />
                  </div>

                  <div className="mt-3">
                    {pay.type === 'gpay' ? (
                      <p className="text-base font-black font-sans tracking-tight">Google Pay Linked</p>
                    ) : (
                      <p className="text-[17px] font-mono font-semibold tracking-widest leading-none">
                        •••• •••• •••• <span className={`font-sans font-black text-lg ${pay.isDefault ? 'text-white' : 'text-slate-900'}`}>{pay.lastFour}</span>
                      </p>
                    )}
                    <p className="text-[10px] font-bold text-slate-400 font-sans mt-2">{pay.label}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between text-[10px] font-mono border-t border-slate-100/10 pt-2 select-none">
                    <div className="text-[9.5px]">
                      <span className="text-slate-400 font-sans font-bold">HOLDER &nbsp;</span>
                      <span className={`font-sans font-black uppercase leading-none ${pay.isDefault ? 'text-white' : 'text-slate-800'}`}>Premium Club</span>
                    </div>
                    {pay.type === 'card' && (
                      <div className="text-[9.5px]">
                        <span className="text-slate-400 font-sans font-bold">EXP &nbsp;</span>
                        <span className={`font-mono font-bold leading-none ${pay.isDefault ? 'text-white' : 'text-slate-800'}`}>{pay.expiry}</span>
                      </div>
                    )}

                    {/* Actions overlay */}
                    <div className="flex items-center space-x-2">
                      {!pay.isDefault && (
                        <button
                          onClick={() => onSetDefaultPaymentMethod(pay.id)}
                          className="text-[9.5px] uppercase font-black font-sans text-slate-400 hover:text-[#F15A24] transition-colors cursor-pointer"
                          title="Set Default Card"
                        >
                          set default
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePaymentMethod(pay.id)}
                        className="p-1.5 hover:bg-slate-100/65 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                        title="Deauthorize Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
