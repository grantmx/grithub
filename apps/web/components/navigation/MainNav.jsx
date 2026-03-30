"use client"

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx'
import Style from './MainNav.module.scss';
import { usePathname } from 'next/navigation';

function MainNav({ page = false, clear = false }) {
    const path = usePathname();

    return (
        <nav className={clsx(page && `${Style.navbar} shadow-sm`, !clear && "bg-white",  `w-100 container-fluid px-5 py-3 mb-2`)}>
            <div className="col-12 d-flex justify-content-md-between justify-content-center flex-nowrap">
                <a className="navbar-brand" href="/" title="home">
                    <Image 
                        className={Style.logo}
                        src="/assets/grithub-logo-horz.svg" 
                        width={400} 
                        height={page ? 80 : 125} 
                        alt="GRITHub Logo" 
                    />
                </a>
                <menu className={Style.navbarNav}>
                    <Link className={clsx(Style.link, "nav-link", path === "/cowork" && Style.active)} href="/cowork" title='CoWorking'>
                        <Image src="/assets/activity.svg" width={20} height={20} className="d-lg-none" alt="GRITHub Coworking" />
                        CoWorking
                    </Link>

                    <Link href="/programs" className={clsx(Style.link, "nav-link", path === "/programs" && Style.active)} title='Programs'>
                        <Image src="/assets/people.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />
                        Programs
                    </Link>

                    <Link href="/consulting" className={clsx(Style.link, "nav-link", path === "/consulting" && Style.active)} title='Consulting'>
                        <Image src="/assets/event_seat.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />
                        Consulting
                    </Link>

                    <Link className={clsx(Style.link, "nav-link", path === "/programs/incubation" && Style.active)} href="/programs/incubation" title="Incubation">
                        <Image src="/assets/sun.svg" width={20} height={20} className="d-lg-none" alt="Business Incubation" />
                        Incubation
                    </Link>

                    <Link className={clsx(Style.link, "nav-link", path === "/newsroom" && Style.active)} href="/newsroom" title="Newsroom">
                        <Image src="/assets/newspaper.svg" width={20} height={20} className="d-lg-none" alt="News" />
                        Newsroom
                    </Link>

                    <Link className={clsx(Style.link, "rounded-pill d-md-block d-none text-bg-danger text-white px-5 py-2", path === "/contact" && Style.active)} href="/contact" title='Contact Us'>
                        <Image src="/assets/mail_outline.svg" width={20} height={20} className={clsx("d-lg-none")} alt="Contact Us" />
                        Contact
                    </Link>
                </menu>
            </div>
        </nav>
    );
}

export default MainNav;