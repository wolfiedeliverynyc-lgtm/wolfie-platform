// src/shared/components/AnalyticsCard.tsx
import React from "react";

export interface AnalyticsCardProps {
  title: string;
  value: React.ReactNode;
  trend?: "up" | "down" | "flat";
  trendPercentage?: string | number;
  subText?: string;
  className?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  trend,
  trendPercentage,
  subText,
  className = "",
}) => {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  
  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-card-label">{title}</div>
      <div className="kpi-card-value">{value}</div>
      {trend && trendPercentage !== undefined && (
        <div className={`kpi-card-delta ${trend}`}>
          {arrow} {trendPercentage}
        </div>
      )}
      {subText && !trendPercentage && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{subText}</div>
      )}
      <div className="kpi-card-accent" />
    </div>
  );
};

export default AnalyticsCard;

