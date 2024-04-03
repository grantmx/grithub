/* eslint-disable react/no-unescaped-entities */
import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import Style from 'styles/home.module.scss';
import QRCode from "react-qr-code";
import image2 from "public/assets/business-incubator.jpg"
import Link from "next/link";


function Incubation(){
    return(
        <GeneralPage 
            title="Business Incubator"
            subTitle="Our Incubator is custom designed for Small to Medium Enterprises to help grow digital skills, refine or create an online business model through masterclasses, workshops, events and direct coaching."
            image={image2}
        >

            <section className='bg-light py-5 mb-5'>
                <div className="col-12 px-4 d-flex justify-content-center flex-column flex-md-row">
                    <div className="col-md-6 col-12 p-md-5 py-3 d-flex justify-content-end flex-row">
                        <Link href="/incubation/competition" title="apply today">
                            <Image 
                                src="/assets/nmu-idea-compeition-web.jpg" 
                                width={711} 
                                height={400}
                                // className={home.adImg}
                                alt="grit internship"
                            />
                        </Link>
                    </div>


                    <div className="col-md-5 col-12 py-md-5 py-3 pe-3 pe-md-5 d-flex justify-content-center flex-column">
                        <span className="lead text-muted">GRIT Hub Innovative Ideas Competition</span>
                        <h2 className="fw-bold display-3 mb-3">
                            What is your BIG Innovative Idea?
                        </h2>
                        <p className='lead'>
                            Do you have a big idea that you believe can change the world? Enter the GRIT Hub Innovative Ideas Competition and stand a chance to win a cash prize of R10,000 and mentorship to bring your idea to life.
                        </p>
                        
                        <p>
                            <Link href="/incubation/competition" className="btn btn-danger btn-lg px-4" title='apply today'>
                                Learn more &nbsp;&rsaquo;
                            </Link>
                        </p>
                    </div>
                </div>
            </section>
           
           
            <section className="container-fluid d-flex justify-content-center align-items-center pt-5 flex-column" id="incubator">
                <h2 className="fw-bold display-5 mt-5 mb-0 text-center">
                    Workshops & programs to get your business off the ground
                </h2>

                <div className="text-center col-md-9 col-12 p-md-3 p-3">
                    <p className="fs-3">
                        Our Incubator is custom designed for Small to Medium Enterprises to help grow digital skills and create a viable business through masterclasses, workshops, events and direct coaching.
                    </p>
                </div>


                <div className="col-12 d-flex justify-content-between flex-wrap">
                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow h-100 align-items-center">
                            <Image src="/assets/power.svg" width={150} height={150} className={Style.cardTopOverflow} alt="SME Coaching" />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">SME Digital Transformation &amp; Coaching</h3>
                                <p className="card-text">The Small to Medium Enterprises in South Africa are the backbone of its economy. SMEs have the ability to quickly adapt to new innovative tools and competencies to propel sector growth. Our goal is to coach and provide tools and information platforms to increase productivity and innovation.</p>
                                <a className="text-decoration-underline" href="/whitepapers/eBook-SMB-of-the-Future-FINAL-2019-07-29.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital transformation">White Paper: 7 Trends Driving SMEs’ Digital Transformation &rsaquo;</a>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow h-100 align-items-center">
                            <Image src="/assets/worker.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Digital Skills"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Digital Skills &amp; Apprenticeships</h3>
                                <p className="card-text">Our Apprenticeships and Skills training will fill the immediate needs of employers in an ever increasing digital economy.  From CompTIA A+ and Mac Circuitry Certifications, to various scripting Languages, Cloud Computing, Data Analytics and OS Certifications we will thoroughly equip the next digital workforce.</p>
                                <a className="text-decoration-underline" href="/whitepapers/skills_boost_western_cape_-_summary_report.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital skills jobs">White Paper: Western Cape Digital Skills Shared Agenda for Action &rsaquo;</a>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow h-100 align-items-center">
                            <Image src="/assets/3d-printer.svg" width={150} height={150} className={Style.cardTopOverflow} alt="FabLab Innovation"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Co-Creation &amp; FabLab Spaces</h3>
                                <p className="card-text">Disruptive Technologies like "Additive Manufacturing" or 3D Printing, paired with the sharp removal of its price barrier, allows young entrepreneurs to enter previously closed markets. Our <a className="text-decoration-underline" href="https://fabfoundation.org/" target="_blank" rel="noreferrer">Digital Fabrication Lab (FabLab)</a> and Co-Creation Spaces will assist in product development, rapid tooling and prototyping as well as learning new business models.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S0040162520313093-main.pdf" target="_blank" rel="noreferrer" title="whitepaper on 3d printing">White Paper: The Effect of 3D Printing Technologies on Entrepreneurship &rsaquo;</a>
                            </div>
                        </div>
                    </div>


                    <div className="d-md-flex d-xs-none d-xl-none col-xl-4 col-md-6 col-12 p-md-5 p-3  justify-content-center flex-column align-item-center">
                        <h3 className="display-6 fw-bold text-white">...And more bespoke programs to meet your industry needs</h3>
                        <p className="lead text-white">Our programs, conferences and talks from world renown industry professionals will help drive you and your company to the next level.</p>
                    </div>

                </div>
            </section>

            <hr className="hr my-5" />

            <section className="container-xxl col-12 d-flex justify-content-center align-items-center py-5 flex-column" id="about">
                <div className="text-center col-xl-12 col-12">
                    <p className="fs-2 m-0">
                        Start Your Journey
                    </p>						
                    <p className='lead mb-5'>
                        Take our Business Incubator <a href="https://forms.gle/BTxdAZp3Y2KUmqw5A"  rel='noreferrer' target="_blank">Pre-Assessment Survey &rsaquo;</a>
                    </p>


                    <QRCode 
                        value="https://forms.gle/BTxdAZp3Y2KUmqw5A"
                        size={400}
                    />

                    <p className="my-2">Or scan on your phone</p>
                </div>
            </section>
        </GeneralPage>
    )
}

export default Incubation;