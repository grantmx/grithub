import Style from "./Privacy.module.scss"

export const metadata = {
    title: "Privacy Policy",
    description: "Read GRIT Hub's Privacy Policy to understand how we collect, use, and protect your personal information when you visit our website and engage with our services.",
    openGraph:{
        title: "Privacy Policy",
        description: "Read GRIT Hub's Privacy Policy to understand how we collect, use, and protect your personal information when you visit our website and engage with our services.",
        url: "https://grithub.co.za/privacy",
        siteName: "GRIT Hub",
    },
    alternates: {
        canonical: "https://grithub.co.za/privacy"
    }
}


async function PrivacyPolicy(){
    return(
            <section className="container-fluid d-flex justify-content-center align-items-center py-5 flex-column" id="programs-workshops">
                <article className="col-12 col-md-8">
                    
                    <h1 className="display-1">Privacy Policy</h1>
                    
                    <p className="lead">This Privacy Policy explains how the Garden Route Innovation & Technology Hub NPC (“GRIT Hub”, “we”, “our”, or “us”) collects, uses, processes, and protects personal information obtained through our website, programmes, services, events, and related activities. By accessing our website or participating in any of our programmes or services, you agree to the terms of this Privacy Policy.</p>

                    <h2 className="display-5 mt-5" id="responsible-party">
                        <a href="#responsible-party" className={Style.headerAnchor}>1. Responsible Party</a>
                    </h2>
                    <p>For the purposes of the Protection of Personal Information Act (POPIA), GRIT Hub is the Responsible Party and is accountable for the collection, processing, and safeguarding of personal information. We determine the purpose and means of processing personal data and are committed to handling such information lawfully, transparently, and securely.</p>

                    <h2 className="display-5 mt-5" id="information-we-collect">
                        <a href="#information-we-collect" className={Style.headerAnchor}>2. Information We Collect</a>
                    </h2>
                    <p>GRIT Hub may collect personal information directly from you or through your interaction with our services. This may include, but is not limited to, your name, contact details, identification number, educational background, employment history, and communication preferences. We may also collect programme-related information such as attendance records, assessment results, and portfolio submissions. In addition, we collect technical information such as IP addresses, browser type, and website usage data to help improve our digital platforms.</p>

                    <h2 className="display-5 mt-5" id="use-of-personal-information">
                        <a href="#use-of-personal-information" className={Style.headerAnchor}>3. Use of Personal Information</a>
                    </h2>
                    <p>Personal information is collected and used to support GRIT Hub's operations and mission. This includes administering training programmes, processing applications, conducting assessments, facilitating certification processes, and providing ongoing learner and participant support. Information may also be used to communicate with you regarding programme updates, opportunities, and relevant initiatives through email, phone, or messaging platforms such as WhatsApp.</p>
                    <p>We may also use personal information for internal reporting, monitoring, evaluation, and impact measurement, particularly where programmes are funded or supported by external partners. In certain cases, anonymised or aggregated data may be used for research, reporting, or promotional purposes.</p>

                    <h2 className="display-5 mt-5" id="sharing-of-personal-information">
                        <a href="#sharing-of-personal-information" className={Style.headerAnchor}>4. Sharing of Personal Information</a>
                    </h2>
                    <p>GRIT Hub may share personal information with trusted third parties where necessary to deliver programmes and meet compliance obligations. This may include accreditation bodies, training authorities, funding partners, educational institutions, and service providers. Personal information is only shared to the extent required and in accordance with applicable laws.</p>
                    <p>GRIT Hub does not sell personal information. Any sharing of data is done responsibly and with appropriate safeguards in place.</p>

                    <h2 className="display-5 mt-5" id="communication-and-messaging-platforms">
                        <a href="#communication-and-messaging-platforms" className={Style.headerAnchor}>5. Communication & Messaging Platforms</a>
                    </h2>
                    <p>GRIT Hub uses a range of communication channels, including email, phone, and third-party messaging platforms such as WhatsApp, to coordinate programmes and engage with participants. By participating in our programmes, you consent to being contacted through these channels. While we take reasonable steps to protect your information, communications conducted via third-party platforms are subject to their own privacy and security practices, which are outside of GRIT Hub’s control.</p>

                    <h2 className="display-5 mt-5" id="cookies-and-website-usage">
                        <a href="#cookies-and-website-usage" className={Style.headerAnchor}>6. Cookies & Website Usage</a>
                    </h2>
                    <p>Our website may use cookies and similar technologies to enhance user experience, analyse site usage, and improve performance. This includes the collection of information such as IP address, pages visited, and time spent on the site. You may adjust your browser settings to refuse cookies; however, this may affect the functionality of certain features of the website.</p>

                    <h2 className="display-5 mt-5" id="online-payments-and-donations">
                        <a href="#online-payments-and-donations" className={Style.headerAnchor}>7. Online Payments & Donations</a>
                    </h2>
                    <p>Where payments or donations are made through our website, relevant personal and transaction information is collected to process the transaction. Payment details, including credit card information, are handled securely through trusted third-party PCI-compliant payment processors.</p>
                    <p>As a registered Public Benefit Organisation, GRIT Hub may collect donor information for the purposes of processing donations, issuing receipts, and reporting on the use of funds. Donor information is handled with care and is not used for unrelated marketing purposes without consent.</p>

                    <h2 className="display-5 mt-5" id="data-retention">
                        <a href="#data-retention" className={Style.headerAnchor}>8. Data Retention</a>
                    </h2>
                    <p>GRIT Hub retains personal information only for as long as necessary to fulfil the purposes for which it was collected. This includes retaining certain records for compliance with legal, regulatory, and accreditation requirements. Programme-related records, including assessment and certification data, may be retained for extended periods as required by applicable standards.</p>

                    <h2 className="display-5 mt-5" id="your-rights">
                        <a href="#your-rights" className={Style.headerAnchor}>9. Your Rights</a>
                    </h2>
                    <p>In accordance with the Protection of Personal Information Act, you have the right to request access to the personal information we hold about you, request corrections to inaccurate or incomplete information, and request deletion where appropriate. Requests can be made using the contact details provided below.</p>

                    <h2 className="display-5 mt-5" id="security">
                        <a href="#security" className={Style.headerAnchor}>10. Security</a>
                    </h2>
                    <p>GRIT Hub takes reasonable technical and organisational measures to protect personal information against loss, misuse, unauthorised access, or disclosure. While we strive to safeguard all information, no method of transmission over the internet or electronic storage is completely secure, and users provide information at their own risk.</p>

                    <h2 className="display-5 mt-5" id="third-party-websites-and-services">
                        <a href="#third-party-websites-and-services" className={Style.headerAnchor}>11. Third-Party Websites & Services</a>
                    </h2>
                    <p>Our website and programmes may include links to third-party websites or services. GRIT Hub is not responsible for the privacy practices or content of such external platforms. Users are encouraged to review the privacy policies of any third-party services they engage with.</p>

                    <h2 className="display-5 mt-5" id="updates-to-this-policy">
                        <a href="#updates-to-this-policy" className={Style.headerAnchor}>12. Updates to This Policy</a>
                    </h2>
                    <p>GRIT Hub reserves the right to update or modify this Privacy Policy from time to time. Any changes will be effective upon posting on our website. Continued use of our services constitutes acceptance of the updated policy.</p>

                    <h2 className="display-5 mt-5" id="contact-information">
                        <a href="#contact-information" className={Style.headerAnchor}>13. Contact Information</a>
                    </h2>
                    <ul>
                        <li>CIPC Registration Number is: 2021/502703/08</li>
                        <li>Tax Exempt Reference Number is: 930089024</li>
                        <li>Skills Development Provider Number is: SDP180326090759</li>
                        <li>Registered Address is: Office Suite #2 & #4, York Street Boulevard Shopping Center, George 6529</li>
                        <li>Website is: <a href="https://grithub.org.za">https://grithub.org.za</a></li>
                        <li>Email is: <a href="mailto:workforce@grithub.org.za">workforce@grithub.org.za</a></li>
                    </ul>

                </article>             
            </section>
    )
}


export default PrivacyPolicy