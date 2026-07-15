import { motion } from 'framer-motion';
import { X, Target, List, GitCommit, Database, Lock, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { useRestaurantStore } from '../../store/useRestaurantStore';

const ExpandedView = ({ selectedId, onClose, data }) => {
  const { setActivePage, setSupportModalOpen } = useRestaurantStore();

  if (!selectedId || !data) return null;

  const Icon = data.icon;

  // Map module ID to the live store page tab
  const getLivePageId = (id) => {
    switch (id) {
      case 'overview': return 'dashboard';
      case 'orders': return 'orders';
      case 'menu': return 'menu';
      case 'analytics': return 'analytics';
      case 'wallet': return 'finance';
      case 'settings': return 'settings';
      case 'delivery': return 'orders'; // Outbound delivery is managed on Orders page
      default: return null;
    }
  };

  const livePageId = getLivePageId(data.id);

  const handleNavigateToLive = () => {
    if (data.id === 'support') {
      setSupportModalOpen(true);
      onClose();
      return;
    }
    if (livePageId) {
      setActivePage(livePageId);
      onClose();
    }
  };

  return (
    <div className="expanded-overlay" onClick={onClose}>
      <motion.div
        layoutId={`card-${selectedId}`}
        className={`expanded-card ${data.className || ''}`}
        initial={{ borderRadius: 24 }}
        animate={{ borderRadius: 0 }}
        exit={{ borderRadius: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="expanded-content">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="expanded-header-wrapper"
          >
            <div className={`expanded-icon-badge ${data.className ? 'badge-light' : 'badge-dark'}`}>
              <Icon size={40} />
            </div>
            <div>
              <h1 className="expanded-title">{data.title} Module</h1>
              {(livePageId || data.id === 'support') && (
                <button 
                  onClick={handleNavigateToLive} 
                  className="mt-4 flex items-center gap-2 bg-[#FF6129] hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-all shadow-md active:scale-95 border-none cursor-pointer"
                >
                  Go to Live Management <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="expanded-body architecture-grid"
          >
            <section className="arch-section purpose-section">
              <h2><Target size={20} className="section-icon" /> Purpose</h2>
              <p>{data.details.purpose}</p>
            </section>

            <section className="arch-section flow-section">
              <h2><GitCommit size={20} className="section-icon" /> User Flow</h2>
              <p>{data.details.userFlow}</p>
            </section>

            <section className="arch-section">
              <h2><List size={20} className="section-icon" /> Main Features</h2>
              <ul>
                {data.details.features.map((feat, i) => <li key={i}>{feat}</li>)}
              </ul>
            </section>

            <section className="arch-section">
              <h2><Database size={20} className="section-icon" /> Data Required</h2>
              <ul>
                {data.details.dataRequired.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>

            <section className="arch-section">
              <h2><Lock size={20} className="section-icon" /> Permissions Required</h2>
              <div className="tags-container">
                {data.details.permissions.map((perm, i) => (
                  <span key={i} className="arch-tag perm-tag">{perm}</span>
                ))}
              </div>
            </section>

            <section className="arch-section">
              <h2><TrendingUp size={20} className="section-icon" /> KPIs Tracked</h2>
              <div className="tags-container">
                {data.details.kpis.map((kpi, i) => (
                  <span key={i} className="arch-tag kpi-tag">{kpi}</span>
                ))}
              </div>
            </section>

            <section className="arch-section actions-section">
              <h2><Zap size={20} className="section-icon" /> Recommended Actions</h2>
              <ul>
                {data.details.actions.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </section>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpandedView;
