'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { getAuthUserId } from '@/utils/api';
import { toppingOptions, addonOptions, drinkOptions } from '@/lib/constants';
import { paymentService, CardDetails } from '@/services/paymentService';
import { orderService, CreateOrderPayload } from '@/services/orderService';

interface CheckoutViewProps {
  deliveryAddress: string;
  selectedRestaurant: {
    id: string;
    name: string;
    logo: string;
    address?: string;
  };
  onBack: () => void;
  onSuccessOrder: (newOrder: any) => void;
}

export default function CheckoutView({
  deliveryAddress,
  selectedRestaurant,
  onBack,
  onSuccessOrder,
}: CheckoutViewProps) {
  const { items: cartItems, clearCart } = useCartStore();

  const [paymentCards, setPaymentCards] = useState<CardDetails[]>([
    { id: 'card_mastercard', type: 'credit', name: 'Credit card', number: '5105 **** **** 0505', logo: '/assets/logo_mastercard.png' },
    { id: 'card_visa', type: 'debit', name: 'Debit card', number: '3566 **** **** 0505', logo: '/assets/logo_visa.png' }
  ]);
  const [selectedCardId, setSelectedCardId] = useState('card_mastercard');
  const [saveCardDetails, setSaveCardDetails] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentNotification, setPaymentNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Add card form state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 3.00 : 0.00;
  const serviceFee = subtotal > 0 ? 1.50 : 0.00;
  const taxFee = subtotal > 0 ? subtotal * 0.08875 : 0.00;
  const total = subtotal + deliveryFee + serviceFee + taxFee;

  const handlePayNow = async () => {
    if (cartItems.length === 0) return;
    
    setIsProcessingPayment(true);
    setPaymentNotification(null);

    const paymentRes = await paymentService.processPayment(selectedCardId, total);
    
    if (!paymentRes.success) {
      setPaymentNotification({ type: 'error', message: paymentRes.message });
      setIsProcessingPayment(false);
      return;
    }

    // Process order payload creation
    const customerId = getAuthUserId() || 'guest_id';
    const itemsPayload = cartItems.map(item => ({
      id: item.foodItem.id,
      name: item.foodItem.name,
      price: item.pricePerUnit,
      quantity: item.quantity
    }));

    const orderPayload: CreateOrderPayload = {
      customer_id: customerId,
      restaurant_id: selectedRestaurant.id,
      items: itemsPayload,
      pickup_address: selectedRestaurant.address || '123 Main St, New York, NY',
      delivery_address: deliveryAddress || '123 Main St, NY',
      payment_method: 'credit_card'
    };

    const orderRes = await orderService.createOrder(orderPayload);
    setIsProcessingPayment(false);

    if (orderRes.success) {
      setPaymentNotification({
        type: 'success',
        message: `Order Confirmed! ${selectedRestaurant.name} is being prepared.`
      });

      const newOrder = {
        id: orderRes.order_id,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantLogo: selectedRestaurant.logo,
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: [...cartItems],
        totalPrice: total,
        status: 'Placed'
      };

      // Call success callback
      setTimeout(() => {
        clearCart();
        onSuccessOrder(newOrder);
      }, 1500);
    } else {
      setPaymentNotification({
        type: 'error',
        message: orderRes.error || 'Failed to place order. Please try again.'
      });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left pb-16 relative">
      {/* Processing Spinner Overlay */}
      {isProcessingPayment && (
        <div className="absolute inset-0 bg-white/85 backdrop-blur-xs z-[80] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-gray-100 border-t-[#EF2A39] rounded-full animate-spin mb-4" />
          <span className="font-poppins font-bold text-[18px] text-[#3C2F2F]">Processing Payment...</span>
          <p className="font-roboto text-[13.5px] text-[#A6A6A6] mt-1.5">We are verifying details with your bank</p>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-xs active:scale-95 transition-all focus:outline-none cursor-pointer hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="font-poppins font-bold text-[28px] text-[#3C2F2F]">Checkout & Payment</h2>
      </div>

      {paymentNotification && (
        <div className={`p-4 rounded-[20px] mb-6 text-[14px] font-roboto font-semibold border flex items-center gap-2.5 max-w-[600px] animate-fadeIn ${
          paymentNotification.type === 'success' 
            ? 'bg-green-50 border-green-150 text-green-700' 
            : 'bg-red-50 border-red-150 text-[#EF2A39]'
        }`}>
          <span>{paymentNotification.type === 'success' ? '✓' : '⚠'}</span>
          <span>{paymentNotification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Methods & Items Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Methods */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-4">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-50 pb-3">Payment Methods</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentCards.map(card => {
                const isSelected = selectedCardId === card.id;
                return (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`border rounded-[20px] p-4.5 flex items-center justify-between cursor-pointer transition-all select-none active:scale-[0.99] ${
                      isSelected 
                        ? 'border-[#FFE100] bg-[#FFE100]/5 shadow-sm' 
                        : 'border-gray-100 bg-white hover:border-gray-250'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-7 bg-white border border-gray-100 rounded p-0.5 flex items-center justify-center">
                        <img src={card.logo} alt={card.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="text-left">
                        <span className="font-poppins font-bold text-[13.5px] text-[#3C2F2F] block leading-none">{card.name}</span>
                        <span className="font-roboto text-[11px] text-[#A6A6A6] block mt-1.5">{card.number}</span>
                      </div>
                    </div>

                    {/* Radio dot */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-[#EF2A39]' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-[#EF2A39] rounded-full" />}
                    </div>
                  </div>
                );
              })}

              <button 
                onClick={() => setShowAddCardModal(true)}
                className="border-2 border-dashed border-gray-200 hover:border-[#EF2A39]/30 rounded-[20px] p-4.5 flex flex-col items-center justify-center text-gray-400 hover:text-[#EF2A39] transition-all cursor-pointer focus:outline-none bg-white min-h-[78px]"
              >
                <span className="font-roboto font-bold text-[13.5px]">+ Add new card</span>
              </button>
            </div>

            {/* Save checkbox */}
            <div className="flex items-center gap-2.5 pt-2 text-left">
              <input 
                type="checkbox" 
                id="saveCardCheckbox" 
                checked={saveCardDetails}
                onChange={(e) => setSaveCardDetails(e.target.checked)}
                className="w-[18px] h-[18px] accent-[#EF2A39] cursor-pointer"
              />
              <label htmlFor="saveCardCheckbox" className="font-roboto text-[13px] text-[#A6A6A6] cursor-pointer select-none">
                Save card details for future payments
              </label>
            </div>
          </div>

          {/* Order Items Review */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F]">Review Basket Items</h3>
              <button 
                onClick={() => setShowLegalModal(true)}
                className="w-6 h-6 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-full flex items-center justify-center text-[12.5px] font-bold text-gray-400 cursor-pointer focus:outline-none transition-colors"
                title="Pricing policies"
              >
                ?
              </button>
            </div>

            <div className="space-y-3">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-1.5 font-roboto text-[14px]">
                  <div className="text-left">
                    <span className="font-bold text-[#3C2F2F]">{item.quantity}x {item.foodItem.name}</span>
                    <span className="text-[#A6A6A6] text-[11.5px] block mt-0.5">Size: {item.size} • Spicy: {item.spicy}%</span>
                    {((item.toppings || []).length > 0 || (item.addons || []).length > 0 || (item.drinks || []).length > 0) && (
                      <span className="text-[#6A6A6A] text-[11.5px] block mt-0.5 leading-snug">
                        + {[
                          ...item.toppings.map(id => toppingOptions.find(o => o.id === id)?.name),
                          ...item.addons.map(id => addonOptions.find(o => o.id === id)?.name),
                          ...item.drinks.map(id => drinkOptions.find(o => o.id === id)?.name)
                        ].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#EF2A39] shrink-0">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Checkout pricing summary right column */}
        <div>
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm text-left sticky top-[100px] space-y-6">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-100 pb-3">Total Cost</h3>

            <div className="space-y-3 font-roboto text-[14px] font-bold text-[#6A6A6A] border-b border-gray-100 pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#3C2F2F]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-[#3C2F2F]">${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="text-[#3C2F2F]">${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>NY Tax (8.875%)</span>
                <span className="text-[#3C2F2F]">${taxFee.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[19px] font-black text-[#3C2F2F]">
              <span>Pay Amount</span>
              <span className="text-[#EF2A39]">${total.toFixed(2)}</span>
            </div>

            <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-center gap-2 text-green-700 font-roboto text-[12.5px] font-semibold">
              <span>⏱</span>
              <span>Arrives at {deliveryAddress} in 25 mins</span>
            </div>

            <button 
              onClick={handlePayNow}
              className="w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[16px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center gap-2"
            >
              Pay Now
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
            onClick={() => setShowAddCardModal(false)}
          />
          <div className="relative bg-white w-full max-h-[85vh] lg:max-h-[520px] lg:max-w-[480px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none pb-8 text-left border-t lg:border border-gray-100 overflow-y-auto scrollbar-hide">
            <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
            
            <h3 className="font-poppins font-semibold text-[20px] text-[#3C2F2F] mb-5 text-left shrink-0">
              Add Payment methods
            </h3>
            
            <div className="space-y-4 flex-1">
              <input 
                type="text"
                placeholder="Card Number (3999 - 1234 - 5678 - 0000)"
                value={newCardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 - ');
                  setNewCardNumber(formatted);
                }}
                className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
              />
              
              <div className="flex gap-4">
                <input 
                  type="text"
                  placeholder="MM/YY"
                  value={newCardExpiry}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                    setNewCardExpiry(formatted);
                  }}
                  className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                />
                
                <input 
                  type="password"
                  placeholder="CVC"
                  value={newCardCvc}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setNewCardCvc(val);
                  }}
                  className="w-full h-[50px] bg-gray-50 border border-gray-100 rounded-[16px] px-4 font-roboto text-[14px] text-[#3C2F2F] outline-none focus:border-[#EF2A39] focus:bg-white transition-all placeholder-gray-400 text-left"
                />
              </div>
            </div>
            
            <div className="mt-8 space-y-3 shrink-0">
              <button 
                onClick={() => {
                  const digitsOnly = newCardNumber.replace(/\D/g, '');
                  if (digitsOnly.length < 16) {
                    alert("Please enter a valid 16-digit card number");
                    return;
                  }
                  const brand = digitsOnly.startsWith('4') ? 'Visa' : digitsOnly.startsWith('5') ? 'Mastercard' : 'Credit';
                  const logo = digitsOnly.startsWith('4') ? '/assets/logo_visa.png' : '/assets/logo_mastercard.png';
                  const formattedNum = `${digitsOnly.slice(0, 4)} **** **** ${digitsOnly.slice(12)}`;
                  
                  const newCard: CardDetails = {
                    id: `card_${Date.now()}`,
                    type: digitsOnly.startsWith('4') ? 'debit' : 'credit',
                    name: `${brand} card`,
                    number: formattedNum,
                    logo
                  };
                  
                  setPaymentCards(prev => [...prev, newCard]);
                  setSelectedCardId(newCard.id);
                  
                  setNewCardNumber('');
                  setNewCardExpiry('');
                  setNewCardCvc('');
                  setShowAddCardModal(false);
                  
                  setPaymentNotification({
                    type: 'success',
                    message: `Successfully added your new ${brand} card!`
                  });
                  setTimeout(() => setPaymentNotification(null), 3000);
                }}
                className="w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-95 text-[#3C2F2F] font-roboto font-bold text-[15.5px] rounded-[18px] shadow-sm transition-all cursor-pointer focus:outline-none flex items-center justify-center"
              >
                Add card
              </button>
              <button 
                onClick={() => setShowAddCardModal(false)}
                className="w-full h-[54px] bg-gray-50 hover:bg-gray-100 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none flex items-center justify-center border border-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {showLegalModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowLegalModal(false)}
          />
          <div className="relative bg-white w-full max-w-[480px] rounded-[28px] p-7 shadow-2xl border border-gray-100 flex flex-col max-h-[80vh] text-left animate-scaleUp">
            <h3 className="font-poppins font-bold text-[20px] text-[#3C2F2F] mb-4 pb-3 border-b border-gray-50">
              Pricing Policies
            </h3>
            <div className="overflow-y-auto space-y-4 font-roboto text-[14px] text-[#6A6A6A] leading-relaxed pr-1">
              <p>All prices listed in the menu are inclusive of basic preparation costs. Tax is calculated dynamically based on New York State tax rate (8.875%).</p>
              <p>Delivery fees are charged on behalf of drivers at a flat rate of $3.00 per delivery. Service fee of $1.50 supports server hosting costs and Mapbox APIs.</p>
              <p>Your payment details are protected under standard bank simulation layers.</p>
            </div>
            <button 
              onClick={() => setShowLegalModal(false)}
              className="mt-6 w-full h-[50px] bg-[#FFE100] text-[#3C2F2F] font-roboto font-bold text-[14.5px] rounded-[16px] cursor-pointer"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
