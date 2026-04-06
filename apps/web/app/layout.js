import "../styles/global.scss"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import GoogleEventTracker from '../thirdparty/google/GoogleEventTracker'
import OrganizationSchema from '@/components/schema/Organization';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from "next/font/google"
import clsx from "clsx";
import ConsentManager from "@/thirdparty/ConsentManager";

const rubik = Inter({
    subsets: ['latin'],
    display: 'swap',
})

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    display: 'swap',
})

export const metadata = {
    metadataBase: "https://grithub.org.za",
	title: {
		template: '%s : Garden Route Innovation and Technology Hub - GRIT Hub',
		default: 'Garden Route Innovation and Technology Hub - GRIT Hub',
	},
    manifest: "/manifest.json",
    verification: {
        google: "LNiA23tiS3vejUsuJnv3kS4i-T-w6kJyni9MleyXccQ",
        other: {
            "facebook-domain-verification": "6g0phy8rlweutzzb3fuvx3ovttds7g",
        }
    },
    description: "Your future starts here! The Garden Route Innovation and Technology (GRIT Hub) located in George, Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy",	
}

export const viewport = {
    themeColor: "#f2f2f2",
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}



function RootLayout({ children }){
    return(
        <html lang="en" className={clsx(rubik.className, playfairDisplay.className)}>     
            <body>
                <ConsentManager>
                    {children}
                </ConsentManager>

                <OrganizationSchema />
               
                <SpeedInsights/>
                <Analytics />

                <Suspense>
                    <GoogleEventTracker />
                </Suspense>

            </body>
        </html>
    )
}

export default RootLayout;