export type StatusIndicator = 'normal' | 'warning' | 'critical';

export interface KPIMetric {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  status: StatusIndicator;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  description?: string;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface AlertItem {
  id: string;
  type: 'supply' | 'quality' | 'finance' | 'operations';
  severity: 'high' | 'medium' | 'low';
  message: string;
  impact: string;
  timestamp: string;
}

export interface SegmentSales {
  segment: 'E-Bike' | 'MTB' | 'Road';
  units: number;
}
