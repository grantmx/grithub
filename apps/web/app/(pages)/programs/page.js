import Image from "next/image";
import ribbon from '@/styles/ribbon.module.scss'
import Style from "../../(pages)/page.module.scss";
import Link from "next/link";
import clsx from "clsx";


export const metadata = {
    title: "Programs",
    description: "Our Workforce Training, Programs and Workshops are meant to get us ahead of the challenges and trends of an ever changing economic environment and into the innovator economy.",
    openGraph: {
        title: "Programs",
        description: "Our Workforce Training, Programs and Workshops are meant to get us ahead of the challenges and trends of an ever changing economic environment and into the innovator economy.",
        url: "https://grithub.org.za/programs",
        siteName: "GRIT Hub",
    },
	alternates: {
		canonical: 'https://grithub.org.za/programs',
	}
}



export default function Programs(){
    return(
        <>
            <section className="container-xxl d-flex pt-5 flex-column mb-5" id="programs">
                <h1 className="display-2 fw-bold">
                    Trainings, Programs &amp; Courses
                </h1>
                <p className="lead text-muted fs-3">
                    Our Workforce Training, Programs and Workshops are meant to get us ahead of the challenges and trends of an ever changing economic environment and into the innovator economy.
                </p>
            </section>


            <div className="col-12 p-4 d-flex justify-content-center flex-column flex-md-row bg-light">                    
                <div className="col-md-6 col-12 p-md-5 py-3 d-flex justify-content-end flex-row">
                    <Link href="/programs/internship" title="apply today">
                        <Image 
                            src="/assets/winter-internship-blank.jpg" 
                            width={711} 
                            height={400}
                            className={Style.adImg}
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
                        <Link href="/programs/internship" className="btn rounded-pill btn-danger btn-lg px-4" title='apply today'>
                            Learn more &nbsp;&rsaquo;
                        </Link>
                    </p>
                </div>
            </div>
            







            <section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column" id="programs-workshops">
                <h2 className="fw-bold display-4 mt-5 mb-0 text-center">
                    Real Life Workforce Training.<br/>Start Your Journey Now!
                </h2>

                <div className="text-center col-md-9 col-12 p-md-5 p-3">
                    <p className="fs-2 lead">
                        Our up-to-date curriculum comes from proven web and software industry professionals unlike anything you will find from a textbook.
                    </p>
                </div>

               
                <div className="col-12 d-flex justify-content-between flex-wrap bg-light p-5">
                    <div className="col-md-6 col-12 p-md-5 p-md-5">
                        <h3 className="fs-2 fw-bold">Each class is taught by QCTO Certified industry professionals starting from R 999</h3>
                       
                        <p className="lead">
                            <strong>REQUIREMENTS:</strong> All students will need to bring their own laptop computer. Mac or PC with enough space to run and install software.  Don't have a computer? <a href="mailto:workforce@grithub.org.za">Email</a> us and we can help you with financing options.
                        </p>
                    </div>

                    <div className="col-md-6 col-12 p-md-5 p-md-5">
                        <h3 className="fs-2 fw-bold">Are You A Newbie To Coding?</h3>
                        <p className="lead">We recommend taking the below courses in order. Classes are available in-person George, Western Cape.</p> 
                        <p className="lead">All sales are final. Refunds will only be given for life events and will be in the form of credit to use for a future class.</p>
                    </div>
                </div>
               

                <div className="container-xxl col-12 d-flex justify-content-between flex-wrap">
                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/web-design.svg" width={400} height={200} className={Style.cardTopOverflow} alt="html" />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Web Designer</h3>
                                <p className="card-text">
                                    <strong>QCTO Accredited Course:</strong> By the end of this course, you will be able to design and build a multi-page website using HTML, CSS and JavaScript. You will have a basic understanding of how the internet works, how to select a hosting service, and publish your hand-made website for the world to see.
                                </p>
                                
                                <p className="d-grid">
                                    <Link 
                                        href="/programs/web-designer" 
                                        title="learn more about Web Designer"
                                        className="btn rounded-pill btn-danger btn-lg"
                                    >
                                        Read more &nbsp;&rsaquo;
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/html.png" width={150} height={150} className={Style.cardTopOverflow} alt="html" />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Website (HTML) Programmer</h3>
                                <p className="card-text"><strong>QCTO Accredited Course:</strong> By the end of this course, you will be able to describe how the world wide web works and have a basic understanding of the internet. You would have designed and built your own multi-page website, select a hosting service, and publish your hand-made website for the world to see.</p>
                                
                                <p className="d-grid">
                                    <Link 
                                        href="/programs/websites-for-beginners" 
                                        title="learn more about websites for beginners"
                                        className="btn rounded-pill btn-danger btn-lg"
                                    >
                                        Read more &nbsp;&rsaquo;
                                    </Link>
                                </p>

                            </div>
                        </div>
                    </div>

                    


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/js.png" width={150} height={150} className={Style.cardTopOverflow} alt="javascript"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">JavaScript Programmer</h3>
                                
                                <p className="card-text"><strong>QCTO Accredited Course:</strong> Learn the history of JavaScript; how to write proper functional JavaScript syntax and Object Oriented Programming concepts; You should be able to iterate data and show the results in the browser and have completed a JavaScript application.</p>
                                

                                <p className="d-grid">
                                    <Link 
                                        href="/programs/intro-into-javascript" 
                                        title="learn more about Intro into JavaScript"
                                        className="btn rounded-pill btn-danger btn-lg"
                                    >
                                        Read more &nbsp;&rsaquo;
                                    </Link>
                                </p>

                                {/* <p className="d-grid">
                                    <a href="https://grithub-za-1.hubspotpagebuilder.com/javascript" target='_blank' className="btn rounded-pill btn-success btn-lg" rel="noreferrer">
                                        Register
                                    </a>
                                </p> */}
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                        <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/programmer.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Hackathons"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Technopreneur</h3>

                                <p className="card-text">
                                    <strong>QCTO Accredited Course:</strong> This is a class that will take you from a beginner to a professional technopreneur.  You will learn how to ideate, validate, build and launch a technology startup.  This class is for those who want to learn to build and launch a technology startup.
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                        <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/cyber-security.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Hackathons"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">CyberSecurity Defender</h3>

                                <p className="card-text">
                                    <strong>QCTO Accredited Course:</strong> This is a class that will take you from a beginner to a professional in cyber security.  You will learn how to protect systems, networks, and data from cyber threats.  This class is for those who want to learn to secure and defend technology infrastructures.
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                        <div className={ribbon.ribbon_top_right}><span>QCTO</span></div>
                            <Image src="/assets/gaming.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Hackathons"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">End User Computing (Basic, Intermediate, Advanced)</h3>

                                <p className="card-text">
                                    <strong>QCTO Accredited Course:</strong> This is a class that will take you from a beginner to a professional in end user computing.  You will learn how to effectively use and manage computer systems, software, and applications.  This class is for those who want to enhance their productivity and technical skills.
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={clsx(ribbon.ribbon_top_right, ribbon.ribbon__purple)}><span>Workforce</span></div>
                            <Image src="/assets/chip.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Hackathons"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Artificial Intelligence</h3>

                                <p className="card-text">
                                    This is a class that will take you from a beginner to a competent user in artificial intelligence applications.  You will learn how to build and deploy AI models and applications.  This class is for those who want to learn to create intelligent systems and solutions.
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={clsx(ribbon.ribbon_top_right, ribbon.ribbon__purple)}><span>Workforce</span></div>
                            <Image src="/assets/react.png" width={150} height={150} className={Style.cardTopOverflow} alt="react"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">React (Advanced)</h3>
                                <p className="card-text">
                                    Learn how to easily build stateful component based UIs and applications using the Javascript React.js library.  You will learn how to setup React, learn the fundaments such as components, props and state, techniques, pitfalls and strengths.
                                </p>
                                

                                <p className="d-grid">
                                    <Link 
                                        href="/programs/react-advanced" 
                                        title="learn more about React (Advanced)"
                                        className="btn rounded-pill btn-danger btn-lg"
                                    >
                                        Read more &nbsp;&rsaquo;
                                    </Link>
                                </p>
                                
                                
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={clsx(ribbon.ribbon_top_right, ribbon.ribbon__purple)}><span>Workforce</span></div>
                            <Image src="/assets/nextjs.png" width={150} height={150} className={Style.cardTopOverflow} alt="nextjs"  />
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Next.js (Advanced)</h3>
                                <p className="card-text">
                                    Next.js is a React framework used in tens of thousands of production-facing websites and web applications, including many of the world's largest brands. Learn about page based routing, SSR and ISR pre-rendering, code splitting, and API routes, 
                                </p>
                                

                                <p className="d-grid">
                                    <Link 
                                        href="/programs/nextjs-advanced" 
                                        title="learn more about Next.js (Advanced)"
                                        className="btn rounded-pill btn-danger btn-lg"
                                    >
                                        Read more &nbsp;&rsaquo;
                                    </Link>
                                </p>
                        
                            </div>
                        </div>
                    </div>
                </div>








                <h2 className="fw-bold display-5 mt-5 pt-5 mb-0 text-center">
                    STEM Education Programs
                </h2>

                <div className="col-12 d-flex justify-content-between flex-wrap container-xxl">
                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/CoderDojo-Logo.svg" width={250} height={150} className={Style.cardTopOverflow} alt="STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">The CoderDojo</h3>
                                <p className="card-text">A Dojo is a free, volunteer-led, community-based computer club for young people. Anyone aged 7 to 17 can visit a Dojo and learn to code, build a website, or create an app or game. Dojos are a space for kids and teens to explore technology in an informal, creative, safe and social environment.</p>
                                <p className="d-grid">
                                    <a href="/programs/dojo" className="btn rounded-pill btn-danger btn-lg" title="more about our coder dojos">
                                        Learn more
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/atom.svg" width={150} height={150} className={Style.cardTopOverflow} alt="STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Science, Technology, Engineering and Mathematics (STEM)</h3>
                                <p className="card-text">We are a partner in science, technology and industrial learning to supplement the inadequate number of teachers skilled to educate in these areas.  We will promote STEM careers, and teach short courses as well as create fun STEM based science events.</p>
                                <p className="d-grid">
                                    <a href="/contact" className="btn rounded-pill btn-danger btn-lg">
                                        Partner with us  &nbsp;&rsaquo;
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/game-pad.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Roblox Proggrams"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Roblox&reg; Game Engineering</h3>
                                <p className="card-text">Gamification is a powerful vehicle for learning. Our goal is to have introductory workshops on development and design using the popular <a className="text-decoration-underline" href="https://education.roblox.com/en-us/" target="_blank" rel="noreferrer" title="Roblox education">Roblox&reg;</a> education platform amongst others. We will use our Gaming Center to teach students of all ages computer science, digital citizenship, entrepreneurship, competition and fair play.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S1071581920300987-main.pdf" target="_blank" title="whitepaper on gamification" rel="noreferrer">White Paper: The Effect of Challenge-Based Gamification on Learning &rsaquo;</a>
                            </div>
                        </div>
                    </div> */}

                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right} ${ribbon.ribbon__green}`}><span>STEM</span></div>
                            <Image src="/assets/lego.svg" width={150} height={150} className={Style.cardTopOverflow} alt="LEGO STEM"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">FIRST® LEGO® League</h3>
                                <p className="card-text">Designed for young innovators aged 4 to 16, FIRST LEGO League offers a progressive pathway that grows with each learner, from playful exploration to real-world problem-solving through coding, engineering, and research. Learners worldwide tackle themed challenges and connect through dynamic local and global events that celebrate creativity, collaboration, and innovation—values closely aligned with GRIT Hub's mission.</p>
                                <a className="text-decoration-underline" href="/whitepapers/le_learning_through_play_whitepaper_digital_pdf.pdf" target="_blank" rel="noreferrer" title="whitepaper on lego education">White Paper: LEGO&reg; Education - The unrealized potential of learning through play at school &rsaquo;</a>
                            </div>
                        </div>
                    </div>
                </div>


{/* 
                <h2 className="fw-bold display-5 mt-5 pt-5 mb-0 text-center">
                    Community Workshops &amp; Seminars
                </h2>

                <div className="col-12 d-flex justify-content-between flex-wrap container-xxl">
                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/tractor.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Agricultural Technology"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Agricultural Technology</h3>
                                <p className="card-text">Agriculture 4.0 uses operational technology such as robots, Internet of Things (IoT) and GPS. This technology allows farms to be more profitable, efficient, safer, and more environmentally friendly. Through AgriTech we aim to innovate and assist in modernizing the Garden Route's farms, thereby broadening their supply chain and viability.</p>
                                <a className="text-decoration-underline" href="/whitepapers/1-s2.0-S2211912419301804-main.pdf" target="_blank" rel="noreferrer" title="whitepaper on agricultural technology">White Paper: The Game-Changing Technologies of Agriculture 4.0 &rsaquo;</a>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/smart-house.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Agricultural Technology"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Short-Term Rental &amp; Tourism Technology</h3>
                                <p className="card-text">Disruptive Technologies such as Short Term Rentals and IoT has made touchless rentals and tourism more and more popular. Our Tourism Technology program aims to bring technological know how, techniques and ways to lessen the overhead burden to the small tourism business that make up one of the largest sectors in the Garden Route.</p>
                                <a className="text-decoration-underline" href="/whitepapers/RentalsUnitedTechReport2020SM.pdf" target="_blank" rel="noreferrer" title="whitepaper on short term rental">White Paper: The Global Short Term Rental Tech Report &rsaquo;</a>
                            </div>
                        </div>
                    </div>


                    <div className="col-xl-4 col-md-6 col-12 p-3">
                        <div className="card shadow-sm position-relative h-100 align-items-center">
                            <div className={`${ribbon.ribbon_top_right}`}><span>Program</span></div>
                            <Image src="/assets/healthcare.svg" width={150} height={150} className={Style.cardTopOverflow} alt="Public Health"/>
                            <div className="card-body d-flex flex-column justify-content-between">
                                <h3 className="card-title fs-4 fw-bold">Public Health Technology</h3>
                                <p className="card-text">Our aim is to significantly incorporate modern technology into South Africa's health sector. We will produce tools, software and data analytics to improve and enhance awareness of access to public healthcare which will ultimately improve the health outcomes in the Garden Route community.</p>
                                <a className="text-decoration-underline" href="/whitepapers/Materilie345_digital_health_africa.pdf" target="_blank" rel="noreferrer" title="whitepaper on digital health ecosystem">White Paper: Digital Health Ecosystem for African Countries &rsaquo;</a>
                            </div>
                        </div>
                    </div>

                </div> */}
            </section>

        </>
    )
}