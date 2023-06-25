import logo from "./assets/desktop-logo.png"
import Style from './styles/App.module.scss';
import Time from "./components/Time/Time";
import Event from "./components/Event/Event";
import Weather from "./components/Weather/Weather";
import Wifi from "./components/Wifi/Wifi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VideoAd from "./components/VideoAd";


function App() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				staleTime: 1800000
			}
		}
	})


	return (
		<QueryClientProvider client={queryClient}>
			<div className={Style.block} style={{ backgroundImage: `url(${logo})`}}>
				<header className={Style.header}>
					<Event />
					<Time />
				</header>

				<footer className={Style.footer}>
					<Wifi />
					<Weather />
				</footer>
			</div>

			<VideoAd />
		</QueryClientProvider>
	);
}

export default App;
