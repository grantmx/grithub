import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import intern from "public/assets/nmu-idea-app-img.jpg"
import Style from "./competition.module.scss"
import clsx from "clsx";
import Link from "next/link"



function Competition(){
    return(
        <GeneralPage 
            title="Innovative Ideas Competition"
            subTitle="The GRIT Hub Innovative Ideas Competition is designed to provide students with early-stage ideas to compete for cash prizes of R10,000!"
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-md-row flex-column mt-3">
                    <div className="col-12 col-md-8 pe-md-5">
                        <h2>About The Competition</h2>
                        <p>GRIT Hub is thrilled to present the GRIT Hub Innovative Ideas Competition, exclusively for the talented students of Nelson Mandela University's George Campus. This competition offers Nelson Mandela University George students a unique platform to showcase their innovative ideas and start their entrepreneurial journey.</p>
                        <p>By fostering a culture of innovation and entrepreneurship among students, the GRIT Hub Innovative Ideas Competition aims to contribute to the development of a robust ecosystem of student startups and innovators within your campus community. Through mentorship, networking opportunities, and access to resources, GRIT Hub is dedicated to helping student participants transform their ideas into tangible solutions that address real-world challenges and create positive impact.</p>
                        <p>More importantly, participating students will gain access to the GRIT Hub entrepreneurship program on their campus, to get the support on their entrepreneurship journey and skill-building. This signature program supports our goal in de-risking entrepreneurship, broadening accessibility, and diversifying engagement with a focus on recruiting underrepresented and under-resourced students to participate.</p>
                        
                        <hr className="my-5"/>

                        <h3>Competition Tracks</h3>
                        <p>Participants will need to select 1 of the following 2 tracks</p>
                        <ul>
                            <li>Social & Climate/Environmental Impact</li>
                            <li>Consumer Products & Services</li>
                        </ul>
                        <p><strong><sup>*</sup>NOTE:</strong> Embracing technological advancements is key to driving innovation and creating meaningful change, and we're eager to witness the innovative ways in which students intertwine technology with their ideas.  We encourage participants to explore and integrate technological solutions into their businesses, showcasing how they'd leverage the power of technology to address real-world challenges.</p>

                        <hr className="my-5"/>

                        <h3>Prizes</h3>
                        <p>Finalists from the application process will be invited to participate in the 12-week entrepreneurship program and will patriciate in a final pitch day competition. <strong><sup>**</sup>Winners from each track will receive R10,000.</strong></p>

                        <hr className="my-5"/>

                        <h3>Eligibility Criteria</h3>
                    
                        <ul className="list-unstyled">
                            <li>- Fill out the online application</li>
                            <li>- A short Youtube, TikTok, or Instagram reel of your idea (Elevator Pitch style no more than 90 seconds)</li>
                            <li>- Be a current student (undergraduate or graduate-level) at Nelson Mandela University George Campus​</li>
                            <li>- Be a founder/co-founder (i.e., the person with the original idea)</li>
                            <li>- Be in the earliest stages - have an idea or have just started building on an idea</li>
                            <li>- Copy of your SA ID or Passport</li>
                            <li>- Participate in our 12-week entrepreneurship training program</li>
                        </ul>
                        
                        <hr className="my-5"/>

                        <h3>Important Dates to Remember</h3>
                        <ul>
                            <li><strong>May 1</strong> - Applications open</li>
                            <li><strong>June 1</strong> - Deadline for final applications.  Applications must be submitted by June 1 at 11:59 PM.</li>
                            <li><strong>June 22</strong> - Finalists announced and contacted</li>
                            <li><strong>July 22</strong> - Program starts 2nd Semester</li>
                        </ul>

                        <hr className="my-5"/>


                        <p>Applications must be completed by 11:59 PM CAT on the last day of the application period. Take time to prepare your application and enter your personal information accurately.</p>

                        <strong>Please Note</strong>
                        <ul>
                            <li>Once you submit your application, you will not be able to make any further changes/updates.</li>
                            <li>Upon submission of your application you will receive an email confirmation.</li>
                        </ul>

                        <hr className="my-5"/>


                        <p className="alert alert-warning">
                            <strong><sup>*</sup>GOOD TO KNOW: An App is not a business.</strong>  While developing your innovative ideas, remember that creating an App alone does not constitute a viable business model; focus on building sustainable solutions with long-term value and impact.
                        </p>

                        <p className="alert alert-info">
                            <strong><sup>**</sup>PLEASE NOTE:</strong> In order to receive the R10,000 upon completion of the competition program, winners would have registered their business and have opened a business bank account.
                        </p>


                       
                    </div>

                    <div className="col-12 col-md-4">
                        <Image 
                            width={300}
                            height={200}
                            alt="internship"
                            src={intern.src}
                            className={Style.image}
                        />

                        <div className={clsx(Style.apply, "shadow-lg")}>
                            <h3>How to apply</h3>
                            <p>Submit your competition application online. {/* Application Deadline: <strong>31 August 2023</strong>*/}</p> 

                            {/* <Link href="/programs/internship/apply" className="btn btn-danger">
                                Apply Now
                            </Link> */}

                            <div className="alert alert-secondary text-center" role="alert">
                                Applications opening May 1
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </GeneralPage>
    )
}


export default Competition;