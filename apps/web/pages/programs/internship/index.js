import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import intern from "public/assets/coworkers-working-office.jpg"
import Style from "./internship.module.scss"
import clsx from "clsx";
import Link from "next/link"



function Internship(){
    return(
        <GeneralPage 
            title="The GRIT Internship"
            subTitle="The GRIT Internship Program offers highly motivated individuals an opportunity to be exposed to meaningful enterprise level workplace experience"
		>
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-md-row flex-column mt-3">
                    <div className="col-12 col-md-8 pe-md-5">
                        <h2>About The Internship</h2>
                        <p>Gaining hands-on experience as a student enhances your education and gives you an edge in your career journey. The Garden Route Innovation & Technology Hub is an ideal place for you to push yourself and get involved in meaningful real life projects.</p>
                        <p>In addition, the Internship allows individuals to bring new perspectives, innovative ideas and research experience into GRIT Hub's work, while improving skills and enhancing your CV with practical work experience.</p> 
                        <p>Internships are available in both Information Technology (All areas) and Business Studies (Marketing & Management) as well as, from time-to-time other business units (such as Human Resources, Communications, Accounting, etc.). <strong>However, please note availability during a given internship term is based on business need and your focus area may not be selected for this term.</strong></p>

                        <hr className="my-5"/>

                        <h3>Eligibility Criteria</h3>
                        <p>To be eligible for an Internship, candidates must have <strong>earned a South African National Senior Certificate or the equivalent of High School Diploma</strong>.  Being enrolled for either an undergraduate degree or in a TVET College is highly desireable.  There is no age limit.</p>
                        <p>Fluency in English is required. Other skills such as computing skills are extremely advantageous.</p>
                        <p>With a core value of Digital Inclusion in the workplace, we value diversity and encourage all qualified individuals, particularly women, with diverse cultural and academic backgrounds to apply.</p>
                        <p>For all non South African applicants, you must have a valid Student or Work visa or have a Temporary or Permanent residency with the ability to work.</p>

                        <h3>Additional Information</h3>
                        <p>The GRIT Internship Program seeks candidates in the following fields of interest and study:</p> 
                            <ul>
                                <li><b>Information Technology</b>
                                    <ul>
                                        <li>Hardware and Server Management, </li>
                                        <li>Software Development, </li>
                                        <li>Software Quality Assurance, </li>
                                        <li>DevOps, </li>
                                        <li>IT Business Analysis, </li>
                                        <li>User Experience Design and Development, </li>
                                        <li>Software Design, </li>
                                    </ul>
                                </li>
                                
                                <li><b>Business Studies</b> 
                                    <ul>
                                        <li>Online Marketing, </li>
                                        <li>Online Advertising, </li>
                                        <li>Social Media Marketing, </li>
                                    </ul>
                                </li>
                                
                                <li>Content Creation, </li>
                                <li>Event Planning, </li>
                                <li>Human Resources, </li>
                                <li>and Program Management</li>
                            </ul>

                        <p>The GRIT Internship pays a monthly travel allowance up to R 1,000/mo. with a weekly commitment of 2 to 5 days a week of in office activities. Interns are responsible for their own accommodations. Driven by business needs, most Intern positions are based in George, South Africa.</p>

                        <h4>The GRIT Internship is offered once a year:</h4>
                        <p>Winter Internship (July-December): The application period is July-August each year.</p>
                        <p>All applications must be submitted online and during the respective application period. (We do not accept applications by email.)</p>

                        <h4>Application Process</h4>
                        <p>Applications must be completed by 11:59 PM CAT on the last day of the application period. Take time to prepare your application and enter your personal information accurately. You will be asked to upload the following documents:</p>

                        <ul className="list-unstyled">
                            <li>- Curriculum Vitae (CV)</li>
                            <li>- Statement of Interest</li>
                            <li>- Copy of your SA ID or Passport</li>
                            <li>- Copy of your SA Senior Certificate or High School Diploma</li>
                        </ul>

                        <strong>Please Note</strong>
                        <ul>
                            <li>Please make sure that the filenames of the documents that you are attaching do not contain any special characters, etc. PDF files are the best files to upload.</li>
                            <li>Once you submit your application, you will not be able to make any further changes/updates.</li>
                            <li>Upon submission of your application you will receive an email confirmation.</li>
                        </ul>

                        <h4>Selection</h4>
                        <p>All applications are stored in a database which is consulted by hiring Managers based on business needs. Please note that candidates will not hear from us unless they are shortlisted by a hiring Manager that is looking to hire an intern.  We do not have a pre-identified number of positions for interns per season. For each season, hiring is solely based on business needs.</p>       
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
                            <p>Submit your internship application online. Application Deadline: <strong>31 August 2023</strong></p>

                            <Link href="/programs/internship/apply" className="btn btn-danger">
                                Apply Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </GeneralPage>
    )
}


export default Internship;