/* eslint-disable react/no-unescaped-entities */
import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import Style from 'styles/home.module.scss';
import QRCode from "react-qr-code";


function Incubation(){
    return(
        <GeneralPage 
            title="Business Incubator"
            subTitle="Our Incubator is custom designed for Small to Medium Enterprises to help grow digital skills, refine or create an online business model through masterclasses, workshops, events and direct coaching."
        >
           
            <section className="container-fluid d-flex justify-content-center align-items-center pt-5 flex-column" id="incubator">
                <div className="col-12  d-flex justify-content-between flex-wrap">
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


            <section className="container-xxl col-12 d-flex justify-content-center align-items-center py-5 flex-column" id="about">
                <div className="text-center col-xl-12 col-12">
                    <p className="fs-2 m-0">
                        Start Your Journey
                    </p>						
                    <p className='lead mb-5'>
                        Take our Business Incubator <a href="https://forms.gle/BTxdAZp3Y2KUmqw5A"  rel='noreferrer' target="_blank">Pre-Assessment</a>
                    </p>


                    <QRCode 
                        value="https://forms.gle/BTxdAZp3Y2KUmqw5A"
                        size={256}
                    />
                </div>
            </section>
        </GeneralPage>
    )
}

export default Incubation;