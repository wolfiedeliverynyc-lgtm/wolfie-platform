import React from "react";

export default function DashboardPage() {
  return (
    <section className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-100">Dashboard Overview</h1>
      {/* Placeholder for analytics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 shadow">
          <h2 className="text-lg font-medium text-gray-200">Orders</h2>
          <p className="text-3xl font-bold text-gray-100 mt-2">0</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow">
          <h2 className="text-lg font-medium text-gray-200">Drivers</h2>
          <p className="text-3xl font-bold text-gray-100 mt-2">0</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 shadow">
          <h2 className="text-lg font-medium text-gray-200">Revenue</h2>
          <p className="text-3xl font-bold text-gray-100 mt-2">$0</p>
        </div>
      </div>
    </section>
  );
}
