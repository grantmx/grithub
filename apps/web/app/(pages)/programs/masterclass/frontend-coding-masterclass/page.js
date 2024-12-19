import PageHeader from "components/layout/PageHeader";
import Image from "next/image";
import Link from "next/link";
import masterclassImg from "/public/ads/q1-2025-masterclass.png"
import Style from "../masterclass.module.scss";

export const metadata = {
    title: "Frontend Coding Masterclass",
    description: "From beginner to a Web Developer: Kickstart your tech career with our 6-week masterclass and learn from the experts.",
    openGraph: {
        url: "https://grithub.org.za/programs/masterclass/frontend-coding-masterclass",
        title: "Frontend Coding Masterclass",
        description: "From beginner to a Web Developer: Kickstart your tech career with our 6-week masterclass and learn from the experts.",
        images: [
            {
                url: "https://grithub.org.za" + masterclassImg.src,
                width: 800,
                height: 800,
                alt: "Frontend Coding Masterclass",
                type: 'image/jpeg',
            },
        ],
        siteName: 'Garden Route Innovation & Technology Hub',
    },
}

function FrontendMasterClassPage(){
    return(
        <section className="container-xxl d-flex flex-column mb-5">
            <section className="container-xxl d-flex pt-5 flex-column">
                <PageHeader 
                    title="Frontend Coding Masterclass" 
                    subTitle="From beginner to a Web Pro: Kickstart your tech career as a web developer with our 6-week frontend masterclass and learn from the experts." 
                />
            </section>

            <hr className="my-4"/>

            <div className="col-12 d-flex flex-md-row flex-column">
                <div className="col-12 col-md-8 pe-md-5">
                    <p>                        
                        When: <strong>13 January to 19 February; 
                        Every Monday & Wednesday from 9 AM to 12 PM</strong><br/>
                        Where: <strong>Garden Route Innovation & Technology Hub, George</strong><br />
                        How Much: <strong>Cost: R3,499</strong>
                    </p>

                    <hr className="my-4"/>

                    <h4 className="fs-2 mb-3">
                        What will you learn?
                    </h4>

                    <ul className="mb-4 lh-2">
                        <li className="mb-1">Enterprise Level Software for Web Development</li>
                        <li>HTML5, CSS3, SASS, Web Accessibility, and Design</li>
                        <li>Responsive Web Development & Design</li>
                        <li>History of JavaScript, ECMAScript, Object Oriented Scripting</li>
                        <li>The bad parts of JavaScript</li>
                        <li>Values, Types, and Operators</li>
                        <li>Programming Structure, Expressions, loops, syntax</li>
                        <li>Data Structures, Arrays, Objects, JSON</li>
                        <li>Getting and Sending data to the Server</li>
                        <li>Build a full functioning Website on a web-hosted setup using industry tools.</li>
                        <li>Obtain a GRIT Hub certification upon successful completion of this course.</li>
                    </ul>

                    <p>
                        <strong>CLASS REQUIREMENTS:</strong> Students will need a laptop computer (not a Chromebook). Don't have a computer? Don't let that stop you from joining us! Email workforce@grithub.org.za to inquire about options.
                    </p>
                </div>
            
                <div className="col-12 col-md-4">
                    <Link href="/programs/register/masterclass" title="register for masterclass">
                        <Image 
                            src={masterclassImg.src} 
                            width={400} 
                            height={400} 
                            alt="masterclass" 
                            className={Style.image}
                            placeholder='blur'
                            blurDataURL={masterclassImg.blurDataURL}
                        />
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default FrontendMasterClassPage;