

export const blurImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAFUlEQVQYlWN89+4dA27AhEduBEsDAGiHAt4fSRHvAAAAAElFTkSuQmCC";


export const paystackBookingPageUrl = "https://paystack.shop/pay/grithub-bookings";


export const officeLocation = {
    lat: -33.9717388,
    lng: 22.4444244,
    address: {
        line1: "Office Suite #2, York Street Blvd Shopping Center",
        line2: "George South, George, 6529"
    },
    directions: "Come in to the York Street Boulevard Shopping Center on the Wimpy side and walk past Crazy Plastics and Mr Price; to the left is a stairwell. Walk up the stairs and we are on the left side."
}


export const voidPortableText = {
    components: { 
        types: { 
            image: null 
        },
        marks: {
            hr: null
        }
    }
}

export const bookingSettings = {
    hours: 8,
    people: 60,
    amenities: {
        wifi: true,
        coffee: true,
        catering: true,
        tv: true,
        whiteboard: true,
        microphone_handheld: {
            label: "Handheld Microphone",
            upcharge: 699
        },
        microphone_lapel: {
            label: "Lapel Microphone",
            upcharge: 799
        },
        camera: {
            label: "Camera",
            upcharge: 1299
        }
    },
    workSpaces: {
        hot_desk: {
            label: "Hot Desk",
            id: "hot_desk",
            duration: [ "hourly", "daily", "monthly" ]
        },
        board_room: {
            label: "Board Room (Beta Office)",
            id: "board_room",
            duration: [ "hourly", "daily" ]
        },
        sandbox: {
            label: "Sandbox",
            id: "sandbox",
            duration: [ "hourly", "daily" ]
        },
        sandbox_lounge: {
            label: "Sandbox Lounge",
            id: "sandbox_lounge",
            duration: [ "hourly", "daily" ]
        }
    },
    rates: {
        hourly: [
            { id: "hot_desk", value: 99 },
            { id: "board_room", value: 499 },
            { id: "sandbox", value: 999 },
            { id: "sandbox_lounge", value: 999 }

        ],
        daily: [
            { id: "hot_desk", value: 199 },
            { id: "board_room", value: 1499 },
            { id: "sandbox", value: 4999 },
            { id: "sandbox_lounge", value: 2499 },
        ],
        monthly: [
            { id: "hot_desk", value: 1799 },
        ]
    }
}
