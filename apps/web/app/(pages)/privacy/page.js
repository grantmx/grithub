import Link from "next/link";

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
                    <h1 className="display-1 fw-bold">Privacy Policy</h1>
                    <h2 className="lead">By visiting this site you agree to the terms of this agreement. </h2>
                    <br/>
                    <h3>DATA CONTROLLER</h3>
                    <p>For the purposes of the Data Protection Act 1998, Garden Route Innovation & Technology Hub, NPC is the Data Controller (as defined in that Act) and responsible for the operation of this website and for processing any personal data collected via this website. If you have any questions about this privacy policy please let us know.</p>
                    <h3>INFORMATION COLLECTED </h3>
                    <p>Garden Route Innovation & Technology Hub, NPC collects information relating to visitors to our website: for example, IP address and information regarding what pages are accessed and when. We also collect information volunteered by you if you purchase products, whether online  and other information necessary for administering this business, email address and your preferred means of communication. </p>
                    <h3>OUR USE OF PERSONAL INFORMATION </h3>
                    <ol>
                        <li>Garden Route Innovation & Technology Hub, NPC is committed to protecting the personal data of its supporters and members.</li>
                        <li>Garden Route Innovation & Technology Hub, NPC may use information we collect about your visit to our website to help us understand more about how our site is used, with the purpose of continual improvement of the site as a communication medium.</li>
                        <li>From time to time we may want to use the information you provide to us to contact you for direct marketing purposes. However, Garden Route Innovation & Technology Hub, NPC will not contact you nor disclose any of your personally identifiable information to third parties, and therefore whenever you supply information to us, either in the course of making an online donation or otherwise, you are given the opportunity to opt out of being contacted by us or us disclosing your information to organisations with similar objectives, either of the above types of contact, using the tickboxes provided.</li>
                        <li>If at any time you are mailed or emailed with information and you do not want to continue receiving it, please follow the instructions provided in the communication, which will tell you how to unsubscribe from receiving further updates.</li>
                    </ol>

                    <h3>Adherence to the POPI Act:</h3>
                    <p>Personal information means information relating to an identifiable, living, natural person, and where it is applicable, an identifiable, existing juristic person, including, but not limited to:</p>

                    <ul>
                        <li>information relating to the race, gender, sex, pregnancy, marital status, national, ethnic or social origin, colour, sexual orientation, age, physical or mental health, well-being, disability, religion, conscience, belief, culture, language and birth of the person;</li>
                        <li>information relating to the education or the medical, financial, criminal or employment history of the person;</li>
                        <li>any identifying number, symbol, e-mail address, physical address, telephone number, location information, online identifier or other particular assignment to the person;</li>
                        <li>the biometric information of the person;</li>
                        <li>the personal opinions, views or preferences of the person;</li>
                        <li>correspondence sent by the person that is implicitly or explicitly of a private or confidential nature or further correspondence that would reveal the contents of the original correspondence;</li>
                        <li>the views or opinions of another individual about the person; and</li>
                        <li>the name of the person if it appears with other personal information relating to the person or if the disclosure of the name itself would reveal information about the person;”</li>
                    </ul>

                    <p>Please review our <Link href="/terms">Terms</Link>, which also governs your terms of service, the proper usage of this site, and the information you provide.</p>

                    <h3>Online Registration and Application Submissions</h3>
                    <p>Registration and/or use of the this site constitutes acceptance of this agreement by you, and shall accordingly apply as between the company and yourself.</p>
                    <p>Registration on our Website is free and does not oblige you to purchase anything.</p>
                    <p>Upon registration you will be required to choose a user name and a password. Please keep your password secret. The Company accepts no liability for any damages suffered or losses incurred as a result of the misuse or loss of your password. In this regard you represent and warrant that your user name and password shall:</p>

                    <ul>
                        <li>Be used for personal use only and;</li>
                        <li>Will not be disclosed to any third party.</li>
                    </ul>

                    <p>Upon acceptance of your registration, a registration confirmation email will automatically be sent to the email address you provided us with when registering. Transmission times depend on your Internet Service Provider, but it typically takes less than 10 (ten) minutes to receive the confirmation email. If you do not receive the confirmation email please contact us as soon as possible.</p>
                    <p>You will be required to login with your username and password each time you want to access your account. You can access your account by clicking on “Sign in” on the top right of any page on our website.</p>

                    <h3>ONLINE PAYMENTS </h3>
                    <p>When you are using our secure online store the information you give, such as your credit card number and contact information is provided so that the transaction can take place. Your credit card information is secured through our trusted third-party PCI compliant card processing vendors. </p>
                    <h3>ACCESS AND AMENDING THE INFORMATION WE HOLD </h3>
                    <p>The accuracy of your individual identifying information is important to Garden Route Innovation & Technology Hub, NPC. If you wish to know what information we hold about you, or if you change email address, or if any of the other information we hold is inaccurate or out of date, let us know.</p>
                    <h3>SECURITY</h3>
                    
                    <p>When you give Garden Route Innovation & Technology Hub, NPC personal information we take steps to ensure that your information is treated securely. When you are on a secure page, delivered to you by ourselves, a lock icon will appear on web browsers, indicating that the information is being transmitted in a secure, encrypted form, and held on servers protected by appropriate levels of security. </p>
                    <p>Non-sensitive communication will be transmitted normally over the Internet, and this can never be guaranteed to be 100% secure. As a result, while we strive to protect your personal information, Garden Route Innovation & Technology Hub, NPC cannot ensure or warrant the security of any information you transmit to us, and you do so at your own risk. </p>
                    <p>Once we receive your transmission, we will use all reasonable efforts to ensure its security on our systems. For the transmission and processing of sensitive information, for example details associated with online donations, we operate in partnership with trusted third-party PCI compliant card processing vendors, who employ the highly secure encryption technology to ensure the security of the information.</p>
                    <h3>OTHER MATTERS </h3>
                    <ol>
                        <li>Garden Route Innovation & Technology Hub, NPC will retain information that you provide to us only for as long as it is likely to be relevant to our business purposes.</li>
                        <li>Our company reserves the right to change or modify these terms with no prior notice.</li>
                    </ol>   
                </article>             
            </section>
    )
}


export default PrivacyPolicy