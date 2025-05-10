import "@/styles/global.scss";
import { Inter } from "next/font/google";

const inter = Inter({ 
	subsets: ["latin"],
	variable: '--font-inter',
});


export const metadata = {
	metadataBase: "https://captivate.grithub.com",
	title: {
		template: '%s : GRIT Hub Captivate',
		default: 'GRIT Hub Captivate',
	},
	robots: {
		index: true,
		follow: true,
		nocache: true,
		googleBot: {
			index: true,
			follow: true,
			noimageindex: false,
		},
	},
	appleWebApp: {
		title: 'GRIT Hub Captivate',
		statusBarStyle: 'black-translucent',
		startupImage: [
		  '/assets/icons/apple-touch-startup-image-768x1004.jpg',
		  {
			url: '/assets/icons/apple-touch-startup-image-1536x2008.png',
			media: '(device-width: 768px) and (device-height: 1024px)',
		  },
		],
	},
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="theme-color" content="#333333" />
            </head>

            <body className={inter.variable}>
               {children}
            </body>
        </html>
    )
}