'use client';

import React, { useState } from 'react';
import { getAuthToken } from '@/utils/api';
import { apiClient } from '@/lib/axios';

interface ProfileViewProps {
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  profilePicture: string;
  setShowAvatarModal: (val: boolean) => void;
  orders: any[];
  setCartItems: React.Dispatch<React.SetStateAction<any[]>>;
  setOrderedItems: (items: any[]) => void;
  setCurrentView: (view: any) => void;
  deliveryLocations: any[];
  setDeliveryLocations: React.Dispatch<React.SetStateAction<any[]>>;
  deliveryAddress: string;
  setDeliveryAddress: (addr: string) => void;
  paymentCards: any[];
  setPaymentCards: React.Dispatch<React.SetStateAction<any[]>>;
  setShowAddCardModal: (val: boolean) => void;
  setShowLocationModal: (val: boolean) => void;
  setShowLogoutModal: (val: boolean) => void;
  activeSub: string;
  setActiveSub: (val: string) => void;
}

export default function ProfileView({
  profileName,
  profileEmail,
  profilePhone,
  setProfilePhone,
  profilePicture,
  setShowAvatarModal,
  orders,
  setCartItems,
  setOrderedItems,
  setCurrentView,
  deliveryLocations,
  setDeliveryLocations,
  deliveryAddress,
  setDeliveryAddress,
  paymentCards,
  setPaymentCards,
  setShowAddCardModal,
  setShowLocationModal,
  setShowLogoutModal,
  activeSub,
  setActiveSub,
}: ProfileViewProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneTemp, setPhoneTemp] = useState(profilePhone);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dietary preferences state
  const [profilePreferFood, setProfilePreferFood] = useState<string[]>(['healthy']);
  const [profileAllergies, setProfileAllergies] = useState<string[]>(['gluten']);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleDietary = (id: string) => {
    setProfilePreferFood(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAllergy = (id: string) => {
    setProfileAllergies(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const renderSettingsSubSection = () => {
    switch (activeSub) {
      case 'account':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn">
            <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-3 text-left">secured demographics</h4>
            {profileMessage && (
              <div className={`p-3.5 rounded-[16px] text-[13.5px] font-roboto font-semibold ${
                profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-[#EF2A39] border border-red-100'
              }`}>
                {profileMessage.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <span className="text-[13px] font-bold text-[#A6A6A6] block text-left">Full Name</span>
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    disabled 
                    value={profileName}
                    className="w-full bg-[#F3F4F6] border border-gray-150 rounded-[18px] px-5 py-4 text-[15.5px] font-medium text-[#6A6A6A] outline-none cursor-not-allowed text-left pr-12 h-[60px]"
                  />
                  <div className="absolute right-4 text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <span className="text-[13px] font-bold text-[#A6A6A6] block text-left">Email Address</span>
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    disabled 
                    value={profileEmail}
                    className="w-full bg-[#F3F4F6] border border-gray-150 rounded-[18px] px-5 py-4 text-[15.5px] font-medium text-[#6A6A6A] outline-none cursor-not-allowed text-left pr-12 h-[60px]"
                  />
                  <div className="absolute right-4 text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2 max-w-[450px]">
              <span className="text-[13px] font-bold text-[#A6A6A6] block text-left">Phone Number</span>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  disabled={!isEditingPhone}
                  value={isEditingPhone ? phoneTemp : profilePhone}
                  onChange={(e) => setPhoneTemp(e.target.value)}
                  className={`flex-1 bg-[#F9FAFB] border rounded-[18px] px-5 py-4 text-[15.5px] font-medium text-[#3C2F2F] outline-none transition-all text-left h-[60px] ${
                    isEditingPhone ? 'border-[#EF2A39] bg-white shadow-sm' : 'border-gray-100'
                  }`}
                />
                {isEditingPhone ? (
                  <div className="flex gap-2.5 shrink-0">
                    <button 
                      onClick={async () => {
                        if (!phoneTemp.trim()) {
                          alert("Phone number cannot be empty.");
                          return;
                        }
                        setProfilePhone(phoneTemp);
                        setIsEditingPhone(false);
                        if (getAuthToken()) {
                          try {
                            await apiClient.patch('/auth/me', { phone: phoneTemp.trim() });
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        setProfileMessage({ type: 'success', text: 'Phone number updated!' });
                        setTimeout(() => setProfileMessage(null), 3000);
                      }}
                      className="px-5 bg-[#FFE100] text-[#3C2F2F] rounded-[16px] text-[13.5px] font-bold active:scale-95 transition-transform cursor-pointer h-[60px]"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setIsEditingPhone(false)}
                      className="px-5 bg-white border border-gray-200 text-gray-500 rounded-[16px] text-[13.5px] font-bold active:scale-95 transition-transform cursor-pointer h-[60px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPhoneTemp(profilePhone);
                      setIsEditingPhone(true);
                    }}
                    className="px-5 bg-white border border-gray-200 text-[#3C2F2F] hover:bg-gray-50 rounded-[18px] text-[14px] font-bold active:scale-95 transition-transform shrink-0 cursor-pointer h-[60px]"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'diet':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn text-left">
            <div>
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Dietary Preferences</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6]">Match dishes containing your preferred diets</span>
            </div>
            <div className="flex flex-wrap gap-3.5">
              {[
                { id: 'healthy', label: 'Healthy', icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )},
                { id: 'halal', label: 'Halal', icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                    <path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 0-.5-3 6.75 6.75 0 0 1-8.5-8.5A10 10 0 0 0 12 3z" />
                  </svg>
                )},
                { id: 'vegan', label: 'Vegan', icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                    <path d="M2 22c5-1 9-4 11-9S18 4 22 2c-1 5-4 9-9 11s-8 6-11 9z" />
                  </svg>
                )}
              ].map((diet) => {
                const isSelected = profilePreferFood.includes(diet.id);
                return (
                  <button
                    key={diet.id}
                    onClick={() => handleToggleDietary(diet.id)}
                    className={`px-5 py-3 rounded-full border text-[14.5px] font-roboto font-medium flex items-center transition-all focus:outline-none cursor-pointer ${
                      isSelected
                        ? 'bg-[#EF2A39]/10 border-[#EF2A39] text-[#EF2A39] shadow-sm'
                        : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                    }`}
                  >
                    {diet.icon}
                    {diet.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-5 border-t border-gray-100">
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Allergies</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6] block mb-4">Dishes with these ingredients will be flagged</span>
              <div className="flex flex-wrap gap-3.5">
                {[
                  { id: 'peanuts', label: 'Peanuts', icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                      <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                    </svg>
                  )},
                  { id: 'gluten', label: 'Gluten', icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                      <path d="M12 2v20M8 5l4-2 4 2M8 10l4-2 4 2M8 15l4-2 4 2M8 20l4-2 4 2" />
                    </svg>
                  )},
                  { id: 'dairy', label: 'Dairy', icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                      <path d="M6 20h12V10L14 6H10L6 10v10z" />
                      <path d="M6 10h12" />
                    </svg>
                  )},
                  { id: 'shellfish', label: 'Shellfish', icon: (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 shrink-0">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M12 8a4 4 0 0 0-4 4" />
                    </svg>
                  )}
                ].map((allergy) => {
                  const isSelected = profileAllergies.includes(allergy.id);
                  return (
                    <button
                      key={allergy.id}
                      onClick={() => handleToggleAllergy(allergy.id)}
                      className={`px-5 py-3 rounded-full border text-[14.5px] font-roboto font-medium flex items-center transition-all focus:outline-none cursor-pointer ${
                        isSelected
                          ? 'bg-[#EF2A39]/10 border-[#EF2A39] text-[#EF2A39] shadow-sm'
                          : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                      }`}
                    >
                      {allergy.icon}
                      {allergy.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn text-left">
            <div>
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Saved Cards</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6]">Add or remove cards linked to your account</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentCards.map(card => (
                <div key={card.id} className="border border-gray-100 rounded-[24px] p-6 shadow-sm bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-9 bg-white border border-gray-100 rounded-md p-1.5 flex items-center justify-center shadow-xs">
                      <img src={card.logo} alt={card.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="text-left">
                      <span className="font-poppins font-bold text-[15.5px] text-[#3C2F2F] block">{card.name}</span>
                      <span className="font-roboto text-[13.5px] text-[#A6A6A6] block mt-0.5">{card.number}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPaymentCards(prev => prev.filter(c => c.id !== card.id))}
                    className="text-[#EF2A39] hover:bg-red-50 p-2.5 rounded-full transition-colors focus:outline-none cursor-pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => setShowAddCardModal(true)}
                className="border-2 border-dashed border-gray-200 hover:border-[#EF2A39]/30 rounded-[24px] p-6 flex flex-col items-center justify-center text-gray-400 hover:text-[#EF2A39] transition-all cursor-pointer focus:outline-none bg-white min-h-[102px]"
              >
                <span className="font-roboto font-bold text-[15.5px]">+ Add new card</span>
              </button>
            </div>
          </div>
        );
      case 'locations':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn text-left">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <div>
                <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide">Saved Locations</h4>
                <span className="font-roboto text-[13px] text-[#A6A6A6]">Quick access drop-off addresses</span>
              </div>
              <button 
                onClick={() => setShowLocationModal(true)}
                className="px-5 py-2.5 bg-[#EF2A39]/10 text-[#EF2A39] hover:bg-[#EF2A39]/15 rounded-full text-[13.5px] font-bold transition-colors cursor-pointer"
              >
                + Add Location
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deliveryLocations.map(loc => {
                const isActive = deliveryAddress === `${loc.name}: ${loc.address}` || deliveryAddress === loc.address;
                return (
                  <div 
                    key={loc.id} 
                    onClick={() => setDeliveryAddress(`${loc.name}: ${loc.address}`)}
                    className={`border rounded-[24px] p-6 shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                      isActive ? 'border-[#EF2A39] bg-red-50/10' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-[46px] h-[46px] rounded-[16px] flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#EF2A39]/10 text-[#EF2A39]' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="text-left min-w-0">
                        <span className="font-poppins font-bold text-[15.5px] text-[#3C2F2F] block truncate">
                          {loc.name} {isActive && <span className="text-[10px] bg-[#EF2A39] text-white px-2 py-0.5 rounded-full ml-1 font-bold uppercase tracking-wider">Active</span>}
                        </span>
                        <span className="font-roboto text-[13px] text-[#A6A6A6] block mt-0.5 truncate max-w-[200px]">{loc.address}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeliveryLocations(prev => prev.filter(l => l.id !== loc.id));
                      }}
                      className="text-gray-400 hover:text-[#EF2A39] hover:bg-red-50 p-2.5 rounded-full transition-colors focus:outline-none cursor-pointer shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'password':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn max-w-[540px] text-left">
            <div>
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Change Password</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6]">Protect your account by setting secure credentials</span>
            </div>
            
            {passwordError && (
              <div className="p-3.5 bg-red-50 text-[#EF2A39] border border-red-100 rounded-[16px] text-[13.5px] font-roboto font-semibold">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3.5 bg-green-50 text-green-700 border border-green-100 rounded-[16px] text-[13.5px] font-roboto font-semibold">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#A6A6A6] block">Current Password</span>
                <input 
                  type="password" 
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-gray-100 focus:border-[#EF2A39]/30 rounded-[18px] px-5 py-4 text-[15px] font-medium text-[#3C2F2F] outline-none transition-all h-[58px]"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#A6A6A6] block">New Password</span>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-gray-100 focus:border-[#EF2A39]/30 rounded-[18px] px-5 py-4 text-[15px] font-medium text-[#3C2F2F] outline-none transition-all h-[58px]"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#A6A6A6] block">Confirm New Password</span>
                <input 
                  type="password" 
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-gray-100 focus:border-[#EF2A39]/30 rounded-[18px] px-5 py-4 text-[15px] font-medium text-[#3C2F2F] outline-none transition-all h-[58px]"
                />
              </div>

              <button 
                onClick={() => {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    setPasswordError("All fields are required.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError("New passwords do not match.");
                    return;
                  }
                  if (newPassword.length < 6) {
                    setPasswordError("Password must be at least 6 characters.");
                    return;
                  }
                  setPasswordError('');
                  setPasswordSuccess("Password updated successfully!");
                  setNewPassword('');
                  setConfirmPassword('');
                  setCurrentPassword('');
                  setTimeout(() => setPasswordSuccess(''), 3000);
                }}
                className="w-full h-[56px] bg-[#FFE100] hover:brightness-95 active:scale-95 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none mt-2 shadow-sm"
              >
                Save New Password
              </button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn max-w-[540px] text-left">
            <div>
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Notifications</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6]">Control what updates are delivered to your device</span>
            </div>
            <div className="flex items-center justify-between border border-gray-100 rounded-[24px] p-6 shadow-sm bg-gray-50/50">
              <div className="text-left">
                <span className="font-poppins font-bold text-[15.5px] text-[#3C2F2F] block">Push Alerts</span>
                <span className="font-roboto text-[13px] text-[#A6A6A6] block mt-0.5">Real-time status updates from your driver</span>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(prev => !prev)}
                className={`w-15 h-8.5 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span className={`w-6.5 h-6.5 rounded-full bg-white absolute top-1 shadow-sm transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-7.5' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="bg-white rounded-[24px] border border-gray-100 p-8 space-y-6 animate-fadeIn text-left">
            <div>
              <h4 className="font-poppins font-bold text-[16px] text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Order History</h4>
              <span className="font-roboto text-[13px] text-[#A6A6A6]">Check ongoing orders or repeat past delicious orders</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Deliveries */}
              <div className="space-y-4">
                <h5 className="font-poppins font-bold text-[15px] text-[#3C2F2F] uppercase tracking-wider pl-1">Active Deliveries</h5>
                {orders.filter(o => o.status !== 'Completed').length === 0 ? (
                  <div className="border border-dashed border-gray-150 rounded-[24px] p-10 text-center text-[#A6A6A6] font-roboto text-[14px] bg-gray-50/20">
                    No active orders in progress.
                  </div>
                ) : (
                  orders.filter(o => o.status !== 'Completed').map(order => (
                    <div key={order.id} className="border border-gray-100 bg-white rounded-[24px] p-5.5 shadow-sm text-left relative flex flex-col justify-between min-h-[170px]">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F]">{order.restaurantName}</span>
                          <span className="text-[11.5px] font-roboto font-bold px-2.5 py-0.5 bg-yellow-50 text-yellow-600 rounded-full">{order.status}</span>
                        </div>
                        <p className="font-roboto text-[12px] text-[#A6A6A6]">Order #{order.id} • {order.date}</p>
                        <p className="font-roboto text-[13px] text-[#6A6A6A] mt-2 truncate">
                          {(order.items || []).map((i: any) => `${i.quantity}x ${i.foodItem?.name || ''}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-3.5 mt-3.5">
                        <span className="font-poppins font-black text-[16px] text-[#EF2A39]">${(order.totalPrice || 0).toFixed(2)}</span>
                        <button 
                          onClick={() => {
                            setOrderedItems(order.items);
                            setCurrentView('tracking');
                          }}
                          className="px-4.5 py-2 bg-[#EF2A39] hover:bg-[#D61B29] text-white rounded-full font-roboto font-bold text-[13px] transition-colors cursor-pointer"
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Past Orders */}
              <div className="space-y-4">
                <h5 className="font-poppins font-bold text-[15px] text-[#3C2F2F] uppercase tracking-wider pl-1">Past Deliveries</h5>
                {orders.filter(o => o.status === 'Completed').length === 0 ? (
                  <div className="border border-dashed border-gray-150 rounded-[24px] p-10 text-center text-[#A6A6A6] font-roboto text-[14px] bg-gray-50/20">
                    No order history yet.
                  </div>
                ) : (
                  orders.filter(o => o.status === 'Completed').map(order => (
                    <div key={order.id} className="border border-gray-100 bg-white rounded-[24px] p-5.5 shadow-sm text-left relative flex flex-col justify-between min-h-[170px]">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F]">{order.restaurantName}</span>
                          <span className="text-[11.5px] font-roboto font-bold px-2.5 py-0.5 bg-green-50 text-green-600 rounded-full">Delivered</span>
                        </div>
                        <p className="font-roboto text-[12px] text-[#A6A6A6]">Order #{order.id} • {order.date}</p>
                        <p className="font-roboto text-[13px] text-[#6A6A6A] mt-2 truncate">
                          {(order.items || []).map((i: any) => `${i.quantity}x ${i.foodItem?.name || ''}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-50 pt-3.5 mt-3.5">
                        <span className="font-poppins font-black text-[16px] text-[#3C2F2F]">${(order.totalPrice || 0).toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                          {order.proof_photo_url && (
                            <a 
                              href={order.proof_photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full font-roboto font-bold text-[12px] transition-all flex items-center gap-1 cursor-pointer"
                              title="View Proof of Delivery"
                            >
                              <span>📷</span>
                              <span>Proof</span>
                            </a>
                          )}
                          <button 
                            onClick={() => {
                              const reorderItems = (order.items || []).map((item: any) => ({
                                ...item,
                                cartId: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                              }));
                              setCartItems(prev => [...prev, ...reorderItems]);
                              setCurrentView('cart');
                            }}
                            className="px-4.5 py-2 bg-[#FFE100] text-[#3C2F2F] hover:brightness-95 rounded-full font-roboto font-bold text-[13px] transition-all cursor-pointer"
                          >
                            Re-order
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left flex flex-col lg:flex-row gap-8 py-6 px-4">
      {/* Left Settings Sidebar */}
      <div className="w-full lg:w-[360px] shrink-0 space-y-6">
        <div className="bg-white rounded-[28px] border border-gray-100 p-8 shadow-sm flex flex-col items-center">
          <div className="relative group">
            <div className="w-[110px] h-[110px] rounded-full overflow-hidden bg-gray-150 border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <img src={profilePicture} alt="User Profile" className="w-full h-full object-cover scale-[1.05]" />
            </div>
            <button 
              onClick={() => setShowAvatarModal(true)}
              className="absolute bottom-0 right-0 w-[32px] h-[32px] bg-[#FFE100] rounded-full flex items-center justify-center border border-white shadow cursor-pointer hover:scale-105 active:scale-95 focus:outline-none"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
          <h3 className="font-poppins font-bold text-[20px] text-[#3C2F2F] mt-4 leading-tight">{profileName}</h3>
          <span className="font-roboto text-[14px] text-[#A6A6A6] mt-1">{profileEmail}</span>
        </div>

        <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-sm space-y-2.5">
          {[
            { id: 'account', title: 'Account Details', subtitle: 'Name, email & phone' },
            { id: 'orders', title: 'Order History', subtitle: 'Track active or re-order past' },
            { id: 'diet', title: 'Dietary Preferences', subtitle: 'Diets & food allergy shields' },
            { id: 'payment', title: 'Saved Payments', subtitle: 'Manage active debit/credit cards' },
            { id: 'locations', title: 'Saved Locations', subtitle: 'Manage delivery addresses' },
            { id: 'password', title: 'Change Password', subtitle: 'Update account security' },
            { id: 'notifications', title: 'App Notifications', subtitle: 'Push alerts & live trackers' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSub(item.id);
                if (item.id === 'account') setPhoneTemp(profilePhone);
                if (item.id === 'password') {
                  setPasswordError('');
                  setPasswordSuccess('');
                }
              }}
              className={`w-full p-5 rounded-[20px] border flex items-center justify-between transition-all cursor-pointer focus:outline-none text-left ${
                activeSub === item.id 
                  ? 'bg-[#EF2A39]/5 border-[#EF2A39] text-[#EF2A39]' 
                  : 'bg-white border-transparent text-[#3C2F2F] hover:bg-gray-50'
              }`}
            >
              <div>
                <span className="font-poppins font-bold text-[15.5px] block">{item.title}</span>
                <span className={`font-roboto text-[12px] block mt-0.5 ${activeSub === item.id ? 'text-[#EF2A39]/75' : 'text-[#A6A6A6]'}`}>{item.subtitle}</span>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}

          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full h-[56px] border border-gray-200 hover:border-[#EF2A39]/30 hover:bg-red-50 text-[#EF2A39] rounded-[20px] font-roboto font-bold text-[15px] transition-all cursor-pointer focus:outline-none mt-2"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Right Settings Detail Window */}
      <div className="flex-1 min-w-0">
        {renderSettingsSubSection()}
      </div>
    </div>
  );
}
