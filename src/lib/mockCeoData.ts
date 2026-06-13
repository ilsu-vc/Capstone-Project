import { KPIMetric, ChartDataPoint, AlertItem, SegmentSales } from '../types/dashboard';

export const mockSyncTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export const pulseMetrics: KPIMetric[] = [
  {
    id: 'rev-margin',
    title: 'Revenue & Margin (Q2)',
    value: '$42.8M',
    subValue: 'Margin: 46.2%',
    status: 'normal',
    trend: 'up',
    trendValue: '+8.4% vs Target'
  },
  {
    id: 'sales-velocity',
    title: 'Sales Velocity (Today)',
    value: '1,420 Units',
    status: 'normal',
    trend: 'up',
    trendValue: '+12% vs last week'
  },
  {
    id: 'prod-output',
    title: 'Production Output',
    value: '98%',
    subValue: '840/850 units boxed',
    status: 'normal',
    trend: 'neutral',
    trendValue: 'At capacity ceiling'
  },
  {
    id: 'supply-health',
    title: 'Supply Chain Health',
    value: '91% BOM',
    subValue: 'Allocated & In-Stock',
    status: 'warning',
    trend: 'down',
    trendValue: '-4% WoW'
  }
];

export const salesBySegment: SegmentSales[] = [
  { segment: 'E-Bike', units: 680 },
  { segment: 'MTB', units: 420 },
  { segment: 'Road', units: 320 }
];

// Weekly Burn Rate vs Cash Runway (Focus on E-bike CapEx)
export const cashRunwayData: ChartDataPoint[] = [
  { name: 'W1', burnRate: 1.2, runway: 24.5 },
  { name: 'W2', burnRate: 1.5, runway: 23.0 },
  { name: 'W3', burnRate: 2.1, runway: 20.9 }, // CapEx heavy week
  { name: 'W4', burnRate: 1.8, runway: 19.1 },
  { name: 'W5', burnRate: 1.4, runway: 17.7 },
  { name: 'W6', burnRate: 1.3, runway: 16.4 },
];

// Customer Demand vs Active Warehouse Inventory
export const demandVsInventoryData: ChartDataPoint[] = [
  { name: 'Jan', demand: 4200, inventory: 6000 },
  { name: 'Feb', demand: 4800, inventory: 5500 },
  { name: 'Mar', demand: 5900, inventory: 4900 },
  { name: 'Apr', demand: 7100, inventory: 4100 },
  { name: 'May', demand: 8500, inventory: 3200 }, // Stockout risk zone
  { name: 'Jun', demand: 9200, inventory: 2800 },
];

export const mockAlerts: AlertItem[] = [
  {
    id: 'alert-1',
    type: 'supply',
    severity: 'high',
    message: 'Shipment of Shimano groupsets delayed 14 days.',
    impact: 'Impacts 1,200 units of "Trailmaster X" production',
    timestamp: '2 hours ago'
  },
  {
    id: 'alert-2',
    type: 'quality',
    severity: 'medium',
    message: 'Warranty claims on E-bike batteries spiked by 4% this week.',
    impact: 'Potential cell degradation issue in Batch #492',
    timestamp: '5 hours ago'
  }
];
