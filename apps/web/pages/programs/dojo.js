import GeneralPage from "components/layout/GeneralPage";
import Image from "next/image";
import image from "public/assets/coderdojo-hero.jpg"
import image2 from "public/assets/CoderDojo_One_Rule_Backgrounds_1920x1080_V1.jpg"



function CoderDojo(){
    return(
        <GeneralPage
            title="The CoderDojo"
            subTitle="We believe that developing digital-savviness and tech confidence in our children will foster the next generation of digital innovators"
            image={image}
        >


            <section className="container-xxl col-12 d-flex p-md-0 p-3 mb-5 flex-column">
               
                <h2 className="fw-bold display-5 my-5 text-center">
                    Our sessions take place every Tuesday, from 15:00–16:00.
                </h2>
                
                <article className="col-12 d-flex flex-md-row flex-column">
                    <div className="col-md-8 col-12 pe-md-5">
                        <h3>What is a CoderDojo?</h3>

                        <p>
                            CoderDojo is a global, open-source, volunteer-led movement of free, not-for-profit coding clubs for young people aged 7–17. 
                        </p>

                        <p>At a Dojo, young people learn to program and develop websites, apps, programs, and games, they build things with code and electronics, and much more. Members also meet like-minded people, show off what they’ve been working on, and they can take part in national and international events, such as our Coolest Projects showcase (coolestprojects.org). CoderDojo makes learning to code a fun, sociable, and creative experience. You can find out more at coderdojo.com.</p>
                    
                        <h3>
                            How to join
                        </h3>
                        
                        <p>Attending is free of charge, however signing up is necessary in order to guarantee your child a place. Please send us a <a href="#"  onClick={(e) =>{ e.preventDefault(); window.location.href="https://wa.me/270630705752"; }}>WhatsApp message or give us a call</a> and let us know you are attending.</p>
                    
                        <ul>
                            <li className="mb-3"><strong>What should I bring to the event?</strong> All children should bring a laptop. In case you cannot provide one, we have a small number of loan laptops. Please add that your child requires one to the additional notes section when booking a ticket.</li>
                            <li className="mb-3"><strong>Am I required to attend?</strong> Yes, children must be accompanied by a parent/guardian, who is required to remain on the premises for the duration of the session. You will be asked to help your child(ren) get set up and ready, though after this, our volunteer mentors will assist your children in their learning.</li>
                            <li className="mb-3"><strong>Should my child or I have prior coding knowledge?</strong> No, the Dojo is open to complete beginners as well as to young people who have coded before: we have skilled mentors who will help with technical questions.</li>
                        </ul>
                    </div>

                    <div className="col-md-4 col-12">
                        <Image {...image2} style={{width: "100%", height: "auto", objectFit: "contain"}} />
                </div>
                </article>

            </section>

        </GeneralPage>
    )
}


export default CoderDojo;