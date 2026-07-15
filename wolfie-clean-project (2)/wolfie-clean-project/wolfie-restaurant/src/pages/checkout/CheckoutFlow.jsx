import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StickyCart from '../../components/checkout/StickyCart';
import UpsellSuggestions from '../../components/checkout/UpsellSuggestions';
import DeliveryETA from '../../components/checkout/DeliveryETA';
import AddressPanel from '../../components/checkout/AddressPanel';
import TipSelector from '../../components/checkout/TipSelector';
import PaymentSection from '../../components/checkout/PaymentSection';
import { useCartStore } from '../../store/useCartStore';
import '../../styles/checkout.css'; // Include checkout styles

export default function CheckoutFlow() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCartStore();

  // Redirect if cart is empty on mount (optional, but good practice)
  // For demo, we might allow viewing it empty or with a back button
  useEffect(() => {
    document.title = "Checkout - Wolfie Burgers";
  }, []);

  const handleCheckoutProceed = () => {
    // Navigate to confirmation page, passing a mock order ID
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    clearCart();
    navigate(`/order-confirmation/${orderId}`);
  };

  return (
    <div className="checkout-container text-white pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter gold-text">Wolfie Checkout</h1>
          <button 
            onClick={() => navigate('/')} 
            className="text-sm font-bold text-neutral-400 hover:text-white transition-colors"
          >
            ← Back to Menu
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 xl:col-span-8 space-y-6"
          >
            <DeliveryETA />
            <AddressPanel />
            <UpsellSuggestions />
            <TipSelector />
            <PaymentSection />
          </motion.div>

          {/* Right Column - Sticky Cart */}
          <div className="lg:col-span-5 xl:col-span-4 h-full relative">
            <StickyCart onCheckoutProceed={handleCheckoutProceed} />
          </div>

        </div>
      </div>
    </div>
  );
}
