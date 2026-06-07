import { create } from 'zustand';
import { Order, Message, NotificationItem, OrderStatus, Restaurant } from '../lib/types';

interface RealtimeState {
  activeOrder: Order | null;
  messages: Message[];
  notifications: NotificationItem[];
  pathPercent: number;
  
  // Actions
  setActiveOrder: (order: Order | null) => void;
  addMessage: (text: string, sender: 'user' | 'rider') => void;
  addNotification: (title: string, body: string, type: NotificationItem['type']) => void;
  dismissNotification: (id: string) => void;
  updateOrderStatus: (status: OrderStatus) => void;
  setPathPercent: (percent: number) => void;
  startOrderSimulation: (order: Order) => void;
  accelerateSimulation: () => void;
  resetSimulation: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => {
  let simulationTimer: NodeJS.Timeout | null = null;

  const clearTimer = () => {
    if (simulationTimer) {
      clearTimeout(simulationTimer);
      simulationTimer = null;
    }
  };

  const runSimulationStep = (status: OrderStatus) => {
    clearTimer();
    const { activeOrder, addNotification, addMessage } = get();
    if (!activeOrder) return;

    let delay = 0;
    let nextStatus: OrderStatus | null = null;
    let title = '';
    let body = '';
    let riderMessage = '';

    switch (status) {
      case 'placed':
        delay = 7000;
        nextStatus = 'preparing';
        title = 'Chef Handed Ticket! 👨‍🍳';
        body = `The culinary crew at ${activeOrder.restaurant.name} has accepted your order and is selecting fresh ingredients.`;
        break;
      case 'preparing':
        delay = 10000;
        nextStatus = 'cooking';
        title = 'Order Cooking 🍳';
        body = `Your selection is now sizzling over the flame! Headed to perfection.`;
        riderMessage = "Hi! Marcus here, your courier. I just arrived at the restaurant. Chef is finishing up your box now!";
        break;
      case 'cooking':
        delay = 12000;
        nextStatus = 'riding';
        title = 'Out for Delivery! 🚲';
        body = `Rider Marcus has sealed your thermal cargo and is navigating traffic. Follow him on the active radar!`;
        break;
      case 'riding':
        delay = 15000;
        nextStatus = 'arriving';
        title = 'Courier Arriving Soon! 🔔';
        body = `Your rider is coasting onto your block. Get ready for warm goodness!`;
        riderMessage = "Hey! Pulling up past the intersection now. Be outside in about 1 minute!";
        break;
      case 'arriving':
        delay = 12000;
        nextStatus = 'delivered';
        title = 'Order Delivered! 🎉';
        body = `Enjoy your meal from ${activeOrder.restaurant.name}! Rate your chef and rider experience in our feedback panel.`;
        break;
    }

    if (delay > 0 && nextStatus) {
      simulationTimer = setTimeout(() => {
        set((state) => {
          if (!state.activeOrder) return {};
          return {
            activeOrder: {
              ...state.activeOrder,
              status: nextStatus as OrderStatus
            }
          };
        });

        // Trigger notifications and messages
        addNotification(title, body, nextStatus === 'delivered' ? 'success' : (nextStatus === 'riding' || nextStatus === 'arriving' ? 'rider' : 'info'));
        
        if (riderMessage) {
          addMessage(riderMessage, 'rider');
        }

        // Trigger next phase
        runSimulationStep(nextStatus);
      }, delay);
    }
  };

  return {
    activeOrder: null,
    messages: [],
    notifications: [],
    pathPercent: 0,

    setActiveOrder: (order) => {
      clearTimer();
      set({ activeOrder: order });
      if (order) {
        runSimulationStep(order.status);
      }
    },

    addMessage: (text, sender) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        sender,
        text,
        timestamp: timeStr
      };

      set((state) => ({
        messages: [...state.messages, newMsg]
      }));

      // Simulate a funny courier response if the user sent a message
      if (sender === 'user') {
        setTimeout(() => {
          let responseText = "Got you! I'm focused on delivering this warm and pristine. Appreciate details!";
          const lower = text.toLowerCase();

          if (lower.includes('napkin') || lower.includes('sauce') || lower.includes('plate')) {
            responseText = "Sure thing! Just checked in with the kitchen staff, they shoved a stack of extras in the side pocket.";
          } else if (lower.includes('gate') || lower.includes('door') || lower.includes('buzz') || lower.includes('code')) {
            responseText = "Awesome, saved that secure access note. I will ping you when at the door lobby.";
          } else if (lower.includes('where') || lower.includes('status') || lower.includes('fast') || lower.includes('hurry')) {
            responseText = "Cruising along Broadway right now! Traffic is clean, so I should beat the estimated timer by 2 minutes.";
          } else if (lower.includes('thanks') || lower.includes('thank') || lower.includes('awesome')) {
            responseText = "A absolute pleasure! Always happy to deliver gourmet dishes in pristine shape. Ready to roll!";
          }

          get().addMessage(responseText, 'rider');
          get().addNotification('Rider Message Received 💬', 'Marcus: ' + responseText, 'rider');
        }, 1500);
      }
    },

