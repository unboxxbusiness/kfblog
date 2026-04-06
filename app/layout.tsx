import './globals.css'
import React from 'react'
import { Metadata } from 'next'
import { DM_Sans, Inter } from 'next/font/google'
import { ThemeProvider } from '../components/theme-provider'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import RouteAwarePublicShell from '../components/RouteAwarePublicShell'
import { toSafeJsonLd } from '../lib/safeJsonLd'
import WebVitalsReporter from '../components/WebVitalsReporter'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' })

const currentYear = new Date().getFullYear()
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://kampusfilter.com'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseOrigin = ''

try {
  if (supabaseUrl) {
    supabaseOrigin = new URL(supabaseUrl).origin
  }
} catch {
  // Skip Supabase preconnect links when environment value is malformed.
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  icons: {
    icon: [{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }],
    shortcut: ['/favicon-32x32.png'],
    apple: [{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }],
  },
  title: {
    default: 'Kampus Filter',
    template: '%s | Kampus Filter'
  },
  description: `Compare colleges by course, city, fees, exams, placements, and admission fit for ${currentYear} admissions.`,
  keywords: ['college predictor', 'college comparison', 'course and city filter', `college admissions ${currentYear}`],
  alternates: {
    canonical: baseUrl,
    languages: {
      'en-IN': baseUrl,
      'x-default': baseUrl,
    }
  },
  openGraph: {
    title: 'Kampus Filter',
    description: 'Student-first college discovery with filters, saved lists, comparison, and analytics dashboard.',
    type: 'website',
    url: baseUrl,
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Kampus Filter',
    locale: 'en_IN',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Kampus Filter'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kampus Filter',
    description: 'Compare colleges by course, city, fees, exams, placements and fit.',
    images: ['/og-default.png']
  },
  robots: {
    index: true,
    follow: true
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION_CODE,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION_CODE,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION_CODE,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION_CODE || '',
    },
  }
}

export const revalidate = 3600

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: process.env.NEXT_PUBLIC_SITE_NAME || 'Kampus Filter',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: process.env.NEXT_PUBLIC_SITE_NAME || 'Kampus Filter',
    url: baseUrl,
    logo: `${baseUrl}/brand/logo-kampus-filter.webp`,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-XXXXXXXXXX',
        contactType: 'customer support',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi']
      }
    ]
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/hero-illustration.svg" as="image" fetchPriority="high" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {supabaseOrigin ? <link rel="preconnect" href={supabaseOrigin} /> : null}
        {supabaseOrigin ? <link rel="dns-prefetch" href={supabaseOrigin} /> : null}

        <link rel="prefetch" href="/apply" />
        <link rel="prefetch" href="/search" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { margin: 0; font-family: Inter, sans-serif; }
              .navbar { min-height: 64px; }
              .hero { min-height: 72vh; }
              .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
              }
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${dmSans.variable} bg-[#ffffff] font-sans text-[#000000]`}>
        <ThemeProvider>
          <RouteAwarePublicShell>{children}</RouteAwarePublicShell>

          <WebVitalsReporter />

          <Toaster position="top-right" richColors closeButton />
          <Analytics />
          <SpeedInsights />

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(websiteSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(organizationSchema) }} />
        </ThemeProvider>
      </body>
    </html>
  )
}
