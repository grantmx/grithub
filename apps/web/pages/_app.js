import 'bootstrap/dist/css/bootstrap.css'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Script from 'next/script'
import { useEffect } from 'react'
import * as gtag from 'lib/gtag'


export default function App({ Component, pageProps }) {
	const router = useRouter()

	useEffect(() => {
		const handleRouteChange = (url) => {
			gtag.pageview(url)
		}
		
		router.events.on('routeChangeComplete', handleRouteChange)
		router.events.on('hashChangeComplete', handleRouteChange)

		return () => {
			router.events.off('routeChangeComplete', handleRouteChange)
			router.events.off('hashChangeComplete', handleRouteChange)
		}

	}, [router.events])


	return(
		<>
			<Head>
				<meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />	
				<meta name="google-site-verification" content="LNiA23tiS3vejUsuJnv3kS4i-T-w6kJyni9MleyXccQ" />
			</Head>

			<Script id="google_tag_manager" strategy='beforeInteractive'>
				{`
					<!-- Google Tag Manager -->
					<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
					new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
					j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
					'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
					})(window,document,'script','dataLayer','GTM-PRVBFD65');</script>
					<!-- End Google Tag Manager -->
				`}
			</Script>
			
			<Component {...pageProps} />

			<Script id="google_tag_manager_noscript" strategy='afterInteractive'>
				{`
				<!-- Google Tag Manager (noscript) -->
				<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PRVBFD65"
				height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
				<!-- End Google Tag Manager (noscript) -->
				`}
			</Script>

			<Script
				strategy="afterInteractive"
				src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
			/>


			{/* Google */}
			<Script
				id="gtag-init"
				strategy="afterInteractive"
				dangerouslySetInnerHTML={{
					__html: `
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());

						gtag('config', '${gtag.GA_TRACKING_ID}', {
							page_path: window.location.pathname,
						});
						gtag('config', 'AW-11196953099');
					`
				}}
			/>
		</>
	)		
}
