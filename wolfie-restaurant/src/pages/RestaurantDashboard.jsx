import React, { useEffect, useState } from 'react';
import { useRestaurantStore, mapBackendOrderToClient } from '../store/useRestaurantStore';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import SupportModal from '../components/SupportModal';
import { useRestaurantSocket } from '../hooks/useRestaurantSocket';

// Styles
import '../styles/dashboard.css';

// Subpage Views
import Orders from './Orders';
import KitchenDisplay from './KitchenDisplay';
import MenuManagement from './MenuManagement';
import Analytics from './Analytics';
import FinanceDashboard from './Finance';
import SettingsPage from './SettingsPage';
import Reviews from './Reviews';
import OnboardingIndex from './Onboarding';

export default function RestaurantDashboard() {
  const { activePage, onboarding, fetchAndHydrateAll } = useRestaurantStore();
  const [loading, setLoading] = useState(true);
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?.id;

  useRestaurantSocket(restaurantId, {
    onNewOrder: (data) => {
      const mapped = mapBackendOrderToClient(data);
      if (mapped) {
        useRestaurantStore.setState(s => {
          if (s.orders.some(o => o.id === mapped.id)) return s;
          return { orders: [mapped, ...s.orders] };
        });
      }
    },
    onOrderUpdate: (data) => {
      useRestaurantStore.setState(s => ({
        orders: s.orders.map(o => {
          if (o.id === data.id) {
            const mappedUpdate = mapBackendOrderToClient(data);
            return mappedUpdate ? { ...o, ...mappedUpdate } : { ...o, ...data };
          }
          return o;
        })
      }));
    }
  });

  useEffect(() => {
    async function init() {
      try {
        await fetchAndHydrateAll();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center font-['Poppins',sans-serif] text-white select-none">
        <div className="w-16 h-16 border-2 border-[#FFE100]/20 border-t-[#FFE100] rounded-full animate-spin mb-4" />
        <span className="text-[11px] uppercase tracking-[0.2em] font-black text-[#FFE100] animate-pulse">Syncing Telemetry...</span>
      </div>
    );
  }

  if (onboarding && (onboarding.kycStatus === 'pending' || onboarding.kycStatus === 'rejected' || !onboarding.isActive)) {
    return <PendingApproval />;
  }

  if (onboarding && onboarding.status === 'incomplete') {
    return <OnboardingIndex />;
  }

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
      case 'overview':
        return <DashboardGrid />;
      case 'orders':
        return <Orders />;
      case 'kds':
        return <KitchenDisplay />;
      case 'menu':
        return <MenuManagement />;
      case 'analytics':
        return <Analytics />;
      case 'reviews':
        return <Reviews />;
      case 'finance':
        return <FinanceDashboard />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardGrid />;
    }
  };

  return (
    <div className="dashboard-wrapper-root">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="dashboard-main-content">
        {/* Persistent Top Header */}
        <TopBar />

        {/* Viewport for Active Router Subpages */}
        <div style={{ flexGrow: 1, position: 'relative' }}>
          {renderActiveView()}
        </div>
      </div>

      {/* Global Support Ticket Modal Escalation */}
      <SupportModal />
    </div>
  );
}
