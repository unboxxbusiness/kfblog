declare module 'next/navigation' {
  export function notFound(): never
  export function redirect(href: string): never
  export function useRouter(): {
    push: (href: string) => void
    replace: (href: string) => void
    refresh: () => void
  }
  export function useSearchParams(): {
    get: (name: string) => string | null
    toString: () => string
  }
  export function usePathname(): string
}

declare module 'framer-motion' {
  export const AnimatePresence: any
  export const motion: any
}

declare module 'next/link' {
  const Link: any
  export default Link
}

declare module 'next/font/google' {
  export const Inter: any
  export const DM_Sans: any
}

declare module 'recharts' {
  export const ResponsiveContainer: any
  export const AreaChart: any
  export const Area: any
  export const BarChart: any
  export const Bar: any
  export const XAxis: any
  export const YAxis: any
  export const CartesianGrid: any
  export const Tooltip: any
  export const Legend: any
  export const PieChart: any
  export const Pie: any
  export const Cell: any
  export const ScatterChart: any
  export const Scatter: any
}
