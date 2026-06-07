import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Home, DollarSign, ListOrdered, User } from 'lucide-react-native';
import { useDriverStore } from './src/store/useDriverStore';

import HomeScreen from './src/screens/HomeScreen';

// Dummy Screens for now
const EarningsScreen = () => (
  <View className="flex-1 bg-darkBg items-center justify-center">
    <Text className="text-white text-xl">Earnings Native</Text>
  </View>
);
const OrdersScreen = () => (
  <View className="flex-1 bg-darkBg items-center justify-center">
    <Text className="text-white text-xl">Orders Native</Text>
  </View>
);
const AccountScreen = () => (
  <View className="flex-1 bg-darkBg items-center justify-center">
    <Text className="text-white text-xl">Account Native</Text>
  </View>
);

function BottomNav() {
  const { activeTab, setActiveTab } = useDriverStore();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'earnings', icon: DollarSign, label: 'Earnings' },
    { id: 'orders', icon: ListOrdered, label: 'Orders' },
    { id: 'account', icon: User, label: 'Profile' }
  ] as const;

  return (
    <View className="h-20 bg-darkCard border-t border-darkBorder flex-row justify-around items-center px-4 pb-2">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => setActiveTab(item.id)}
            className="flex-col items-center justify-center w-16"
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#FF5A00' : '#737373'} />
            <Text className={`text-[10px] font-medium mt-1 ${isActive ? 'text-wolfieOrange' : 'text-[#737373]'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function App() {
  const { activeTab } = useDriverStore();

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'earnings': return <EarningsScreen />;
      case 'orders': return <OrdersScreen />;
      case 'account': return <AccountScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-darkBg">
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <View className="flex-1 relative overflow-hidden">
        {renderScreen()}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
