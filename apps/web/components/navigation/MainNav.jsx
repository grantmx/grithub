import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx'
import home from 'styles/home.module.scss';

function MainNav({ page }){
    return (
        <nav className={clsx(page && `${home.navbar} shadow`, `navbar navbar-light w-100 container-fluid px-5`)}>
            <div className="col-12 d-flex justify-content-between flex-nowrap">
                <a className="navbar-brand" href="/" title="home">
                    <Image 
                        className={home.logo}
                        src="/assets/grithub-logo-horz-dark.svg" 
                        width={400} 
                        height={page ? 80 : 125} 
                        alt="GRITHub Logo" 
                    />
                </a>
                <div className={home.navbarNav}>
                    <Link href="/programs" className="nav-link fs-5 me-3 text-dark">
                        <Image src="/assets/people.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />Training
                    </Link>

                    <Link href="/consulting" className="nav-link fs-5 me-3 text-dark">
                        <Image src="/assets/event_seat.svg" width={20} height={20} className="d-lg-none" alt="Program Events at GRITHub" />Consulting
                    </Link>

                    <a className="nav-link fs-5 me-3 text-dark" href="/#incubator">
                        <Image src="/assets/sun.svg" width={20} height={20} className="d-lg-none" alt="Business Incubation" />
                        Incubation
                    </a>

                    

                    <a className="nav-link fs-5 me-3 text-dark" href="/#coworking">
                        <Image src="/assets/activity.svg" width={20} height={20} className="d-lg-none" alt="GRITHub Coworking" />
                        CoWork
                    </a>
                </div>
            </div>
        </nav>
    );
}

export default MainNav;