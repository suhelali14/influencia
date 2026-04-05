/* eslint-disable @typescript-eslint/no-explicit-any */
// Recharts type augmentation for React 18 and TypeScript strict mode compatibility
// This fixes the "cannot be used as a JSX component" errors

import type { ComponentType } from 'react'

declare module 'recharts' {
  export const XAxis: ComponentType<any>
  export const YAxis: ComponentType<any>
  export const Tooltip: ComponentType<any>
  export const Area: ComponentType<any>
  export const Pie: ComponentType<any>
  export const Bar: ComponentType<any>
  export const Cell: ComponentType<any>
  export const Line: ComponentType<any>
  export const CartesianGrid: ComponentType<any>
  export const ResponsiveContainer: ComponentType<any>
  export const AreaChart: ComponentType<any>
  export const PieChart: ComponentType<any>
  export const BarChart: ComponentType<any>
  export const LineChart: ComponentType<any>
  export const Legend: ComponentType<any>
}