    addNotification: (title, body, type) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newNotif: NotificationItem = {
        id: `notif_${Date.now()}`,
        title,
        body,
        type,
        time: timeStr
      };

      set((state) => ({
        notifications: [newNotif, ...state.notifications.slice(0, 4)]
      }));
    },

    dismissNotification: (id) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }));
    },

    updateOrderStatus: (status) => {
      clearTimer();
      set((state) => {
        if (!state.activeOrder) return {};
        return {
          activeOrder: {
            ...state.activeOrder,
            status
          }
        };
      });

      // Launch corresponding notification
      let title = '';
      let body = '';
      let type: NotificationItem['type'] = 'info';

      if (status === 'preparing') {
        title = 'Chef Received Ticket! 👨‍🍳';
        body = 'Meal prep started at the kitchen.';
        type = 'info';
      } else if (status === 'cooking') {
        title = 'Dish Is Cooking! 🍳';
        body = 'Simmering over premium elements.';
        type = 'alert';
      } else if (status === 'riding') {
        title = 'Out for Delivery! 🚲';
        body = 'Courier is moving along active Broadway radar lines.';
        type = 'rider';
      } else if (status === 'arriving') {
        title = 'Rider Arriving! 📍';
        body = 'Marcus is centering on your street coordinate. Get ready!';
        type = 'rider';
      } else if (status === 'delivered') {
        title = 'Order Completed! 🎉';
        body = 'Sealed BiteDash thermal parcel delivered securely.';
        type = 'success';
      }

      get().addNotification(title, body, type);
      
      // Resume simulation step from the new status
      runSimulationStep(status);
    },

    setPathPercent: (percent) => set({ pathPercent: percent }),

    startOrderSimulation: (order) => {
      clearTimer();
      set({
        activeOrder: order,
        messages: [
          { id: '1', sender: 'rider', text: "Hey! I'm prepping my e-bike gear now. I'll message you when I reach the kitchen.", timestamp: 'Just now' }
        ],
        pathPercent: 0,
      });
      runSimulationStep(order.status);
    },

    accelerateSimulation: () => {
      const { activeOrder, updateOrderStatus } = get();
      if (!activeOrder) return;

      const states: OrderStatus[] = ['placed', 'preparing', 'cooking', 'riding', 'arriving', 'delivered'];
      const currentIdx = states.indexOf(activeOrder.status);
      if (currentIdx !== -1 && currentIdx < states.length - 1) {
        const nextState = states[currentIdx + 1];
        updateOrderStatus(nextState);
      }
    },

    resetSimulation: () => {
      clearTimer();
      set({
        activeOrder: null,
        messages: [],
        pathPercent: 0
      });
    }
  };
});
