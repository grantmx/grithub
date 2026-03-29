
export const metadata = {
    openGraph:{
        title: "Website (HTML) Programmer",
        description: "This class that will take you from a beginner to a professional web developer.",
    },
    title: "Website (HTML) Programmer",
    description: "This class that will take you from a beginner to a professional web developer.",
    alternates: {
        canonical: "https://grithub.co.za/programs/websites-for-beginners"
    }
}


export default function WebsitesForBeginners() {
  return (
    <section className="container-xxl d-flex flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-1">
          Website (HTML) Programmer
        </h1>
        <p className="lead text-muted fs-3">
          NO CODING EXPERIENCE REQUIRED. By the end of this course, you will have designed and built your own multi-page website.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            This course is designed for absolute beginners with no prior coding experience. You will learn how the world wide web works, understand the internet basics, and build your own multi-page website from scratch. You'll also learn how to select a hosting service and publish your hand-made website for the world to see.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            {/* <li><strong>Duration:</strong> 4 weeks (8 sessions)</li> */}
            {/* <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li> */}
            <li><strong>Price:</strong> R 11,549 per course</li>
            <li><strong>Format:</strong> In-person (George) or online via Zoom</li>
            <li><strong>Includes:</strong> Certificate of completion, website hosting for 1 year, course materials</li>
          </ul>

          <h3 className="mt-4">Requirements</h3>
          <p>
            No coding experience required! Just bring your own laptop (Mac or PC). 
          </p>

          <h2 className="mt-5 fs-2">Course Syllabus</h2>
          
         
            {/* Week 1 */}
              <h3 className="fs-4">
                  Week 1: Understanding the Web
              </h3>
              
                  <ul>
                    <li>How the internet works</li>
                    <li>Web browsers and servers explained</li>
                    <li>Domain names and hosting basics</li>
                    <li>Introduction to HTML</li>
                    <li>Creating your first webpage</li>
                    <li><strong>Project:</strong> Create a simple "About Me" page</li>
                  </ul>
               

            {/* Week 2 */}
              <h3 className="fs-4">
                  Week 2: Building Web Pages
              </h3>
             
                  <ul>
                    <li>HTML structure and syntax</li>
                    <li>Headings, paragraphs, and lists</li>
                    <li>Adding images and links</li>
                    <li>Creating navigation menus</li>
                    <li>Multi-page websites</li>
                    <li><strong>Project:</strong> Build a 3-page personal website</li>
                  </ul>
                

            {/* Week 3 */}
              <h3 className="fs-4">
                  Week 3: Making It Beautiful with CSS
              </h3>
              
                  <ul>
                    <li>Introduction to CSS</li>
                    <li>Colors, fonts, and spacing</li>
                    <li>Styling backgrounds and borders</li>
                    <li>Creating responsive layouts</li>
                    <li>Making websites mobile-friendly</li>
                    <li><strong>Project:</strong> Style your personal website</li>
                  </ul>
               

            {/* Week 4 */}
              <h3 className="fs-4">
                  Week 4: Publishing Your Website
              </h3>
              
                  <ul>
                    <li>Choosing a hosting provider</li>
                    <li>Purchasing a domain name</li>
                    <li>Uploading files via FTP</li>
                    <li>Using website builders vs custom code</li>
                    <li>Introduction to SEO basics</li>
                    <li><strong>Final Project:</strong> Publish your live website to the internet</li>
                  </ul>
                


      

          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>Understand how websites and the internet work</li>
            <li>Build a complete multi-page website from scratch</li>
            <li>Style websites with CSS</li>
            <li>Make websites responsive for mobile devices</li>
            <li>Publish your website live on the internet</li>
            <li>Earn a certificate of completion</li>
          </ul>

          <div className="alert alert-success mt-4">
            <strong>🎓 Perfect For:</strong> Complete beginners, small business owners, entrepreneurs, and anyone who wants to create their own website.
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="text-muted">No experience needed!</p>
            <p className="display-6 fw-bold text-danger"> R 11,549</p>
            <p className="small">Includes 1 year of free hosting</p>
            <a href="/contact" className="btn rounded-pill btn-danger btn-lg w-100">
              Register Now →
            </a>
            <hr />
            <p className="small text-muted mt-3">
              <strong>What's included:</strong><br />
              {/* • 4 weeks of instruction<br /> */}
              • 1 year free website hosting<br />
              • Course materials<br />
              • Certificate of completion
            </p>
          </div>

          <div className="card shadow-sm p-4 mt-4">
            <h4>Course Includes</h4>
            <ul className="list-unstyled">
              {/* <li>✓ 6 weeks of live instruction</li> */}
              <li>✓ Course materials and resources</li>
              <li>✓ Recorded sessions (for review)</li>
              <li>✓ 1-on-1 mentorship</li>
              <li>✓ Final project review</li>
              <li>✓ Certificate of completion</li>
              <li>✓ Lifetime access to resources</li>
            </ul>
          </div>


        </div>


      </div>
    </section>
  );
}