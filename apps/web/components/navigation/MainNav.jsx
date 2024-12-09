import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx'
import Style from './MainNav.module.scss';

function MainNav({ page, clear = false }) {
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
                    <Link className="nav-link fs-5 me-3 me-lg-5 text-dark" href="/cowork">
                        <Image src="/assets/activity.svg" width={20} height={20} className="d-lg-none" alt="GRITHub Coworking" />
                        CoWorking
                    </Link>

                    <Link href="/programs" className="nav-link fs-5 me-3 me-lg-5 text-dark">
                        <Image src="/assets/people.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />
                        Programs
                    </Link>

                    <Link href="/consulting" className="nav-link fs-5 me-3 me-lg-5 text-dark">
                        <Image src="/assets/event_seat.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />
                        Consulting
                    </Link>

                    <Link className="nav-link fs-5 me-3 me-lg-4 text-dark" href="/programs/incubation">
                        <Image src="/assets/sun.svg" width={20} height={20} className="d-lg-none" alt="Business Incubation" />
                        Incubation
                    </Link>

                    <a className="nav-link fs-5 text-dark rounded-pill text-bg-danger text-white px-5 py-2" href="/contact">
                        <Image src="/assets/mail_outline.svg" width={20} height={20} className={clsx("d-lg-none")} alt="Contact Us" />
                        Contact
                    </a>
                </menu>
            </div>
        </nav>
    );
}

export default MainNav;