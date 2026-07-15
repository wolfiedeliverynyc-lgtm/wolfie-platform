import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

const RestaurantMenu = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Burgers', 'Sides', 'Drinks', 'Desserts'];
  
  const menuItems = [
    { id: 1, name: 'Truffle Burger', category: 'Burgers', price: '$18.00', status: 'Available', image: true },
    { id: 2, name: 'Spicy Chicken Sandwich', category: 'Burgers', price: '$15.00', status: 'Available', image: true },
    { id: 3, name: 'Sweet Potato Fries', category: 'Sides', price: '$6.50', status: 'Available', image: false },
    { id: 4, name: 'Truffle Mac & Cheese', category: 'Sides', price: '$8.00', status: 'Sold Out', image: true },
    { id: 5, name: 'Craft Lemonade', category: 'Drinks', price: '$4.50', status: 'Available', image: false },
  ];

  return (
    <DashboardLayout>
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Update your offerings in real-time.</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} />
          Add Item
        </button>
      </div>

      <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{ 
                  background: activeCategory === cat ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? 'var(--accent-primary)' : 'var(--border-color)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search menu..." 
              style={{ paddingLeft: '2.5rem', padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.85rem' }} 
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem 0', fontWeight: 600, width: '60px' }}>Photo</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Item Name</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.filter(item => activeCategory === 'All' || item.category === activeCategory).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '1rem 0' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      {item.image ? <ImageIcon size={20} /> : <span style={{ fontSize: '0.7rem' }}>No Img</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{item.category}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{item.price}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${item.status === 'Available' ? 'badge-success' : 'badge-warning'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RestaurantMenu;
