import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const map: Record<string, { cls: string; label: string }> = {
  delivering: { cls: "badge-blue",  label: "Delivering" },
  preparing:  { cls: "badge-amber", label: "Preparing"  },
  pending:    { cls: "badge-amber", label: "Pending"    },
  completed:  { cls: "badge-green", label: "Completed"  },
  cancelled:  { cls: "badge-red",   label: "Cancelled"  },
  available:  { cls: "badge-green", label: "Available"  },
  offline:    { cls: "badge-gray",  label: "Offline"    },
  online:     { cls: "badge-green", label: "Online"     },
  error:      { cls: "badge-red",   label: "Error"      },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const item = map[status.toLowerCase()] ?? { cls: "badge-gray", label: status };
  return (
    <span className={`badge ${item.cls}`}>
      {label ?? item.label}
    </span>
  );
};

export default StatusBadge;

