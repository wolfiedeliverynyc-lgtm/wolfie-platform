"use client";
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Order, Driver, Merchant } from "@/types";
import { useDashboardStore } from "@/stores/dashboardStore";

interface MapComponentProps {
  orders: Order[];
  drivers: Driver[];
  selectedDriverId?: string;
  selectedOrderId?: string;
  selectedMerchantId?: string;
  viewMode: 'overview' | 'drivers' | 'orders' | 'hotspots';
  onSelectDriver?: (driverId: string | undefined) => void;
  onSelectOrder?: (orderId: string | undefined) => void;
  onSelectMerchant?: (merchantId: string | undefined) => void;
}

const ZONE_COORDS: { [key: string]: [number, number] } = {
  "Algiers Centre": [36.7525, 3.0588],
  "El Biar":        [36.7692, 3.0333],
  "Bab Ezzouar":    [36.7262, 3.1825],
  "Hussein Dey":    [36.7447, 3.0931],
  "Kouba":          [36.7275, 3.0861],
  "Ain Taya":       [36.7936, 3.2422]
};

export default function MapComponent({
  orders,
  drivers,
  selectedDriverId,
  selectedOrderId,
  selectedMerchantId,
  viewMode,
  onSelectDriver,
  onSelectOrder,
  onSelectMerchant
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Read merchants state directly from Zustand for real-time operations overlay
  const merchants = useDashboardStore((state) => state.merchants);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Algiers Center
    const center: [number, number] = [36.7525, 3.0588];
    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 12.5,
      zoomControl: false
    });

    // Premium minimal grayscale tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Helpers for coordinates
  const getMerchantCoords = (merchantId: string | undefined, zone: string | undefined): [number, number] => {
    const safeZone = zone || "Algiers Centre";
    const base = ZONE_COORDS[safeZone] || ZONE_COORDS["Algiers Centre"];
    if (!merchantId) return base;
    const seed = merchantId.charCodeAt(0) + (merchantId.charCodeAt(merchantId.length - 1) || 0);
    return [
      base[0] + (Math.sin(seed) * 0.006),
      base[1] + (Math.cos(seed) * 0.006)
    ];
  };

  const getCustomerCoords = (customerId: string | undefined, zone: string | undefined): [number, number] => {
    const safeZone = zone || "Algiers Centre";
    const base = ZONE_COORDS[safeZone] || ZONE_COORDS["Algiers Centre"];
    if (!customerId) return base;
    const seed = customerId.charCodeAt(0) + (customerId.charCodeAt(customerId.length - 1) || 0);
    return [
      base[0] + (Math.sin(seed) * 0.016),
      base[1] + (Math.cos(seed) * 0.016)
    ];
  };

  const getDriverCoords = (driver: Driver): [number, number] => {
    if (driver.lat !== undefined && driver.lng !== undefined) {
      return [driver.lat, driver.lng];
    }
    const base = ZONE_COORDS[driver.zone] || ZONE_COORDS["Algiers Centre"];
    const seed = driver.id.charCodeAt(0) + (driver.id.charCodeAt(driver.id.length - 1) || 0);
    return [
      base[0] + (Math.sin(seed) * 0.012),
      base[1] + (Math.cos(seed) * 0.012)
    ];
  };

  // Update Markers and lines
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    const map = mapRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // 1. Draw Hotspots / Zone Demand circles
    if (viewMode === 'hotspots' || viewMode === 'overview') {
      Object.entries(ZONE_COORDS).forEach(([zone, coords]) => {
        const zoneOrders = orders.filter(o => o.zone === zone && o.status !== 'completed' && o.status !== 'cancelled').length;
        if (zoneOrders > 0) {
          L.circle(coords, {
            color: 'var(--accent)',
            fillColor: 'var(--accent)',
            fillOpacity: 0.08 + (zoneOrders * 0.03),
            radius: 800 + (zoneOrders * 120),
            weight: 1
          })
          .bindTooltip(`<b>${zone} Dispatch Zone</b><br/>${zoneOrders} active orders`, { permanent: false, direction: 'top' })
          .addTo(layer);
        }
      });
    }

    // Helper: Polyline status colors
    const getPolylineColor = (order: Order) => {
      if (order.priority) return 'var(--status-red)';
      if (order.status === 'preparing') return 'var(--status-amber)';
      if (order.status === 'pending') return 'var(--status-blue)';
      if (order.status === 'delivering') return '#a855f7'; // Purple for dispatch picked-up/in-transit
      return 'var(--text-muted)';
    };

    // 2. Render Restaurants / Merchants
    if (viewMode === 'overview' || viewMode === 'orders' || selectedMerchantId) {
      merchants.forEach((merchant) => {
        const coords = getMerchantCoords(merchant.id, merchant.zone);
        const isSelected = selectedMerchantId === merchant.id;
        
        let statusColor = 'var(--status-green)';
        let statusLabel = 'Open';
        
        if (merchant.operational_status === 'paused' || merchant.status === 'paused') {
          statusColor = 'var(--status-gray)';
          statusLabel = 'Paused';
        } else if (merchant.operational_status === 'busy') {
          statusColor = 'var(--status-amber)';
          statusLabel = 'Busy';
        } else if (merchant.operational_status === 'delayed') {
          statusColor = 'var(--status-red)';
          statusLabel = 'Delayed';
        } else if (merchant.status === 'suspended') {
          statusColor = 'var(--status-red)';
          statusLabel = 'Suspended';
        }

        const iconHtml = `
          <div style="
            background-color: ${statusColor}; 
            width: ${isSelected ? '28px' : '22px'}; 
            height: ${isSelected ? '28px' : '22px'}; 
            border-radius: var(--radius-sm); 
            border: 2px solid ${isSelected ? 'var(--text-primary)' : '#fff'}; 
            box-shadow: var(--shadow-md); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: ${isSelected ? '13px' : '11px'};
            cursor: pointer;
            transition: all 0.1s ease;
          ">
            🏪
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-merchant-icon',
          html: iconHtml,
          iconSize: isSelected ? [28, 28] : [22, 22],
          iconAnchor: isSelected ? [14, 14] : [11, 11]
        });

        const marker = L.marker(coords, { icon })
          .bindTooltip(`
            <div style="font-family: var(--font-sans); font-size: 11px; padding: 2px;">
              <b>${merchant.name}</b> (${statusLabel})<br/>
              Rating: ★ ${merchant.rating} · Prep Delay: ${merchant.prep_delay_minutes || 0}m
            </div>
          `, { direction: 'top' })
          .addTo(layer);

        marker.on('click', () => {
          if (onSelectMerchant) {
            onSelectMerchant(isSelected ? undefined : merchant.id);
          }
        });

        if (isSelected) {
          map.setView(coords, 14, { animate: false });
        }
      });
    }

    // 3. Render Drivers
    if (viewMode === 'overview' || viewMode === 'drivers' || selectedDriverId) {
      drivers.forEach((driver) => {
        if (driver.status === 'offline' && viewMode === 'drivers') return;

        const coords = getDriverCoords(driver);
        const isSelected = selectedDriverId === driver.id;

        const color = driver.status === 'delivering' ? 'var(--status-blue)' 
                    : driver.status === 'preparing' ? 'var(--status-amber)'
                    : driver.status === 'available' ? 'var(--status-green)' 
                    : 'var(--status-gray)';

        const emoji = driver.status === 'delivering' ? '🚚' 
                    : driver.status === 'preparing' ? '🥡' 
                    : driver.status === 'available' ? '⚡' 
                    : '💤';

        const markerHtml = `
          <div style="position: relative; cursor: pointer;">
            ${isSelected ? `
              <div style="
                position: absolute;
                top: -6px;
                left: -6px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 2px dashed var(--accent);
                animation: spin 6s linear infinite;
              "></div>
            ` : ''}
            <div style="
              background-color: ${color}; 
              width: ${isSelected ? '26px' : '20px'}; 
              height: ${isSelected ? '26px' : '20px'}; 
              border-radius: 50%; 
              border: 2px solid ${isSelected ? 'var(--text-primary)' : '#fff'}; 
              box-shadow: var(--shadow-md); 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: ${isSelected ? '12px' : '10px'};
              transition: all 0.1s ease;
            ">
              ${emoji}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-driver-icon',
          html: markerHtml,
          iconSize: isSelected ? [26, 26] : [20, 20],
          iconAnchor: isSelected ? [13, 13] : [10, 10]
        });

        const marker = L.marker(coords, { icon })
          .bindTooltip(`
            <div style="font-family: var(--font-sans); font-size: 11px; padding: 2px;">
              <b>${driver.name}</b> (${driver.status})<br/>
              Zone: ${driver.zone} · Rating: ★ ${driver.rating}<br/>
              ${driver.current_order_id ? `Active order: ${driver.current_order_id}` : 'Idle (Available)'}
            </div>
          `, { direction: 'top' })
          .addTo(layer);

        marker.on('click', () => {
          if (onSelectDriver) {
            onSelectDriver(isSelected ? undefined : driver.id);
          }
        });

        if (isSelected) {
          map.setView(coords, 14, { animate: false });
        }
      });
    }

    // 4. Render Active Orders (Restaurant -> Customer) and Driver Polylines
    orders.forEach((order) => {
      if (order.status === 'completed' || order.status === 'cancelled') return;

      const merchantIdToUse = (order as any).restaurant_id || order.merchant_id || "unknown";
      const restCoords = getMerchantCoords(merchantIdToUse, order.zone);
      const custCoords = getCustomerCoords(order.customer_id, order.zone);
      const isSelected = selectedOrderId === order.id;

      // Filter modes
      if (viewMode === 'drivers' && !isSelected) return;

      // Draw Customer Destination Marker
      const customerIconHtml = `
        <div style="
          background-color: var(--accent); 
          width: ${isSelected ? '22px' : '16px'}; 
          height: ${isSelected ? '22px' : '16px'}; 
          border-radius: 50%; 
          border: 2px solid ${isSelected ? 'var(--text-primary)' : '#fff'}; 
          box-shadow: var(--shadow-sm); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: ${isSelected ? '11px' : '9px'};
          cursor: pointer;
        ">
          📍
        </div>
      `;
      const custIcon = L.divIcon({
        className: 'custom-customer-icon',
        html: customerIconHtml,
        iconSize: isSelected ? [22, 22] : [16, 16],
        iconAnchor: isSelected ? [11, 11] : [8, 8]
      });

      const custMarker = L.marker(custCoords, { icon: custIcon })
        .bindTooltip(`
          <div style="font-family: var(--font-sans); font-size: 11px; padding: 2px;">
            <b>To: ${order.customer_name}</b> (Customer)<br/>
            Order: #${order.id} · Priority: ${order.priority ? 'HIGH' : 'Normal'}
          </div>
        `, { direction: 'top' })
        .addTo(layer);

      custMarker.on('click', () => {
        if (onSelectOrder) {
          onSelectOrder(isSelected ? undefined : order.id);
        }
      });

      // Draw route line connecting Restaurant -> Customer
      const routeColor = getPolylineColor(order);
      const routeLine = L.polyline([restCoords, custCoords], {
        color: routeColor,
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.95 : 0.5,
        dashArray: order.status === 'preparing' ? '5, 8' : undefined
      }).addTo(layer);

      // Add tooltip showing ETA
      routeLine.bindTooltip(`
        <div style="font-family: var(--font-sans); font-size: 10px; padding: 1px 3px;">
          <b>Order #${order.id.substring(4)}</b> (${order.status})<br/>
          ETA: ${order.eta_minutes || '?'} mins
        </div>
      `, { sticky: true });

      routeLine.on('click', () => {
        if (onSelectOrder) {
          onSelectOrder(isSelected ? undefined : order.id);
        }
      });

      // Draw Driver -> Restaurant Polyline if assigned
      if (order.driver_id) {
        const driverObj = drivers.find(d => d.id === order.driver_id);
        if (driverObj) {
          const driverCoords = getDriverCoords(driverObj);
          
          // Only draw connection to merchant if not completed
          L.polyline([driverCoords, restCoords], {
            color: '#a855f7', // Purple dash line for driver pickup heading
            weight: isSelected ? 3 : 1.5,
            opacity: isSelected ? 0.8 : 0.35,
            dashArray: '4, 6'
          })
          .bindTooltip(`Driver ${driverObj.name} heading to pickup`, { sticky: true })
          .addTo(layer);
        }
      }

      if (isSelected) {
        map.fitBounds([restCoords, custCoords], { padding: [50, 50], animate: false });
      }
    });

  }, [orders, drivers, merchants, selectedDriverId, selectedOrderId, selectedMerchantId, viewMode, onSelectDriver, onSelectOrder, onSelectMerchant]);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-lg)" }} />;
}
