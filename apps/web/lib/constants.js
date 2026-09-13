

export const blurImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAFUlEQVQYlWN89+4dA27AhEduBEsDAGiHAt4fSRHvAAAAAElFTkSuQmCC";


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
            value: 699
        },
        microphone_lapel: {
            value: 799
        },
        camera: {
            value: 1299
        }
    },
    workSpaces: {
        hot_desk: {
            label: "Hot Desk", 
            id: "hot_desk",
            duration: [ "hourly", "daily", "monthly" ] 
        },
        board_room: {
            label: "Board Room",
            id: "board_room",
            duration: [ "hourly", "daily" ] 
        },
        training_room: {
            label: "Training Room",
            id: "training_room",
            duration: [ "hourly", "daily" ]
        }
    },
    rates: {
        hourly: [
            { id: "hot_desk", value: 99 },
            { id: "board_room", value: 499 },
            { id: "training_room", value: 999 }

        ],
        daily: [
            { id: "hot_desk", value: 199 },
            { id: "board_room", value: 1499 },
            { id: "training_room", value: 4999 },
        ],
        monthly: [
            { id: "hot_desk", value: 1799 },
        ]
    }
}
