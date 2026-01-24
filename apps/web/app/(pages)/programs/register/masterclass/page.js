import Image from "next/image";
import MasterClassForm from "components/programs/MasterClassForm";
import PageHeader from "components/layout/PageHeader";
import classImg from "public/ads/q1-2025-masterclass-thumb.jpg";
import masterclassImg from "@/public/ads/q1-2025-masterclass.png"


export const metadata = {
    title: "Coding Masterclass",
    description: "From beginner to a professional web developer. Learn from the experts.",
    openGraph: {
        url: "https://grithub.org.za/programs/register/masterclass",
        title: "Coding Masterclass",
        description: "From beginner to a professional web developer. Learn from the experts.",
        images: [
            {
                url: "https://grithub.org.za" + masterclassImg.src,
                width: 800,
                height: 800,
                alt: "Coding Masterclass",
                type: 'image/jpeg',
            },
        ],
        siteName: 'Garden Route Innovation & Technology Hub',
    },
}


async function MasterClassRegister() {
    return (
        <>
            <section className="container-xxl d-flex pt-5 flex-column mb-5" id="programs">
                <PageHeader 
                    title="Coding Masterclass" 
                    subTitle="From beginner to a Web Developer: Kickstart your tech career with our 6-week masterclass and learn from the experts." 
                />
            </section>

            <div className="container-xxl d-flex flex-column mb-5">
                <div className="col-12 d-flex flex-column flex-md-row mt-3">
                    <MasterClassForm />

                    <div className="col-12 col-md-4">
                        <Image 
                            src={classImg.src} 
                            placeholder="blur"
                            blurDataURL={classImg.blurDataURL}
                            width={400} 
                            height={400} 
                            alt="html" 
                            style={{ objectFit: "contain" }} 
                        />


                        <p className="mt-3">
                            When: <strong>13 January to 19 February;<br/>
                            Every Monday & Wednesday from 9 AM to 12 PM</strong>
                            <br />
                            <br />
                            Where: <strong>Garden Route Innovation & Technology Hub, George Campus</strong><br />
                            <br />
                            How Much: <strong>Cost: R3,499</strong>
                            <br />
                        </p>

                        <hr/>

                        <p>
                            <strong>CLASS REQUIREMENTS:</strong> Students will need a laptop computer (not a Chromebook). Don't have a computer? Don't let that stop you from joining us! Email workforce@grithub.org.za to inquire about options.
                        </p>

                        
                    </div>
                </div>
            </div>
        </>
    )
}



export default MasterClassRegister;