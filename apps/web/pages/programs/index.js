/* eslint-disable react/no-unescaped-entities */
import Image from "next/image";
import GeneralPage from "components/layout/GeneralPage";
import ribbon from 'styles/ribbon.module.scss'
import home from 'styles/home.module.scss';

import image from 'public/assets/software-development-hero.jpg'
import Link from "next/link";


export default function Programs(){
    return(
        <GeneralPage 
            title="Trainings, Programs &amp; Courses"
            subTitle="Our Workforce Training, Programs and Workshops are meant to get us ahead of the challenges and trends of an ever changing economic environment and into the innovator economy."
            image={image}
        >


            <section className='bg-light py-5 mb-md-5'>
                <div className="col-12 p-4 d-flex justify-content-center flex-column flex-md-row">
                    <div className="col-md-6 col-12 p-md-5 py-3 d-flex justify-content-end flex-row">
                        <Link href="/programs/internship" title="apply today">
                            <Image 
                                src="/assets/winter-internship-blank.jpg" 
                                width={711} 
                                height={400}
                                className={home.adImg}
                                alt="grit internship"
                            />
                        </Link>
                    </div>

                    <div className="col-md-5 col-12 py-md-5 py-3 pe-3 pe-md-5 d-flex justify-content-center flex-column">
                        <span className="lead text-muted">GRIT Hub Internships</span>
                        <h2 className="fw-bold display-4 mb-3">
                            Get hands on industry experience.
                        </h2>
                        <p className='lead'>Push yourself and get involved in meaningful real enterprise projects at GRIT Hub.  Apply for the GRIT Internship today.</p>
                        
                        <p>
                            <Link href="/programs/internship" className="btn btn-danger btn-lg px-4" title='apply today'>
                                Learn more &nbsp;&rsaquo;
                            </Link>
                        </p>
                    </div>
                </div>
            </section>



            <section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column" id="programs-workshops">
                <h2 className="fw-bold display-5 mt-5 mb-0 text-center">
                    Real Life Workforce Training.<br/>Start Your Journey Now!
                </h2>

                <div className="text-center col-md-9 col-12 p-md-5 p-3">
                    <p className="fs-2">
                        Our up-to-date curriculum comes from proven web and software industry professionals unlike anything you will find from a textbook.  In just 6 weeks you will learn a new skill or programming language.
                    </p>
                </div>

               
               

                <div className="col-12 d-flex justify-content-between flex-wrap">
                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
                            <Image src="/assets/html.png" width={150} height={150} className={home.cardTopOverflow} alt="html" />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Websites for Beginners</h3>
                                <p className="card-text"><strong>NO CODING EXPERIENCE REQUIRED.</strong> By the end of this course, you will be able to describe how the world wide web works and have a basic understanding of the internet. You would have designed and built your own multi-page website, select a hosting service, and publish your hand-made website for the world to see.</p>
                                {/* <p className="d-grid">
                                    <a rel="noreferrer" href="http://grithub-za-1.hubspotpagebuilder.com/websites-for-beginners" target="_blank" className="btn btn-success btn-lg">
                                        Register Now &nbsp;&rsaquo;
                                    </a>
                                </p> */}

                                <div className="alert alert-secondary text-center" role="alert">
                                    Registration Opens Soon
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
                            <Image src="/assets/278-2783353_mobile-mobile-phone-icon-red-png.png" width={150} height={150} className={home.cardTopOverflow} alt="mobile"   />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Mobile Web (Beginner)</h3>
                                <p className="card-text"><strong>NO CODING EXPERIENCE REQUIRED.</strong> Apply the concept of mobile friendliness to a website; learn ways to modify an existing website in to a mobile optimized one. You will also learn responsive design and designing for a mobile user.</p>
                                <div className="alert alert-secondary text-center" role="alert">
                                    Registration Opens Soon
                                </div>
                                {/* <p className="d-grid">
                                    <a href="https://grithub-za-1.hubspotpagebuilder.com/mobile-for-beginners"  className="btn btn-success btn-lg">
                                        Register
                                    </a>
                                </p> */}
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
                            <Image src="/assets/js.png" width={150} height={150} className={home.cardTopOverflow} alt="javascript"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Intro into JavaScript</h3>
                                
                                <p className="card-text">Learn the history of JavaScript; how to write proper functional JavaScript syntax and Object Oriented Programming concepts; You should be able to iterate data and show the results in the browser and have completed a JavaScript application.</p>
                                <div className="alert alert-secondary text-center" role="alert">
                                    Registration Opens Soon
                                </div>

                                {/* <p className="d-grid">
                                    <a href="https://grithub-za-1.hubspotpagebuilder.com/javascript" target='_blank' className="btn btn-success btn-lg" rel="noreferrer">
                                        Register
                                    </a>
                                </p> */}
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
                            <Image src="/assets/react.png" width={150} height={150} className={home.cardTopOverflow} alt="react"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">React (Advanced)</h3>
                                <p className="card-text">
                                    Learn how to easily build stateful component based UIs and applications using the Javascript React.js library.  You will learn how to setup React, learn the fundaments such as components, props and state, techniques, pitfalls and strengths.
                                </p>
                                <div className="alert alert-secondary text-center" role="alert">
                                    Registration Opens Soon
                                </div>
                                {/* <p className="d-grid">
                                    <a href="" className="btn btn-primary btn-lg disabled">
                                        Register
                                    </a>
                                </p> */}
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__purple}`}><span>Workforce</span></div>
                            <Image src="/assets/nextjs.png" width={150} height={150} className={home.cardTopOverflow} alt="nextjs"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Next.js (Advanced)</h3>
                                <p className="card-text">
                                    Next.js is a React framework used in tens of thousands of production-facing websites and web applications, including many of the world's largest brands. Learn about page based routing, SSR and ISR pre-rendering, code splitting, and API routes, 
                                </p>
                                <div className="alert alert-secondary text-center" role="alert">
                                    Registration Opens Soon
                                </div>
                               
                                {/* <p className="d-grid">
                                    <a href="" className="btn btn-primary btn-lg disabled">
                                        Register
                                    </a>
                                </p> */}
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                        <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                        <Image src="/assets/programmer.svg" width={150} height={150} className={home.cardTopOverflow} alt="Hackathons"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Code &amp; Enterprise Hackathons</h3>
                                <p className="card-text">Hackathons help break through the barriers of a stale "business as usual" culture into creative disruption and intense innovation. Our 1-3 day Hackathon events will not only solve technical problems, and deliver new innovative software and hardware, but will accelerate organizational digitization strategies and improve customer processes.</p>
                            </div>
                        </div>
                    </div>

                </div>




                <div className="col-12 d-flex justify-content-between flex-wrap bg-light p-5">
                    <div className="col-md-6 col-12 p-md-5 p-md-5">
                        <h3 className="fs-2 fw-bold">Each class lesson is on Saturday mornings from 9am to 12 Noon for just R799 per course.</h3>
                        <p className="lead">
                            Our classes are priced so that anyone can attend and all can afford.
                        </p>
                        <p className="lead">
                            <strong>REQUIREMENTS:</strong> All students will need to bring their own laptop computer. Mac or PC with enough space to run and install software.  Don't have a computer? <a href="mailto:workforce@grithub.org.za">Email</a> us and we can help you with financing options.
                        </p>
                    </div>

                    <div className="col-md-6 col-12 p-md-5 p-md-5">
                        <h3 className="fs-2 fw-bold">Are You A Newbie To Coding?</h3>
                        <p className="lead">We recommend taking the below courses in order. Each course is 6 weeks long and about 24 hours of instruction. Classes are available in-person George, Western Cape and online via Zoom</p> 
                        <p className="lead">All sales are final. Refunds will only be given for life events and will be in the form of credit to use for a future class.</p>
                    </div>
                </div>





                <h2 className="fw-bold display-5 mt-5 pt-5 mb-0 text-center">
                    STEM Education Programs
                </h2>
                <div className="col-12 d-flex justify-content-between flex-wrap">
                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/CoderDojo-Logo.svg" width={250} height={150} className={home.cardTopOverflow} alt="STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">The CoderDojo</h3>
                                <p className="card-text">A Dojo is a free, volunteer-led, community-based computer club for young people. Anyone aged 7 to 17 can visit a Dojo and learn to code, build a website, or create an app or game. Dojos are a space for kids and teens to explore technology in an informal, creative, safe and social environment.</p>
                                <p className="d-grid">
                                    <a href="/programs/dojo"className="btn btn-primary btn-lg">
                                        Learn more
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/atom.svg" width={150} height={150} className={home.cardTopOverflow} alt="STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Science, Technology, Engineering and Mathematics (STEM)</h3>
                                <p className="card-text">We are a partner in science, technology and industrial learning to supplement the inadequate number of teachers skilled to educate in these areas.  We will promote STEM careers, and teach short courses as well as create fun STEM based science events.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S2468227619307616-main.pdf" target="_blank" rel="noreferrer" title="whitepaper on stem in africa">White Paper: Engineering education, development and growth in Africa &rsaquo;</a>
                            </div>
                        </div>
                    </div> */}

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/game-pad.svg" width={150} height={150} className={home.cardTopOverflow} alt="Roblox Proggrams"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Roblox&reg; Game Engineering</h3>
                                <p className="card-text">Gamification is a powerful vehicle for learning. Our goal is to have introductory workshops on development and design using the popular <a className="text-decoration-underline" href="https://education.roblox.com/en-us/" target="_blank" rel="noreferrer" title="Roblox education">Roblox&reg;</a> education platform amongst others. We will use our Gaming Center to teach students of all ages computer science, digital citizenship, entrepreneurship, competition and fair play.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S1071581920300987-main.pdf" target="_blank" title="whitepaper on gamification" rel="noreferrer">White Paper: The Effect of Challenge-Based Gamification on Learning &rsaquo;</a>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/lego.svg" width={150} height={150} className={home.cardTopOverflow} alt="LEGO STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">LEGO&reg; STEM Learning</h3>
                                <p className="card-text">The LEGO&reg; Foundation released a report stating that STEM learning through play holistically enhances a learner's social, emotional, physical and creative skills. Through <a className="text-decoration-underline" href="https://education.lego.com/en-us/customer-stories" target="_blank" rel="noreferrer" title="more about LEGO stem">LEGO&reg; STEM</a> our goal is to eliminate the idea of "Hard" math and science through fun and curious play using LEGO&reg; STEM Toys in Grade R-12 schools.</p>
                                <a className="text-decoration-underline" href="/whitepapers/le_learning_through_play_whitepaper_digital_pdf.pdf" target="_blank" rel="noreferrer" title="whitepaper on lego education">White Paper: LEGO&reg; Education - The unrealized potential of learning through play at school &rsaquo;</a>
                            </div>
                        </div>
                    </div>
                </div>




                <h2 className="fw-bold display-5 mt-5 pt-5 mb-0 text-center">
                    Community Workshops &amp; Seminars
                </h2>

                <div className="col-12 d-flex justify-content-between flex-wrap">
                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/tractor.svg" width={150} height={150} className={home.cardTopOverflow} alt="Agricultural Technology"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Agricultural Technology</h3>
                                <p className="card-text">Agriculture 4.0 uses operational technology such as robots, Internet of Things (IoT) and GPS. This technology allows farms to be more profitable, efficient, safer, and more environmentally friendly. Through AgriTech we aim to innovate and assist in modernizing the Garden Route's farms, thereby broadening their supply chain and viability.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S2211912419301804-main.pdf" target="_blank" rel="noreferrer" title="whitepaper on agricultural technology">White Paper: The Game-Changing Technologies of Agriculture 4.0 &rsaquo;</a>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/smart-house.svg" width={150} height={150} className={home.cardTopOverflow} alt="Agricultural Technology"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Short-Term Rental &amp; Tourism Technology</h3>
                                <p className="card-text">Disruptive Technologies such as Short Term Rentals and IoT has made touchless rentals and tourism more and more popular. Our Tourism Technology program aims to bring technological know how, techniques and ways to lessen the overhead burden to the small tourism business that make up one of the largest sectors in the Garden Route.</p>
                                <a className="text-decoration-underline" href="/whitepapers/RentalsUnitedTechReport2020SM.pdf" target="_blank" rel="noreferrer" title="whitepaper on short term rental">White Paper: The Global Short Term Rental Tech Report &rsaquo;</a>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-md-5 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/healthcare.svg" width={150} height={150} className={home.cardTopOverflow} alt="Public Health"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Public Health Technology</h3>
                                <p className="card-text">Our aim is to significantly incorporate modern technology into South Africa's health sector. We will produce tools, software and data analytics to improve and enhance awareness of access to public healthcare which will ultimately improve the health outcomes in the Garden Route community.</p>
                                <a className="text-decoration-underline" href="/whitepapers/Materilie345_digital_health_africa.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital health ecosystem">White Paper: Digital Health Ecosystem for African Countries &rsaquo;</a>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

        </GeneralPage>
    )
}