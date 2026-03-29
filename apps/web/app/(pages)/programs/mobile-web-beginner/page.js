export default function MobileWebBeginner() {
  return (
    <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-2 fw-bold">
          Mobile Web (Beginner)
        </h1>
        <p className="lead text-muted fs-3">
          Learn how to make websites mobile-friendly and responsive for smartphones and tablets.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            NO CODING EXPERIENCE REQUIRED. Apply the concept of mobile friendliness to a website; learn ways to modify an existing website into a mobile optimized one. You will also learn responsive design and designing for a mobile user experience.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            <li><strong>Duration:</strong> 4 weeks (8 sessions)</li>
            <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li>
            <li><strong>Price:</strong> R2,999 per course</li>
            <li><strong>Format:</strong> In-person (George) or online via Zoom</li>
            <li><strong>Includes:</strong> Certificate of completion, course materials</li>
          </ul>

          <h3 className="mt-4">Requirements</h3>
          <p>
            Basic computer skills recommended. No coding experience required. Bring your own laptop (Mac or PC).
          </p>

          <h2 className="mt-5">Course Syllabus</h2>
          
          <div className="accordion mt-3" id="syllabusAccordion">
            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#week1">
                  Week 1: Understanding Mobile Web
                </button>
              </h3>
              <div id="week1" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <ul>
                    <li>Mobile vs desktop browsing habits</li>
                    <li>Mobile-first design principles</li>
                    <li>Viewport meta tag explained</li>
                    <li>Analyzing existing websites on mobile</li>
                    <li>Touch vs click interactions</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week2">
                  Week 2: Responsive Design Basics
                </button>
              </h3>
              <div id="week2" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Introduction to CSS media queries</li>
                    <li>Fluid grids and flexible images</li>
                    <li>Breakpoints and device sizes</li>
                    <li>Making navigation mobile-friendly</li>
                    <li><strong>Project:</strong> Make an existing website responsive</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week3">
                  Week 3: Mobile User Experience
                </button>
              </h3>
              <div id="week3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Designing for touch screens</li>
                    <li>Mobile typography and readability</li>
                    <li>Forms and input optimization</li>
                    <li>Mobile performance optimization</li>
                    <li><strong>Project:</strong> Redesign a form for mobile</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week4">
                  Week 4: Testing & Deployment
                </button>
              </h3>
              <div id="week4" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Testing across devices and browsers</li>
                    <li>Using browser developer tools</li>
                    <li>Mobile emulators and real device testing</li>
                    <li>Best practices for mobile SEO</li>
                    <li><strong>Final Project:</strong> Convert a desktop site to mobile-friendly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>Understand mobile-first design principles</li>
            <li>Make any website responsive for all devices</li>
            <li>Optimize websites for mobile user experience</li>
            <li>Test websites across multiple devices</li>
            <li>Improve mobile website performance</li>
          </ul>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="display-6 fw-bold text-danger">R2,999</p>
            <a href="/contact" className="btn rounded-pill btn-danger btn-lg w-100">
              Register Now →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}