import Layout from "components/Layout"
import { GlobalContextProvider } from "contexts/GlobalContext"
import "styles/globals/global.scss"



export default function App({ Component, pageProps }) {
	return(
		<GlobalContextProvider>
			<Layout>
				<Component {...pageProps} />
			</Layout>
		</GlobalContextProvider>
	)		
}
