module.exports = {
	reactStrictMode: true,
	transpilePackages: ["ui"],
	images: {
        formats: [
            'image/avif', 
            'image/webp'
        ],
        domains: [
            "dummyimage.com",
            "img.youtube.com",
            "maps.googleapis.com",
			"preview.keenthemes.com",
			"firebasestorage.googleapis.com"
        ]
    },
	hubs: {
		george: {
			name: "George, ZA",
			wifi: "GRITHub Community",
			wifiPassword: "NeverStopTrying",
			lat: -33.960400,
			lon: 22.456240,
			eskomSePush_area_id: "westerncape-12-george"
		}
	}
};
