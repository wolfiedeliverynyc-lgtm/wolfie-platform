import { Package, Clock, MapPin } from 'lucide-react'

export default function OrdersPage() {
  const pastOrders = [
    { id: '#WF-1092', restaurant: 'Pizza Palace', customer: 'Sarah M.', date: 'Today, 2:30 PM', status: 'Delivered', earn: '$12.50' },
    { id: '#WF-1091', restaurant: 'Burger King', customer: 'Mike T.', date: 'Today, 1:15 PM', status: 'Delivered', earn: '$8.20' },
    { id: '#WF-1089', restaurant: 'Sushi Central', customer: 'Emily R.', date: 'Yesterday, 8:45 PM', status: 'Delivered', earn: '$15.75' },
    { id: '#WF-1088', restaurant: 'Taco Bell', customer: 'John S.', date: 'Yesterday, 7:20 PM', status: 'Cancelled', earn: '$0.00' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto pb-24 text-white">
      <div className="pt-12 px-6 pb-6">
        <h1 className="text-2xl font-bold mb-6">Delivery History</h1>

        <div className="space-y-4">
          {pastOrders.map((order, i) => (
            <div key={i} className="bg-[#151515] rounded-xl p-4 border border-[#222222]">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${order.status === 'Delivered' ? 'bg-[#28A745]/20 text-[#28A745]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{order.id}</h3>
                    <p className="text-[#A3A3A3] text-xs flex items-center gap-1"><Clock size={10}/> {order.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${order.status === 'Delivered' ? 'text-white' : 'text-[#737373] line-through'}`}>{order.earn}</p>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${order.status === 'Delivered' ? 'text-[#28A745]' : 'text-[#ef4444]'}`}>
                    {order.status}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-[#A3A3A3] bg-[#0A0A0A] p-2 rounded-lg border border-[#222222]">
                <MapPin size={12} className="text-[#FF5A00]" />
                <span className="truncate">{order.restaurant}</span>
                <span className="mx-1">→</span>
                <span className="truncate">{order.customer}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
