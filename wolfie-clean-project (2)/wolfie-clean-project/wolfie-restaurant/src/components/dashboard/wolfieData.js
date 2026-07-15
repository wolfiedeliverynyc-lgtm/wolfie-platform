import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Megaphone, BarChart3, Star, UserPlus, Package, Truck, Wallet, LifeBuoy, Settings } from 'lucide-react';

export const wolfieData = [
  {
    id: 'overview',
    title: 'Dashboard Overview',
    className: 'accent-solid-orange',
    icon: LayoutDashboard,
    details: {
      purpose: 'Provide a high-level, real-time snapshot of the restaurant’s operational and financial performance.',
      features: [
        'Total Revenue, Revenue Today/Week/Month',
        'Total Orders, Orders Today, Average Order Value',
        'New vs Returning Customers, Conversion Rate',
        'Order Success Rate, Peak Ordering Hours',
        'Top Selling Items, Recent Activity Feed'
      ],
      userFlow: 'Manager logs into Wolfie OS -> Default landing page is Overview -> Scans KPIs to assess current daily performance -> Clicks into specific metrics to navigate to deeper modules (e.g., clicking Revenue goes to Analytics).',
      dataRequired: ['Aggregated sales data', 'Real-time order statuses', 'Customer cohort data', 'Time-series activity logs'],
      permissions: ['Owner', 'Store Manager'],
      kpis: ['Gross Merchandise Value (GMV)', 'Daily Active Orders', 'Average Order Value (AOV)'],
      actions: ['Investigate sudden drops in conversion', 'Check top-selling items to ensure sufficient inventory']
    }
  },
  {
    id: 'orders',
    title: 'Order Management',
    className: 'accent-blue',
    icon: ShoppingBag,
    details: {
      purpose: 'Facilitate the end-to-end lifecycle of incoming orders from placement to delivery/pickup.',
      features: [
        'Real-time incoming orders with visual/audio alerts',
        'Order Status Workflow (New, Accepted, Preparing, Ready, Picked Up, Delivered, Cancelled)',
        'Customer info & Order timeline',
        'Preparation timers, Bulk actions, Search & Filters',
        'Refund and Cancellation management'
      ],
      userFlow: 'Order comes in (chime plays) -> Kitchen staff clicks "Accept" -> Order moves to "Preparing" -> Prep timer starts -> Cook finishes and clicks "Ready" -> Driver arrives and order moves to "Picked Up".',
      dataRequired: ['Live socket connection for order payloads', 'Customer details', 'Item level details + modifiers', 'Driver ETA'],
      permissions: ['Owner', 'Store Manager', 'Kitchen Staff', 'Front of House'],
      kpis: ['Order Acceptance Time', 'Average Prep Time', 'Order Cancellation Rate'],
      actions: ['Accept new orders immediately', 'Contact customer if an item is out of stock', 'Process refunds for cancelled orders']
    }
  },
  {
    id: 'menu',
    title: 'Menu Management',
    className: 'pattern-bg',
    icon: UtensilsCrossed,
    details: {
      purpose: 'Allow granular control over the restaurant’s offerings, pricing, and availability.',
      features: [
        'Categories, Products, Variants, Add-ons, Modifier Groups',
        'Pricing & Availability Scheduling',
        'Product Images & Inventory Tracking',
        'Item Visibility & Bulk Product Editing'
      ],
      userFlow: 'Manager navigates to Menu -> Selects "Add Product" -> Uploads image, sets price, assigns to category "Mains" -> Adds modifier group "Spice Level" -> Saves and publishes to live app.',
      dataRequired: ['Product catalog schema', 'Image CDN URLs', 'Time-based availability rules', 'Stock count integers'],
      permissions: ['Owner', 'Store Manager'],
      kpis: ['Menu Conversion Rate', 'Menu Item Views vs Cart Adds'],
      actions: ['86 (mark out of stock) items instantly', 'Schedule breakfast menu visibility', 'Update pricing across all variants']
    }
  },
  {
    id: 'customers',
    title: 'Customer Management',
    className: '',
    icon: Users,
    details: {
      purpose: 'Act as a lightweight CRM to understand and retain the restaurant’s customer base.',
      features: [
        'Customer Directory & Profiles',
        'Order History & Repeat Customer Tracking',
        'Customer Lifetime Value (CLV)',
        'Customer Notes, VIP Status, Loyalty Info'
      ],
      userFlow: 'Manager searches for a specific customer name -> Opens profile -> Views past 5 orders to understand preferences -> Adds internal note: "Allergic to peanuts" -> Tags as VIP.',
      dataRequired: ['User identity data (PII masked where appropriate)', 'Aggregated historical order data per user', 'Custom tagging system'],
      permissions: ['Owner', 'Store Manager'],
      kpis: ['Customer Lifetime Value (CLV)', 'Repeat Purchase Rate', 'Customer Churn Rate'],
      actions: ['Identify high-value customers for targeted promotions', 'Review notes before preparing an order for a VIP']
    }
  },

  {
    id: 'analytics',
    title: 'Analytics & Reports',
    className: 'accent-blue',
    icon: BarChart3,
    details: {
      purpose: 'Provide deep, exportable insights into sales, operations, menu performance, and customer growth.',
      features: [
        'Sales Analytics (Revenue Trends, AOV, Daily/Weekly/Monthly Reports)',
        'Operational Analytics (Prep Time, Acceptance/Completion Rates)',
        'Menu Analytics (Best/Worst Sellers)',
        'Customer Analytics (Retention, Growth)'
      ],
      userFlow: 'Owner navigates to Analytics -> Selects "Last 30 Days" date range -> Filters by "Menu Analytics" -> Identifies worst-selling items -> Exports report to CSV for accounting.',
      dataRequired: ['Data warehouse querying', 'Historical transaction data', 'Time-series activity logs'],
      permissions: ['Owner'],
      kpis: ['Net Revenue', 'Operational Efficiency Score', 'Sales Growth MoM'],
      actions: ['Identify bottlenecks in prep time', 'Remove worst-selling items from the menu', 'Reconcile monthly sales']
    }
  },
  {
    id: 'reviews',
    title: 'Reviews & Ratings',
    className: '',
    icon: Star,
    details: {
      purpose: 'Monitor and manage the restaurant’s public reputation on the Wolfie platform.',
      features: [
        'Customer Reviews feed',
        'Ratings Breakdown (Food quality, Delivery speed, etc.)',
        'Review Responses & Negative Review Alerts',
        'Performance Monitoring'
      ],
      userFlow: 'Manager receives alert for a 1-star review -> Opens review -> Reads customer complaint about cold food -> Replies publicly with an apology and a discount code -> Flags review for internal QA.',
      dataRequired: ['User-generated content (UGC) text', 'Star rating numeric values', 'Reply thread schema'],
      permissions: ['Owner', 'Store Manager'],
      kpis: ['Average Star Rating', 'Review Response Rate', 'Negative Review Ratio'],
      actions: ['Reply to all reviews under 3 stars', 'Track recurring complaints about specific items']
    }
  },

  {
    id: 'inventory',
    title: 'Inventory Management',
    className: 'accent-solid-orange',
    icon: Package,
    details: {
      purpose: 'Track stock levels, prevent stockouts, and manage ingredient costs.',
      features: [
        'Inventory Levels & Ingredient Tracking',
        'Low Stock Alerts & Out of Stock Automation',
        'Purchase Tracking & Waste Tracking'
      ],
      userFlow: 'System detects Burger Buns are below threshold -> Triggers "Low Stock Alert" -> Automatically marks specific burgers as "Out of Stock" on the menu -> Manager logs waste at end of day.',
      dataRequired: ['Recipe/BOM (Bill of Materials) mapping', 'Current stock ledger', 'Threshold alert configurations'],
      permissions: ['Owner', 'Store Manager', 'Kitchen Staff'],
      kpis: ['Stockout Frequency', 'Food Waste Percentage', 'Cost of Goods Sold (COGS)'],
      actions: ['Reorder ingredients triggered by low stock alerts', 'Log daily waste', 'Update theoretical vs actual inventory counts']
    }
  },
  {
    id: 'delivery',
    title: 'Delivery Management',
    className: 'accent-blue',
    icon: Truck,
    details: {
      purpose: 'Coordinate and track the last-mile logistics of orders fulfilled by Wolfie drivers.',
      features: [
        'Driver Assignment Status',
        'Pickup & Delivery Tracking (Map view)',
        'Delivery Performance & Times',
        'Failed Deliveries management'
      ],
      userFlow: 'Order is ready -> Manager checks Delivery screen -> Sees driver is 2 mins away on map -> Hands food to driver -> Tracks driver icon to customer’s house -> Confirms successful delivery status.',
      dataRequired: ['GPS telemetry from driver app', 'Dispatch assignment webhooks', 'Geospatial mapping integration'],
      permissions: ['Owner', 'Store Manager', 'Front of House'],
      kpis: ['Average Delivery Time', 'Driver Wait Time at Restaurant', 'Failed Delivery Rate'],
      actions: ['Report driver issues', 'Monitor active deliveries for delays', 'Coordinate with support for failed deliveries']
    }
  },
  {
    id: 'wallet',
    title: 'Wallet & Payouts',
    className: '',
    icon: Wallet,
    details: {
      purpose: 'Manage restaurant finances, view earnings, and handle bank payouts.',
      features: [
        'Available & Pending Balance',
        'Upcoming Payouts & Transaction History',
        'Commission Breakdown & Refund Deductions',
        'Financial Reports & Downloadable Statements'
      ],
      userFlow: 'Owner checks Wallet on Monday -> Sees Pending Balance moving to Available -> Verifies Commission deductions -> Clicks "Withdraw" to bank account -> Downloads monthly statement for accountant.',
      dataRequired: ['Ledger/Double-entry accounting system', 'Banking/Stripe Connect integration', 'Commission calculation engine'],
      permissions: ['Owner'],
      kpis: ['Net Payout Amount', 'Platform Commission Fees', 'Refund Deductions'],
      actions: ['Reconcile weekly payouts', 'Download tax statements', 'Update bank routing details']
    }
  },
  {
    id: 'support',
    title: 'Support Center',
    className: 'pattern-bg',
    icon: LifeBuoy,
    details: {
      purpose: 'Provide immediate assistance to restaurant staff for platform or order issues.',
      features: [
        'Support Tickets & Ticket History',
        'Live Chat with Wolfie Support',
        'Issue Reporting (e.g., tablet broken, payment failed)',
        'Knowledge Base / Help Articles'
      ],
      userFlow: 'Printer stops working -> Manager goes to Support Center -> Searches Knowledge Base for "Printer setup" -> Follows steps -> If unresolved, opens Live Chat with Wolfie agent.',
      dataRequired: ['Zendesk/Intercom integration', 'Article CMS', 'Ticketing state machine'],
      permissions: ['Owner', 'Store Manager', 'Front of House'],
      kpis: ['Time to Resolution (TTR)', 'Support Ticket Volume'],
      actions: ['Chat with live support for active order emergencies', 'Read feature release notes']
    }
  },
  {
    id: 'settings',
    title: 'Restaurant Settings',
    className: 'accent-solid-orange',
    icon: Settings,
    details: {
      purpose: 'Configure core business logic and operational parameters for the restaurant.',
      features: [
        'Business Info (Name, Logo, Address)',
        'Operating Hours & Delivery Zones',
        'Pickup, Tax, and Payment Settings',
        'Notification Preferences & API Integrations'
      ],
      userFlow: 'Holiday approaches -> Owner opens Settings -> Edits "Operating Hours" to add holiday closure -> Updates Tax Settings based on new local laws -> Saves changes.',
      dataRequired: ['Core tenant/restaurant configuration payload', 'Geo-fencing coordinates', 'Tax rate tables'],
      permissions: ['Owner'],
      kpis: ['Profile Completeness Score'],
      actions: ['Adjust delivery radius based on kitchen capacity', 'Integrate third-party POS API', 'Toggle SMS notifications']
    }
  }
];
