import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RestaurantAuth from './pages/RestaurantAuth';
import RestaurantRegister from './pages/RestaurantRegister';
import RestaurantDashboard from './pages/RestaurantDashboard';
import MANIMALIST from './pages/MANIMALIST';
import PendingApproval from './pages/PendingApproval';
import Legal from './pages/Legal';

// Simple PrivateRoute wrapper checking localStorage for a mock token
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('restaurant_token');
  // For demo purposes, we'll check if a token exists
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<RestaurantAuth />} />
          <Route path="/register" element={<RestaurantRegister />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/legal" element={<Legal />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <RestaurantDashboard />
              </PrivateRoute>
            } 
          />
          <Route path="/manimalist" element={<MANIMALIST />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
