import Image from "next/image";
import GeneralPage from "../components/layout/GeneralPage";
import Link from "next/link";


function MediaKit(){
    return(
        <GeneralPage 
            title="Media Kit"
            centerTitle
        >
            <section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column" id="programs-workshops">
                <div className="text-center col-md-9 col-12 justify-content-center d-flex align-items-center flex-column">
                    <p className="fs-3">
                        These resources exist to assist you in utilizing our brand and assets, including our logo, content, and trademarks, without the need to engage in legal agreements for each utilization.
                    </p>
                    <p>
                        <a href="/media-kit.zip" download={true} className="btn btn-danger d-flex align-items-center">
                            Download Media Kit &nbsp;

                            <svg id="icon-download" viewBox="0 0 24 24" fill="#ffffff" width="20" height="20">
                                <path d="M21 14c-0.6 0-1 0.4-1 1v4c0 0.6-0.4 1-1 1h-14c-0.6 0-1-0.4-1-1v-4c0-0.6-0.4-1-1-1s-1 0.4-1 1v4c0 1.7 1.3 3 3 3h14c1.7 0 3-1.3 3-3v-4c0-0.6-0.4-1-1-1z"></path>
                                <path d="M11.3 15.7c0.1 0.1 0.2 0.2 0.3 0.2 0.1 0.1 0.3 0.1 0.4 0.1s0.3 0 0.4-0.1c0.1-0.1 0.2-0.1 0.3-0.2l5-5c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-3.3 3.3v-9.6c0-0.6-0.4-1-1-1s-1 0.4-1 1v9.6l-3.3-3.3c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l5 5z"></path>
                            </svg>
                        </a>
                    </p>

                    
                    <h2 className="mt-5 fs-1">Logo Guidelines</h2>
                    <p className="col-8">Our logo must never be used in a way that implies an endorsement or affiliation with GRIT Hub where such a relationship does not exist, such as being featured on the cover of a book or in a TV commercial.</p>

                    <div className="my-5 pt-3 d-flex justify-content-evenly align-items-center">
                        <figure>
                            <Image 
                                src="/assets/grithub-logo-horz.svg" 
                                width={500} 
                                height={125} 
                                alt="GRITHub Logo" 
                            />
                            {/* <figcaption className="text-muted">
                                <small>(Our Horizontal Logo)</small>
                            </figcaption> */}
                        </figure>

                        {/* <figure>
                            <Image 
                                src="/assets/grithub-logo-vertical.svg" 
                                width={300} 
                                height={200} 
                                alt="GRITHub Logo" 
                            />
                            <figcaption className="text-muted">
                                <small>(Our Vertical Logo)</small>
                            </figcaption>
                        </figure> */}
                    </div>

                    <div className="col-12 d-flex flex-wrap">
						<div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
                            <h4>Use the appropriate color</h4>

							<p className="pt-3 text-center">
                                We’ll usually ask you to use the full-color horizontal version of our logo on a white background. The white and/or vertical versions are acceptable when there are constraints.
                            </p>
						</div>

                        <div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
                            <h4>Don’t modify the logo</h4>

							<p className="pt-3 text-center">
                                Don’t modify or distort the logo, change any colors, or add additional elements, words or taglines.
                            </p>
						</div>

                        <div className="col-xl-4 col-md-6 col-12 p-4 d-flex flex-column align-items-center">
                            <h4>Adhere to proper clear space</h4>

							<p className="pt-3 text-center">
                                The amount of clear space around our logo should be equal to or greater than the height of our main branded red circle mark.
                            </p>
						</div>
                    </div>

                    <p>
                        By using the GRIT Hub marks you agree to follow these guidelines as well as our <Link href="/terms">Terms of Service</Link> and all our rules and policies. GRIT Hub reserves the right to cancel, modify, or change the permission in these guidelines at any time at its sole discretion. To make any use of our marks in a way not covered by these guidelines, please contact us at <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a> and include a visual mockup of intended use. For press inquiries, please reach out to <a href="mailto:pr@grithub.org.za">pr@grithub.org.za</a>.
                    </p>
                </div>
            </section>
        </GeneralPage>
    )
}


export default MediaKit