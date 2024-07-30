
export const bookingSettings = {
    hours: 8,
    people: 24,
    workSpaces: {
        hot_desk: {
            label: "Hot Desk", 
            id: "hot_desk",
            duration: [ "hourly", "daily", "monthly" ] 
        },
        event_conference_room: {
            label: "Event Conference Room",
            id: "event_conference_room",
            duration: [ "hourly", "daily" ] 
        }
    },
    rates: {
        hourly: [
            { id: "hot_desk", value: 50 },
            { id: "event_conference_room", value: 250 },
        ],
        daily: [
            { id: "hot_desk", value: 100 },
            { id: "event_conference_room", value: 500 },
        ],
        monthly: [
            { id: "hot_desk", value: 1800 },
        ]
    }
}
