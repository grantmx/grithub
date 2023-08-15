import Image from "next/image";
import GeneralPage from "../components/layout/GeneralPage";
import aboutImg from "public/assets/about.jpg"


function About(){
    return(
        <GeneralPage 
            title="About Us"
        >
            <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5" id="coworking">
                <div className="col-12 d-flex flex-md-row flex-column mt-3">
                    <div className="col-12 col-md-7 pe-md-5">
                        <p className="lead">The Garden Route Innovation and Technology Hub (GRIT Hub) is a South African registered non-profit company with a simple mission: To identify untapped potential and refocus it using the power of digital technology.</p>
                        <p>We provide workforce training, apprenticeships, tools, and mentorship opportunities to youth, small businesses, and stakeholders to actively engage in the innovation economy.  To achieve this, we believe all it takes is GRIT and determination. </p> 

                        <p>Located in the Western Cape's Garden Route and Klien Karoo region, our fully furnished and modern coworking and meeting space inspires creativity and promotes cluster collaboration. Our space provides a productive, accessible, and secure work environment allowing patrons the opportunity to network with like-minded people.</p>

                        <h2>Our Vision & Mission</h2>

                        <p>To be the premier regional technology hub catalyzing small businesses, entrepreneurs, and startups in the innovation economy by connecting citizens in the inner-city, urban, small town and rural communities of the Garden Route/Klien Karoo Region to new economic opportunities through technological entrepreneurial tools and techniques focusing on inclusive competitive empowerment.</p>

                        <h2>Our Core Values</h2>

                        <p>In working towards our vision and mission, the values that guide us are:</p>

                        <ul>
                            <li>Innovative - nurturing a culture of technological game changers breaking historical glass ceilings.</li>
                            <li>Entrepreneurial - fostering profitable and sustainable high-growth enterprises. </li>
                            <li>Collaborative - sharing knowledge and skills to accelerate growth.</li>
                            <li>Inclusive - all are welcome and encouraged to patriciate.</li>
                            <li>Responsible - promoting high ethical values and interpersonal soft skills.</li>
                            <li>Giving - giving of time, talent, and energy for the upliftment of society through technology.</li>
                        </ul>

                        <h2>Strategy</h2>

                        <p>In alignment with the National Integrated Small Enterprise Development (NISED) Masterplan 2022, our strategy focuses on creating empowerment opportunities through real workforce training, programming, and small business incubation.  In addition, assistance in overcoming SMME barriers to capital, technology, unlimited internet, and software access, as well as creating affordable shared co-working, co-creating, and workshop spaces.</p>
                    </div>

                    <div className="col-12 col-md-5">
                        <Image 
                            width={200}
                            height={1000}
                            src={aboutImg.src}
                            style={{ objectFit: "contain", width: "100%", height: "auto" }}
                        />
                    </div>
                </div> 
            </section>
        </GeneralPage>
    )
}


export default About;