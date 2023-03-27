import IconDashboard from "components/icons/IconDashboard"
import IconWalkIn from "components/icons/IconWalkIn"
import IconEventNote from "components/icons/IconEventNote"
import IconEventSeat from "components/icons/IconEventSeat"
import IconFace from "components/icons/IconFace"
import IconGroup from "components/icons/IconGroup"
import IconPersonAdd from "components/icons/IconPersonAdd"
import IconTv from "components/icons/IconTv"

export const nav = {
    overview: {
        name: "Overview",
        href: "/",
        icon: IconDashboard
    },
    main: {
        heading: "Main",
        children: {
            events: {
                name: "Events",
                heading: "Events, Classes and Workshops",
                href: "/main/events",
                icon: IconEventNote,
                secondary: {
                    schedule: {
                        heading: "Upcoming Events",
                        name: "Schedule",
                        href: "/main/events",
                    },
                    classes: {
                        heading: "Upcoming Classes",
                        name: "Classes",
                        href: "/main/events/classes",
                    },
                    workshops: {
                        heading: "Upcoming Workshops",
                        name: "Workshops",
                        href: "/main/events/workshops",
                    }
                }
            },
            bookings: {
                heading: "Upcoming Bookings",
                name: "Bookings",
                href: "/main/bookings",
                icon: IconEventSeat
            },
            kiosks: {
                heading: "Kiosk Status",
                name: "Kiosks",
                href: "/main/kiosks",
                icon: IconTv
            },
        }
    },
    people: {
        heading: "People",
        children: {
            entrants: {
                heading: "Facility Entrants & Walk-Ins",
                name: "Entrants",
                href: "/people/entrants",
                icon: IconWalkIn
            },
            registrations: {
                heading: "Event Registrations",
                name: "Registrations",
                href: "/people/registrations",
                icon: IconPersonAdd
            },
            directory: {
                heading: "Member Directory",
                name: "Members",
                href: "/people/directory",
                icon: IconFace
            },
            cohorts: {
                heading: "Cohort Directory",
                name: "Cohorts",
                href: "/people/cohorts",
                icon: IconGroup
            },
        }
    }
}