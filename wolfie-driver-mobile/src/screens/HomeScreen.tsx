import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useDriverStore } from '../store/useDriverStore';

Mapbox.setAccessToken('pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ');

export default function HomeScreen() {
  const { isOnline, setOnline } = useDriverStore();
  const [isNavigating, setIsNavigating] = useState(false);

  const simulateOrder = () => {
    setIsNavigating(true);
  };

  if (!isOnline) {
    return (
      <View className="flex-1 bg-darkBg items-center justify-center p-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-32 h-32 bg-darkCard rounded-full items-center justify-center mb-6 border border-[#FF5A00]/20 shadow-[0_0_50px_rgba(255,90,0,0.15)]">
            <Text className="text-4xl">🐺</Text>
          </View>
          <Text className="text-3xl font-bold text-white mb-2 uppercase tracking-wider">
            Wolfie <Text className="text-wolfieOrange">Driver</Text>
          </Text>
          <Text className="text-[#A0A0A0] text-lg">Deliver fast. Earn more.</Text>
        </View>

        <TouchableOpacity 
          onPress={() => setOnline(true)}
          className="w-full max-w-sm h-16 bg-darkCard rounded-full border border-darkBorder items-center justify-center mb-8"
        >
          <Text className="text-wolfieOrange font-bold text-lg tracking-wider">Go Online</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active Map View
  if (isNavigating) {
    return (
      <View className="flex-1 bg-darkBg">
        <Mapbox.MapView 
          style={StyleSheet.absoluteFillObject}
          styleURL={Mapbox.StyleURL.Dark}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            zoomLevel={15}
            pitch={60}
            centerCoordinate={[-73.985, 40.745]}
            animationMode="flyTo"
            animationDuration={1000}
          />
          {/* Driver Marker */}
          <Mapbox.PointAnnotation id="driver" coordinate={[-73.985, 40.745]}>
            <View className="w-10 h-10 bg-white rounded-full border-4 border-[#333333] items-center justify-center shadow-xl">
              <Text className="text-2xl">🛵</Text>
            </View>
          </Mapbox.PointAnnotation>

          {/* Pickup Marker */}
          <Mapbox.PointAnnotation id="pickup" coordinate={[-73.988, 40.748]}>
            <View className="w-8 h-8 bg-wolfieOrange rounded-full border-4 border-white items-center justify-center shadow-lg">
              <Text className="text-white font-bold">P</Text>
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>

        {/* Floating Top Banner (Native Style) */}
        <View className="absolute top-12 left-4 right-4 bg-darkCard/90 p-4 rounded-xl border border-darkBorder flex-row justify-between items-center shadow-2xl">
          <View>
            <Text className="text-white font-bold text-lg">Navigating to Pickup</Text>
            <Text className="text-[#A3A3A3] text-sm">1.2 km • 5 min away</Text>
          </View>
          <TouchableOpacity onPress={() => setIsNavigating(false)} className="bg-[#333333] px-4 py-2 rounded-lg">
            <Text className="text-white font-bold uppercase text-xs">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Online Dashboard View
  return (
    <View className="flex-1 bg-darkBg">
      <View className="pt-16 pb-4 px-6 flex-row justify-between items-center">
        <TouchableOpacity onPress={simulateOrder} className="p-2 bg-darkCard rounded-full">
          <Text className="text-wolfieOrange">🗺️</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-[#28A745]" />
          <Text className="text-[#28A745] font-semibold text-sm">You're Online</Text>
        </View>
        <View className="p-2" />
      </View>

      <View className="px-6 flex-1">
        <View className="bg-darkCard rounded-2xl p-6 border border-darkBorder mb-6 shadow-xl">
          <Text className="text-[#A3A3A3] text-sm mb-1">Today's Earnings</Text>
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-4xl font-bold text-white">$128.45</Text>
            <View className="bg-[#28A745]/20 px-2 py-1 rounded">
              <Text className="text-[#28A745] text-xs font-bold">▲ 14%</Text>
            </View>
          </View>
          <Text className="text-[#737373] text-sm mb-6">4 Orders Completed</Text>
          
          <View className="flex-row gap-4">
            <View className="flex-1 bg-[#1A1A1A] rounded-xl p-3 items-center border border-darkBorder">
              <Text className="text-[#A3A3A3] text-[10px] uppercase tracking-wider mb-1">Online</Text>
              <Text className="text-white font-bold">4h 32m</Text>
            </View>
            <View className="flex-1 bg-[#1A1A1A] rounded-xl p-3 items-center border border-darkBorder">
              <Text className="text-[#A3A3A3] text-[10px] uppercase tracking-wider mb-1">Active</Text>
              <Text className="text-white font-bold">3h 12m</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          onPress={simulateOrder}
          className="w-full py-4 mb-4 bg-darkCard border border-wolfieOrange rounded-xl items-center"
        >
          <Text className="text-wolfieOrange font-bold">Simulate Order (Native Map)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setOnline(false)}
          className="w-full py-4 bg-darkCard border border-darkBorder rounded-xl items-center"
        >
          <Text className="text-white font-bold">Switch to Offline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
