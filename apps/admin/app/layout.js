import Layout from "components/layout";
import { GlobalContextProvider } from "contexts/GlobalContext";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
// import { authOptions } from "./api/auth/[...nextauth]/route";

import "styles/globals/global.scss"


export const metadata = {
	title: 'GRIT Hub Admin',
	description: 'Garden Route Innovation and Technology Hub Admin Panel',
}


async function RootLayout({ children }) {
	// const session = await getServerSession(authOptions)

	// if( !session ){
	// 	redirect("/login?return=/dashboard")
	// }

	return (
		<html lang="en">
			<body>
				<GlobalContextProvider>					
					<Layout>
						{children}
					</Layout>
				</GlobalContextProvider>
			</body>
		</html>
	)
}

export default RootLayout;