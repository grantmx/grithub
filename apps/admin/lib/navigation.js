import dynamic from "next/dynamic"

const IconDashboard = dynamic(() => import("components/icons/IconDashboard"), { ssr: false })
const IconWalkIn = dynamic(() => import("components/icons/IconWalkIn"), { ssr: false })
const IconEventNote = dynamic(() => import("components/icons/IconEventNote"), { ssr: false })
const IconEventSeat = dynamic(() => import("components/icons/IconEventSeat"), { ssr: false })
const IconFace = dynamic(() => import("components/icons/IconFace"), { ssr: false })
const IconGroup = dynamic(() => import("components/icons/IconGroup"), { ssr: false })
const IconPersonAdd = dynamic(() => import("components/icons/IconPersonAdd"), { ssr: false })
const IconTv = dynamic(() => import("components/icons/IconTv"), { ssr: false })


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