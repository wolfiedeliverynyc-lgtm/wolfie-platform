import * as React from "react";

interface AlertBannerProps {
  title?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  onClose?: () => void;
  message?: string;
}

const variantClasses = {
  info: "bg-blue-500/10 text-blue-200 border-blue-500",
  warning: "bg-yellow-500/10 text-yellow-200 border-yellow-500",
  error: "bg-red-500/10 text-red-200 border-red-500",
  success: "bg-green-500/10 text-green-200 border-green-500",
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  title = "Alert",
  variant = "info",
  onClose,
  message,
}) => {
  return (
    <div className={`flex items-center justify-between p-3 border rounded-md ${variantClasses[variant]}`}>
      <div className="flex-1">
        <strong className="mr-2 capitalize">{title}</strong>
        {message && <span>{message}</span>}
      </div>
      {onClose && (
        <button className="ml-2 text-sm font-medium underline" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
