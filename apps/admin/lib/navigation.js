import dynamic from "next/dynamic"

const IconDashboard = dynamic(() => import("components/icons/IconDashboard"), { ssr: false })
const IconWalkIn = dynamic(() => import("components/icons/IconWalkIn"), { ssr: false })
const IconEventNote = dynamic(() => import("components/icons/IconEventNote"), { ssr: false })
const IconEventSeat = dynamic(() => import("components/icons/IconEventSeat"), { ssr: false })
const IconFace = dynamic(() => import("components/icons/IconFace"), { ssr: false })
const IconGroup = dynamic(() => import("components/icons/IconGroup"), { ssr: false })
const IconPersonAdd = dynamic(() => import("components/icons/IconPersonAdd"), { ssr: false })
const IconTv = dynamic(() => import("components/icons/IconTv"), { ssr: false })
const IconPeople = dynamic(() => import("components/icons/IconPeople"), { ssr: false })


export const nav = {
    overview: {
        name: "Dashboard",
        href: "/dashboard",
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
            entrants: {
                heading: "Facility Check-Ins & Walk-Ins",
                name: "Entrants",
                href: "/main/entrants",
                icon: IconWalkIn
            },
        }
    },
    people: {
        heading: "People",
        children: {
            interns: {
                heading: "Internship",
                name: "Interns",
                href: "/people/interns",
                icon: IconPeople
            },
            cohorts: {
                heading: "Cohort Directory",
                name: "Cohorts",
                href: "/people/cohorts",
                icon: IconGroup,
                secondary: {
                    all: {
                        heading: "All Active Cohort Participants",
                        name: "All Participants",
                        href: "/people/cohorts",
                    },
                    dojo: {
                        heading: "Coder Dojo Ninjas",
                        name: "Coder Dojo",
                        href: "/people/cohorts/coder-dojo",
                    },
                    incubator: {
                        heading: "Small Business Incubator",
                        name: "Incubator",
                        href: "/people/cohorts/incubator",
                    },
                    html: {
                        heading: "HTML Class",
                        name: "HTML",
                        href: "/people/cohorts/html",
                    },
                    mobile: {
                        heading: "Mobile Web Class",
                        name: "Mobile",
                        href: "/people/cohorts/mobile-web",
                    },
                    javascript: {
                        heading: "Javascript Class",
                        name: "Javascript",
                        href: "/people/cohorts/javascript",
                    }
                }
            },
            registrations: {
                heading: "Event Registrations",
                name: "Event Registrations",
                href: "/people/registrations",
                icon: IconPersonAdd
            },
            directory: {
                heading: "Member Directory",
                name: "Active Members",
                href: "/people/directory",
                icon: IconFace
            },
            
        }
    }
}