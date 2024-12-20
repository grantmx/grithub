import "../styles/global.scss"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import GoogleEventTracker from '../thirdparty/google/GoogleEventTracker'
import OrganizationSchema from '/components/schema/Organization';
import { Suspense } from 'react';
import { Inter } from "next/font/google"

const rubik = Inter({
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
    },
    description: "Your future starts here! The Garden Route Innovation and Technology (GRIT Hub) located in George, Western Cape Lab is here to incubate innovation and entrepreneurship in the digital economy",	
}

export const viewport = {
    themeColor: "#f2f2f2",
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: true,
}



function RootLayout({ children }){
    return(
        <html lang="en" className={rubik.className}>     
            <body>
                {children}

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