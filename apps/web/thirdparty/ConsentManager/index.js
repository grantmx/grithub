import { ConsentManagerDialog, ConsentManagerProvider, CookieBanner } from "@c15t/nextjs";

export default function ConsentManager({ children }) {
	return (
		<ConsentManagerProvider
			options={{
				mode: "c15t",
				backendURL: "https://grit-hub-garden-route-innovat.inth.app/",
				consentCategories: ["necessary", "marketing"], // Optional: Specify which consent categories to show in the banner.
				ignoreGeoLocation: true, // Useful for development to always view the banner.
			}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			
			{children}
		</ConsentManagerProvider>
	);
}
