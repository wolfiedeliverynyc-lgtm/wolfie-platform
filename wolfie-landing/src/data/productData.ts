export const productData = {
  sequences: [
    {
      frameCount: 112,
      framePrefix: '/frames/ezgif-frame-',
      frameSuffix: '.jpg',
      padLength: 3,
    },
    {
      frameCount: 180,
      framePrefix: '/frames2/ezgif-frame-',
      frameSuffix: '.jpg',
      padLength: 3,
    }
  ],
  sections: [
    {
      id: 'section-1',
      slides: [
        {
          title: 'CUSTOMERS',
          subtitle: 'WOLFIE.',
          description: 'Order from your favorite Brooklyn restaurants\nwith real-time tracking, no surprise fees,\nand delivery in under 30 minutes.',
          cta: 'Order Now →'
        },
        {
          title: 'Find Your Restaurant',
          subtitle: 'STEP 1',
          description: 'Search by cuisine, neighborhood, or restaurant name.\nFilter by distance and rating.',
        },
        {
          title: 'Order & Pay Securely',
          subtitle: 'STEP 2',
          description: 'Add to cart, pay by card or cash on delivery.\nNo account required — guest checkout available.',
        },
        {
          title: 'Track in Real Time',
          subtitle: 'STEP 3',
          description: 'Watch your driver live on the map.\nGet notified at every step.',
          cta: 'Start Ordering →'
        }
      ]
    },
    {
      id: 'section-2',
      title: 'Keep More. Grow Faster.',
      subtitle: 'RESTAURANTS',
      description: "10-18% commission vs DoorDash's 30%.\nOwn your customer data. Get paid weekly.\nFirst 20 orders completely free.",
      cta: 'Join Wolfie Free →'
    },
    {
      id: 'section-3',
      title: 'Earn More. Drive Smart.',
      subtitle: 'DRIVERS 🛵',
      description: '$4 base + $0.80/km + 100% of your tips.\nNo algorithms cutting your income.\nFirst month subscription free.',
      cta: 'Start Driving →'
    }
  ],
  marquee: "WOLFIE DELIVERY · BROOKLYN NYC /// $4 BASE DRIVER PAY /// 22 MIN AVERAGE /// 10% RESTAURANT FEE /// CASH ON DELIVERY /// ORDER NOW — WILLIAMSBURG /// BEDFORD-STUYVESANT NOW ACTIVE /// ",
  protocol: [
    {
      step: '01',
      icon: '📍',
      title: 'LOCK IN',
      desc: 'Open the Wolfie PWA — no app install. Browse verified Brooklyn restaurants in real time.'
    },
    {
      step: '02',
      icon: '⚡',
      title: 'DISPATCH',
      desc: 'Smart algorithm matches the nearest rated driver by distance, rating, and vehicle type.'
    },
    {
      step: '03',
      icon: '🗺️',
      title: 'TRACK LIVE',
      desc: 'Mapbox GPS tracking. Twilio SMS updates. Cash at the door. No surprises.'
    }
  ],
  whyWolfie: [
    {
      icon: '🍕',
      title: 'RESTAURANTS',
      desc: "10–15% commission vs competitors' 25–30%. Keep more of every order. 7-day free trial."
    },
    {
      icon: '🐺',
      title: 'DRIVERS',
      desc: '$4 base + $0.80/km guaranteed. No hidden deductions. Real-time dispatch. You earn what you drive.'
    },
    {
      icon: '🏙️',
      title: 'CUSTOMERS',
      desc: 'Lower fees passed to you. Faster delivery. Live tracking. Cash on delivery — no card needed.'
    }
  ]
};
