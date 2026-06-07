export interface LegalSection {
  title: string;
  content: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const legalData: LegalDocument[] = [
  {
    id: "terms-of-service",
    title: "Terms of Service",
    subtitle: "Account Eligibility, Payment Methods, Cancellations & Liabilities",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Project Legal Positioning",
        content: [
          "WOLFIE is positioned legally as a technology platform that connects customers, independent delivery drivers, and partner restaurants.",
          "WOLFIE is NOT a restaurant, a food manufacturer, a direct employer of drivers, or a transportation carrier. This distinction is critical for limiting liability and maintaining the independent contractor model for all courier operations."
        ]
      },
      {
        title: "Account Eligibility",
        content: [
          "Users must be at least 18 years old to register an account on the platform.",
          "Users under 18 may only use the platform under the direct involvement, supervision, and consent of a parent or legal guardian.",
          "This policy ensures stronger enforceability of digital contracts, aligns with standard United States platform regulations, and reduces legal exposure involving minors."
        ]
      },
      {
        title: "Payment Methods",
        content: [
          "Approved payment methods include major Credit/Debit Cards and secure electronic payment processors.",
          "Digital Wallets and local digital payment networks will be supported in future platform updates.",
          "Important Note: Cash on Delivery (COD) has been removed from our approved payment methods to protect our network from high fraud risk, fake orders, charge disputes, driver safety concerns, and to streamline operational complexity."
        ]
      },
      {
        title: "Order Cancellation Policy",
        content: [
          "Before Restaurant Acceptance: Customers may cancel their order freely for a full refund to their original payment method.",
          "After Restaurant Acceptance: Refund is not guaranteed once preparation has started. Partial charges may apply to cover ingredient costs.",
          "After Driver Pickup: Customers will usually be charged in full. Refunds at this stage are only issued if the issue qualifies under the Refund Policy."
        ]
      },
      {
        title: "Binding Arbitration Clause",
        content: [
          "By accepting these Terms of Service, you agree that any disputes arising under or relating to these Terms will be resolved through binding individual arbitration rather than in court.",
          "This clause reduces lawsuit exposure, prevents costly court litigation, and protects both parties against class-action lawsuits, in alignment with standard industry practices for major U.S. platforms."
        ]
      },
      {
        title: "Limitation of Liability",
        content: [
          "WOLFIE acts solely as a marketplace and technology intermediary.",
          "Restaurants remain solely responsible for food quality, food safety, allergen declarations, and preparation accuracy.",
          "Drivers remain solely responsible for vehicle operation, safe delivery, compliance with traffic regulations, and active vehicle insurance obligations."
        ]
      }
    ]
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    subtitle: "Data Collection, GPS Tracking, Marketing & Data Privacy Rights",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Information Collected",
        content: [
          "WOLFIE collects personal information to provide safe and efficient delivery services. This includes: Name, Email address, Phone number, and Billing/Payment metadata.",
          "We also collect Device information (IP address, operating system, and browser version), Order history, internal Chat/Communication messages, and general Usage analytics."
        ]
      },
      {
        title: "GPS & Location Tracking Disclosure",
        content: [
          "To facilitate smart dispatching and keep customers informed, WOLFIE tracks real-time location data.",
          "Explicit Location Sharing: We utilize real-time driver tracking, delivery tracking for customers, and background location usage during active deliveries for couriers. Background location tracking is legally required to ensure route efficiency and safety verification."
        ]
      },
      {
        title: "Purpose of Data Usage",
        content: [
          "Your data is used to coordinate order fulfillment and driver dispatching.",
          "We utilize tracking and transaction metadata for fraud prevention, dynamic pricing optimization, platform usage analytics, and customer support resolution.",
          "Additionally, data is used to improve our AI routing models and power marketing communications where permitted by law."
        ]
      },
      {
        title: "Marketing Communications",
        content: [
          "WOLFIE may send promotional emails, SMS notifications, and device push notifications regarding local restaurant deals and platform rewards.",
          "Users are provided with easy unsubscribe and opt-out mechanisms inside the application interface and footer of email communications, where legally required."
        ]
      },
      {
        title: "Data Sales Policy",
        content: [
          "WOLFIE does not sell personal user data to third parties.",
          "Exception: Data transfer may occur in connection with a corporate merger, acquisition, consolidation, restructuring, or the sale of company assets."
        ]
      }
    ]
  },
  {
    id: "driver-agreement",
    title: "Driver Agreement",
    subtitle: "Independent Contractor Terms, Compensation, Freedom & Responsibility",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Driver Classification",
        content: [
          "Drivers are classified legally as Independent Contractors, not employees, agents, or joint-venture representatives of WOLFIE.",
          "This classification limits employee-related liabilities and allows drivers the absolute freedom to run their operations independently."
        ]
      },
      {
        title: "Driver Freedom & Scheduling",
        content: [
          "Drivers have complete control over their schedule: you choose exactly when to work and when to go offline.",
          "There are no minimum working hours, no mandatory shifts, and no forced acceptance of orders.",
          "Drivers may reject any delivery offer without penalty. You can work for competing delivery platforms simultaneously and use your own vehicles and equipment."
        ]
      },
      {
        title: "Account Suspension Rules",
        content: [
          "While drivers are free to reject orders before acceptance, excessive failure to complete accepted deliveries, repeated patterns of platform abuse, delivery fraud, or platform manipulation may affect continued access to the system.",
          "This policy helps protect restaurant partners and customers while preserving independent contractor status by focusing enforcement strictly on post-acceptance completion."
        ]
      },
      {
        title: "Driver Financial Responsibility",
        content: [
          "As independent operators, drivers are fully responsible for their own operating expenses.",
          "This includes fuel, vehicle maintenance, vehicle insurance coverage, local and federal taxes, traffic tickets/tolls, and mobile data plans."
        ]
      },
      {
        title: "Tips Policy",
        content: [
          "Customer tips belong 100% to the driver once delivery is completed.",
          "Tips will not be reclaimed or adjusted by WOLFIE, except in proven cases of credit card fraud, duplicate transactions, or specific legal mandates. This protects driver earnings in accordance with U.S. labor and tip regulations."
        ]
      },
      {
        title: "Background Checks",
        content: [
          "Background checks are optional during the early MVP stage of our launch.",
          "Comprehensive criminal and identity verification screening will be recommended and implemented before scaling regional operations."
        ]
      }
    ]
  },
  {
    id: "restaurant-partner-agreement",
    title: "Restaurant Partner Agreement",
    subtitle: "Commission Structure, Quality Standards & Exclusivity Rules",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Commission Structure",
        content: [
          "WOLFIE charges partner restaurants a commission fee on successfully fulfilled delivery orders.",
          "The recommended commission fee range is 10%–15% (substantially lower than competitor rates of 25%–30%).",
          "Commission rates may vary based on partnership tiers, marketing exposure packages, and temporary promotional agreements."
        ]
      },
      {
        title: "Restaurant Responsibilities",
        content: [
          "Partner restaurants are solely responsible for menu accuracy, price parity compliance, and prompt food preparation.",
          "Restaurants must guarantee strict food safety compliance, professional packaging quality, and transparent allergen disclosures on all menu items uploaded."
        ]
      },
      {
        title: "Refund Allocation and Fault",
        content: [
          "Refund responsibilities are allocated based on the root cause of the delivery failure:",
          "Restaurant Fault: In cases of incorrect items, missing items, or poor food quality, the restaurant partner bears the refund responsibility.",
          "Driver Fault: In cases of driver mishandling or excessive delays caused by the driver, adjustments and chargebacks will be applied to the driver's payout.",
          "Platform Fault: For technical payment errors or pricing system anomalies, WOLFIE will issue platform credits or direct refunds at its own expense."
        ]
      },
      {
        title: "Non-Exclusivity Policy",
        content: [
          "WOLFIE does not require restaurant partners to be exclusive to our platform.",
          "Restaurants are free to work with any competing delivery networks. This reduces onboarding friction and fosters a fairer local commerce environment."
        ]
      }
    ]
  },
  {
    id: "refund-cancellation-policy",
    title: "Refund & Cancellation Policy",
    subtitle: "Refund Eligibility, Timelines, Credits & Abuse Prevention",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Full Refund Eligibility",
        content: [
          "Customers are eligible for a full refund under the following situations:",
          "1. The order was never delivered.",
          "2. A duplicate charge occurred due to a system processing issue.",
          "3. The restaurant closed unexpectedly after the order was accepted.",
          "4. A major delivery failure occurred (e.g., driver accident or massive delivery delay)."
        ]
      },
      {
        title: "Partial Refund Eligibility",
        content: [
          "Customers may receive a partial refund for issues such as missing items from their order, incorrect item preparation, or moderate food quality complaints.",
          "WOLFIE may issue app credits, promotional balances, or partial wallet compensation in lieu of cash refunds in certain dispute cases."
        ]
      },
      {
        title: "Refund Window",
        content: [
          "To qualify for a refund or account credit, customers must report all delivery issues or order discrepancies within 24 hours of the delivery timestamp.",
          "Reports made after 24 hours will be reviewed at the sole discretion of the WOLFIE support team."
        ]
      },
      {
        title: "Fraud & Abuse Protection",
        content: [
          "To maintain a sustainable local network, WOLFIE reserves the right to deny abusive refund requests, limit the number of claims per account, and investigate suspicious customer or driver claim activities."
        ]
      }
    ]
  },
  {
    id: "community-guidelines",
    title: "Community Guidelines",
    subtitle: "Code of Conduct for Customers, Drivers & Restaurant Partners",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Customer Conduct Rules",
        content: [
          "Customers must maintain a respectful environment. The following behaviors are strictly prohibited:",
          "- Placing fake orders or coordinates with intent to disrupt service.",
          "- Abuse of refunds, chargebacks, or platform promos.",
          "- Harassment, verbal abuse, or discrimination against delivery drivers or restaurant staff.",
          "- Using stolen payment methods, creating duplicate accounts, or posting false reviews.",
          "Violators face account suspension, platform bans, and legal action where necessary."
        ]
      },
      {
        title: "Driver Conduct Rules",
        content: [
          "Drivers must act professionally and drive safely. Prohibited activities include:",
          "- Sharing, selling, or leasing your driver account to third parties.",
          "- Using fake GPS spoofing apps or platform manipulation tools.",
          "- Tampering with, stealing, or eating customer orders.",
          "- Reckless or unsafe vehicle operation and harassment of customers or restaurant workers."
        ]
      },
      {
        title: "Restaurant Conduct Rules",
        content: [
          "Restaurants must provide accurate details and prepare hygienic food. Prohibited conduct includes:",
          "- Uploading misleading menu items, bait-and-switch pricing, or fake images.",
          "- Preparing unsafe, unhygienic, or expired food items.",
          "- Deliberately manipulating prep times, abusing promo rules, or refusing driver handoffs."
        ]
      },
      {
        title: "Enforcement Actions",
        content: [
          "WOLFIE actively enforces these guidelines to protect our Brooklyn grid.",
          "Enforcement progression includes: formal warnings, temporary account suspensions, and permanent platform bans. Illegal activity is immediately reported to local law enforcement."
        ]
      }
    ]
  },
  {
    id: "earnings-disclaimer",
    title: "Earnings Disclaimer",
    subtitle: "No Guaranteed Earnings, Market Variability & Projections",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "No Guaranteed Income",
        content: [
          "WOLFIE does not guarantee any specific minimum earnings, delivery volumes, hourly income rates, or order frequencies for delivery drivers.",
          "Individual driver earnings are highly variable and fluctuate based on live market conditions."
        ]
      },
      {
        title: "Factors Influencing Earnings",
        content: [
          "Your earnings will depend on several variables, including: local market demand, driver availability, geographical zones (Brooklyn neighborhoods), timing of delivery slots, order acceptance and completion rates, customer tipping activity, and general platform system conditions."
        ]
      },
      {
        title: "Promotional Estimates",
        content: [
          "Any income examples, earnings calculators, or promotional payouts displayed by WOLFIE are for illustrative purposes only.",
          "They do not constitute a promise or guarantee of actual earnings. Past performance does not indicate future results."
        ]
      }
    ]
  },
  {
    id: "intellectual-property-policy",
    title: "Intellectual Property Policy",
    subtitle: "Ownership, Branding, Scraping Restrictions & Licensing",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Ownership of WOLFIE Systems",
        content: [
          "All intellectual property rights associated with WOLFIE are owned exclusively by our company.",
          "This includes the WOLFIE name, brand logo, UI layouts, mobile applications, website designs, backend databases, dispatch/matching algorithms, proprietary pricing engines, AI models, source code, and all visual assets."
        ]
      },
      {
        title: "Usage Restrictions",
        content: [
          "Users are strictly prohibited from copying, modifying, distributing, or selling any part of the WOLFIE technology.",
          "You may not reverse engineer our software, crawl/scrape data using automated scripts, or exploit our systems for competitive business analysis."
        ]
      },
      {
        title: "Limited License",
        content: [
          "WOLFIE grants users a personal, limited, non-transferable, non-exclusive, and revocable license to access the platform.",
          "This license is granted solely for personal ordering or authorized delivery services. Violation of terms results in immediate license revocation."
        ]
      }
    ]
  },
  {
    id: "ai-automation-policy",
    title: "AI & Automation Policy",
    subtitle: "Algorithmic Dispatching, Dynamic Pricing & Machine Learning Models",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Use of Automated Systems",
        content: [
          "WOLFIE utilizes automated software and machine learning algorithms to improve platform speed and safety.",
          "These systems are used to automate order matching, calculate dynamic delivery pricing, identify fraudulent claims, score account risks, forecast ETA, and rank menu recommendations."
        ]
      },
      {
        title: "AI Dispatch & Matching",
        content: [
          "Our smart dispatch algorithm matches orders based on proximity, ratings, vehicle type, and current courier loads.",
          "This is designed to minimize delivery time and maximize driver efficiency without human bias."
        ]
      },
      {
        title: "Automated Decision Safeguards",
        content: [
          "WOLFIE maintains transparency in its algorithms.",
          "If an automated decision affects your account access (e.g., driver suspension), you have the right to request a manual review by a human operator through our support system."
        ]
      }
    ]
  },
  {
    id: "dmca-policy",
    title: "DMCA Policy",
    subtitle: "Copyright Complaints, Counter-Notices & Repeat Infringers",
    lastUpdated: "May 2026",
    sections: [
      {
        title: "Reporting Copyright Infringement",
        content: [
          "WOLFIE respects intellectual property rights. If you believe your copyrighted work is hosted on our platform without permission (e.g., in menu images), please submit a DMCA notice to our designated agent.",
          "Your notice must include: physical or electronic signature, description of the work, link to the infringing material, and your contact info."
        ]
      },
      {
        title: "Counter-Notices",
        content: [
          "If your content was removed by mistake, you may file a counter-notification.",
          "WOLFIE will forward the counter-notice to the original complaining party. If no lawsuit is filed within 10-14 days, the content may be restored."
        ]
      },
      {
        title: "Repeat Infringer Policy",
        content: [
          "We reserve the right to suspend or permanently disable the accounts of users, restaurants, or drivers who repeatedly violate copyright laws."
        ]
      }
    ]
  }
];
