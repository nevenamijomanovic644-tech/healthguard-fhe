import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'HealthGuard FHE - Privacy-Preserving Health Disclosure',
  description: 'Secure, encrypted health data submission for insurance underwriting using Fully Homomorphic Encryption',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}
