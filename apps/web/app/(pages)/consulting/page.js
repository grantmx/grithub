/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";


function Consulting(){
    return(
        <section className="container-fluid d-flex justify-content-center align-items-center flex-column" id="programs-workshops">
            <article className="container-xxl d-flex pt-5 flex-column" id="programs">
                <h1 className="display-2 fw-bold">
                    Consulting &amp; Solutions
                </h1>
                <p className="lead text-muted fs-3">
                    We offer custom tailored technology consulting and development solutions to fit your organizations online and digital needs. Our technologists have a long history of helping clients realize their digital centric transformations for both their company and customer
                </p>
            </article>
            
            {/* <div className="text-center col-md-9 col-12">
                <p className="fs-3">.</p>
                <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="btn rounded-pill btn-primary btn-lg">
                    Get In Touch
                </a>
            </div> */}

            <div className="container-xxl col-12 d-flex justify-content-between flex-wrap">

                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M18.844 15.891c0.516 0.234 0.891 0.75 0.891 1.359v0.188l-0.75 5.297c-0.094 0.75-0.703 1.266-1.453 1.266h-6.797c-0.422 0-0.75-0.141-1.031-0.422l-4.969-4.969 0.797-0.797c0.188-0.188 0.469-0.328 0.797-0.328 0.094 0 0.141 0.047 0.234 0.047l3.422 0.703v-10.734c0-0.844 0.656-1.5 1.5-1.5s1.5 0.656 1.5 1.5v6h0.797c0.188 0 0.328 0.047 0.516 0.094zM9 11.25c-1.219-0.797-2.016-2.203-2.016-3.75 0-2.484 2.016-4.5 4.5-4.5s4.5 2.016 4.5 4.5c0 1.547-0.75 2.953-1.969 3.75v-3.75c0-1.359-1.172-2.484-2.531-2.484s-2.484 1.125-2.484 2.484v3.75z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                Web & Mobile Development
                            </h3>
                            <p>Everyone should have business goals for their website. At GRIT Hub, we don't build online brochures, <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="take your website to the next level">we deliver user centric, goal oriented, measurable</a> websites.</p>
                        </div>
                    </div>
                </div>


                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M17.016 18c1.078 0 1.969 0.938 1.969 2.016s-0.891 1.969-1.969 1.969-2.016-0.891-2.016-1.969 0.938-2.016 2.016-2.016zM0.984 2.016h3.281l0.938 1.969h14.813c0.563 0 0.984 0.469 0.984 1.031 0 0.188-0.047 0.328-0.141 0.469l-3.563 6.469c-0.328 0.609-0.984 1.031-1.734 1.031h-7.453l-0.891 1.641-0.047 0.141c0 0.141 0.094 0.234 0.234 0.234h11.578v2.016h-12c-1.078 0-1.969-0.938-1.969-2.016 0-0.328 0.094-0.656 0.234-0.938l1.359-2.484-3.609-7.594h-2.016v-1.969zM6.984 18c1.078 0 2.016 0.938 2.016 2.016s-0.938 1.969-2.016 1.969-1.969-0.891-1.969-1.969 0.891-2.016 1.969-2.016z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                E-Commerce Development
                            </h3>
                            <p><a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="build online ROI and cash flow">We can help you increase</a> your online sales conversion rate with a custom E-commerce website tailored specifically to your customers' wants and your ROI needs.</p>
                        </div>
                    </div>
                </div>


                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 28 28" width={100} height={100}>
                                    <path d="M28 11.094v12.406c0 1.375-1.125 2.5-2.5 2.5h-23c-1.375 0-2.5-1.125-2.5-2.5v-12.406c0.469 0.516 1 0.969 1.578 1.359 2.594 1.766 5.219 3.531 7.766 5.391 1.313 0.969 2.938 2.156 4.641 2.156h0.031c1.703 0 3.328-1.188 4.641-2.156 2.547-1.844 5.172-3.625 7.781-5.391 0.562-0.391 1.094-0.844 1.563-1.359zM28 6.5c0 1.75-1.297 3.328-2.672 4.281-2.438 1.687-4.891 3.375-7.313 5.078-1.016 0.703-2.734 2.141-4 2.141h-0.031c-1.266 0-2.984-1.437-4-2.141-2.422-1.703-4.875-3.391-7.297-5.078-1.109-0.75-2.688-2.516-2.688-3.938 0-1.531 0.828-2.844 2.5-2.844h23c1.359 0 2.5 1.125 2.5 2.5z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                Email Automation & Marketing
                            </h3>
                            <p>We'll help you turn your leads in to customers and your customers into brand devotees. <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="convert leads into customers">Let us show you</a> how.</p>
                        </div>
                    </div>
                </div>


                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 28" width={100} height={100}>
                                    <path d="M4 21c0-0.547-0.453-1-1-1s-1 0.453-1 1 0.453 1 1 1 1-0.453 1-1zM22 12c0-1.062-0.953-2-2-2h-5.5c0-1.828 1.5-3.156 1.5-5 0-1.828-0.359-3-2.5-3-1 1.016-0.484 3.406-2 5-0.438 0.453-0.812 0.938-1.203 1.422-0.703 0.906-2.562 3.578-3.797 3.578h-0.5v10h0.5c0.875 0 2.312 0.562 3.156 0.859 1.719 0.594 3.5 1.141 5.344 1.141h1.891c1.766 0 3-0.703 3-2.609 0-0.297-0.031-0.594-0.078-0.875 0.656-0.359 1.016-1.25 1.016-1.969 0-0.375-0.094-0.75-0.281-1.078 0.531-0.5 0.828-1.125 0.828-1.859 0-0.5-0.219-1.234-0.547-1.609 0.734-0.016 1.172-1.422 1.172-2zM24 11.984c0 0.906-0.266 1.797-0.766 2.547 0.094 0.344 0.141 0.719 0.141 1.078 0 0.781-0.203 1.563-0.594 2.25 0.031 0.219 0.047 0.453 0.047 0.672 0 1-0.328 2-0.938 2.781 0.031 2.953-1.984 4.688-4.875 4.688h-2.016c-2.219 0-4.281-0.656-6.344-1.375-0.453-0.156-1.719-0.625-2.156-0.625h-4.5c-1.109 0-2-0.891-2-2v-10c0-1.109 0.891-2 2-2h4.281c0.609-0.406 1.672-1.813 2.141-2.422 0.531-0.688 1.078-1.359 1.672-2 0.938-1 0.438-3.469 2-5 0.375-0.359 0.875-0.578 1.406-0.578 1.625 0 3.187 0.578 3.953 2.094 0.484 0.953 0.547 1.859 0.547 2.906 0 1.094-0.281 2.031-0.75 3h2.75c2.156 0 4 1.828 4 3.984z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                Social Media Marketing
                            </h3>
                            <p>Leveraging the power of social media marketing &amp; engagement can <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="reach billions of new customers">dramatically grow your audience</a> and customer base in ways you never thought how.</p>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M11.719 18.984c2.672 0 4.781-2.109 4.781-4.781 0-1.406-0.188-2.719-0.563-4.031-1.031 1.359-2.859 2.203-4.641 2.578s-2.813 1.453-2.813 3.094c0 1.734 1.453 3.141 3.234 3.141zM13.5 0.656c3.891 3.141 6.516 7.969 6.516 13.359 0 4.406-3.609 7.969-8.016 7.969s-8.016-3.563-8.016-7.969c0-3.375 1.219-6.516 3.234-8.906v0.375c0 2.063 1.547 3.703 3.609 3.703s3.422-1.641 3.422-3.703c0-2.156-0.75-4.828-0.75-4.828z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                Digital Business Consulting
                            </h3>
                            <p>Who is your perfect online client? What is your top key success metric for your online business? If you struggle answering these questions <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="define your perfect customer">let us help you transform your organization</a> in to what it was meant to be.</p>
                        </div>
                    </div>
                </div>


                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M12 18.984c0.563 0 0.984-0.422 0.984-0.984s-0.422-0.984-0.984-0.984-0.984 0.422-0.984 0.984 0.422 0.984 0.984 0.984zM3.984 5.016v10.969h16.031v-10.969h-16.031zM20.016 18h3.984c0 1.078-0.938 2.016-2.016 2.016h-19.969c-1.078 0-2.016-0.938-2.016-2.016h3.984c-1.078 0-1.969-0.938-1.969-2.016v-10.969c0-1.078 0.891-2.016 1.969-2.016h16.031c1.078 0 1.969 0.938 1.969 2.016v10.969c0 1.078-0.891 2.016-1.969 2.016z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                QA Testing
                            </h3>
                            <p>Who is your perfect online client? What is your top key success metric for your online business? If you struggle answering these questions <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="define your perfect customer">let us help you transform your organization</a> in to what it was meant to be.</p>
                        </div>
                    </div>
                </div>


                {/* <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M20 6h-5.6l3.3-3.3c0.4-0.4 0.4-1 0-1.4s-1-0.4-1.4 0l-4.3 4.3-4.3-4.3c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4l3.3 3.3h-5.6c-1.7 0-3 1.3-3 3v11c0 1.7 1.3 3 3 3h16c1.7 0 3-1.3 3-3v-11c0-1.7-1.3-3-3-3zM21 20c0 0.6-0.4 1-1 1h-16c-0.6 0-1-0.4-1-1v-11c0-0.6 0.4-1 1-1h16c0.6 0 1 0.4 1 1v11z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                OTT App Development
                            </h3>
                            <p>Internet TV is here to stay.  With open source streaming players like <a rel="noreferrer"  href="https://blog.roku.com/blog/2014/09/16/10-million-roku-players-sold/" target="_blank">Roku</a>, AppleTV and Amazon Fire in over 70 Million homes across the US, it's time for your online video content to break free of your website and <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="get your organization on TV">reach more customers</a>.</p>
                        </div>
                    </div>
                </div> */}


                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                    <path d="M23.9 5.6c-0.1-0.2-0.3-0.4-0.5-0.5-0.1-0.1-0.3-0.1-0.4-0.1h-6c-0.6 0-1 0.4-1 1s0.4 1 1 1h3.6l-7.1 7.1-4.3-4.3c-0.4-0.4-1-0.4-1.4 0l-7.5 7.5c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.4 0.3 0.7 0.3s0.5-0.1 0.7-0.3l6.8-6.8 4.3 4.3c0.4 0.4 1 0.4 1.4 0l7.8-7.8v3.6c0 0.6 0.4 1 1 1s1-0.4 1-1v-6c0-0.1 0-0.3-0.1-0.4z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                SEO Optimization
                            </h3>
                            <p>No matter what business you're in, SEO is a must-have as a part of your online marketing strategy.  <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="increase your page rank">We can help you</a> track, test and tweak your website to page #1.</p>
                        </div>
                    </div>
                </div>


                

                <div className="col-xl-3 col-md-6 col-12 p-3">
                    <div className="card shadow-sm position-relative h-100">
                        <div className="card-body d-flex flex-column justify-content-between text-center">
                            <p className="text-center">
                                <svg  viewBox="0 0 24 24" width={100} height={100}>
                                <path d="M18 3.984h3v8.016h-8.016v9c0 0.563-0.422 0.984-0.984 0.984h-2.016c-0.563 0-0.984-0.422-0.984-0.984v-11.016h9.984v-3.984h-0.984v0.984c0 0.563-0.422 1.031-0.984 1.031h-12c-0.563 0-1.031-0.469-1.031-1.031v-3.984c0-0.563 0.469-0.984 1.031-0.984h12c0.563 0 0.984 0.422 0.984 0.984v0.984z"></path>
                                </svg>
                            </p>

                            <h3 className="card-title fs-4 fw-bold">
                                Brand Development
                            </h3>
                            <p>Have you thought about your business brand? Do you have a brand strategy? Brand equity? Do you even have a brand? <a href="https://grithub-za-1.hubspotpagebuilder.com/contact-us" className="cta-modal" title="create brand equity">We can help you develop your brand</a> to give your organization the edge it needs.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center col-md-9 col-12 p-md-5 p-3">
                <p className="fs-4">We offer customized business solutions with long term strategic partnerships. Our bread and butter is that organization looking to expand it's online customer engagement, increase ROI on it's products and services through technology, multi-device web, and social media.</p>
                <Link href="/contact" className="btn rounded-pill btn-primary btn-lg">
                    Get In Touch
                </Link>
            </div>
        </section>
    )
}

export default Consulting;