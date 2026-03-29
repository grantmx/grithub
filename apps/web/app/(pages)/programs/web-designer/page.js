
export const metadata = {
    openGraph:{
        title: "Web Designer",
        description: "This class that will take you from a beginner to a professional web designer.",
    },
    title: "Web Designer",
    description: "This class that will take you from a beginner to a professional web designer.",
    alternates: {
        canonical: "https://grithub.co.za/programs/web-designer"
    }
}



export default function FrontendCodingMasterclass() {
  return (
    <section className="container-xxl d-flex flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-1">Web Designer</h1>
        <p className="lead text-muted fs-3">
          This class that will take you from a beginner to a professional web
          designer.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            You will learn HTML, CSS, JavaScript, and an introduction to using
            AI to help you code. This class is for those who want to learn to
            code and build websites and web applications.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            {/* <li><strong>Duration:</strong> 6 weeks (12 sessions)</li> */}
            {/* <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li> */}
            <li>
              <strong>Price:</strong> R 11,549 per course
            </li>
            <li>
              <strong>Format:</strong> In-person (George) or online via Zoom
            </li>
            <li>
              <strong>Includes:</strong> Certificate of completion, course
              materials, and lifetime access to resources
            </li>
          </ul>

          <h3 className="mt-4">Requirements</h3>
          <p>
            All students will need to bring their own laptop computer. Mac or PC
            with enough space to run and install software.
          </p>

          {/* Complete Syllabus Section */}
          <h2 className="mt-5">Course Syllabus</h2>

         
            {/* Week 1 */}
              <h3 className="fs-4">
                  Week 1: HTML Fundamentals & Web Structure
              </h3>
              
                  <ul>
                    <li>How the internet and web browsers work</li>
                    <li>Understanding HTML syntax and structure</li>
                    <li>Working with headings, paragraphs, and lists</li>
                    <li>Adding images and links</li>
                    <li>Creating forms and input elements</li>
                    <li>Semantic HTML for accessibility</li>
                    <li>
                      <strong>Project:</strong> Create your first personal
                      webpage
                    </li>
                  </ul>
                

            {/* Week 2 */}
              <h3 className="fs-4">
                  Week 2: CSS Styling & Layout
              </h3>
              
                  <ul>
                    <li>CSS syntax and selectors</li>
                    <li>Colors, typography, and backgrounds</li>
                    <li>The box model (margin, padding, border)</li>
                    <li>Flexbox for flexible layouts</li>
                    <li>CSS Grid for complex layouts</li>
                    <li>Responsive design with media queries</li>
                    <li>
                      <strong>Project:</strong> Style your personal webpage
                    </li>
                  </ul>
                

            {/* Week 3 */}
              <h3 className="fs-4">
               
                  Week 3: JavaScript Fundamentals
              </h3>
              
                  <ul>
                    <li>Variables, data types, and operators</li>
                    <li>Functions and scope</li>
                    <li>Conditional statements (if/else, switch)</li>
                    <li>Loops (for, while, forEach)</li>
                    <li>Arrays and objects</li>
                    <li>
                      ES6+ features (arrow functions, destructuring, spread
                      operator)
                    </li>
                    <li>
                      <strong>Project:</strong> Build an interactive calculator
                    </li>
                  </ul>
               

            {/* Week 4 */}
              <h3 className="fs-4">
                
                  Week 4: DOM Manipulation & Events
              </h3>
             
                  <ul>
                    <li>Understanding the Document Object Model (DOM)</li>
                    <li>Selecting and modifying HTML elements</li>
                    <li>Event listeners (click, submit, keypress)</li>
                    <li>Creating dynamic content</li>
                    <li>Form validation</li>
                    <li>Local storage and session storage</li>
                    <li>
                      <strong>Project:</strong> Create a to-do list application
                    </li>
                  </ul>
                

            {/* Week 5 */}
              <h3 className="fs-4">
                  Week 5: Introduction to React.js
              </h3>

              
                  <ul>
                    <li>What is React and why use it?</li>
                    <li>Setting up a React project</li>
                    <li>Components and props</li>
                    <li>State management with useState</li>
                    <li>Handling events in React</li>
                    <li>Conditional rendering</li>
                    <li>Lists and keys</li>
                    <li>
                      <strong>Project:</strong> Build a simple React component
                      library
                    </li>
                  </ul>
                

            {/* Week 6 */}
            <h3 className="fs-4">Week 6: Advanced React & AI Tools</h3>

            <ul>
              <li>React Router for navigation</li>
              <li>Fetching data from APIs</li>
              <li>useEffect for side effects</li>
              <li>Introduction to Next.js framework</li>
              <li>Using AI tools (GitHub Copilot, ChatGPT) for coding</li>
              <li>Debugging and testing techniques</li>
              <li>Deploying to production (Vercel/Netlify)</li>
              <li>
                <strong>Final Project:</strong> Build and deploy a complete web
                application
              </li>
            </ul>
          


          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>Build responsive, professional websites from scratch</li>
            <li>Create interactive web applications with JavaScript</li>
            <li>Develop React components and applications</li>
            <li>Use AI tools to accelerate your coding workflow</li>
            <li>Deploy your projects to the web</li>
            <li>Earn a certificate of completion</li>
            <li>Add real projects to your portfolio</li>
          </ul>

          <div className="alert alert-success mt-4">
            <strong>🎓 Career Opportunities:</strong> After completing this
            course, you'll be prepared for entry-level frontend developer
            positions, freelance work, or continue with advanced courses in
            React and Next.js.
          </div>

          <div className="alert alert-info mt-4">
            <strong>Next Session:</strong> Starting May 2026. Limited seats
            available!
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="text-muted">Limited seats available</p>
            <p className="display-6 fw-bold text-danger">R11,549</p>
            <p className="small">
              Includes all course materials and certificate
            </p>
            <a
              href="/contact"
              className="btn rounded-pill btn-danger btn-lg w-100"
            >
              Register Now →
            </a>
            <hr />
            <p className="small text-muted mt-3">
              <strong>Payment options:</strong>
              <br />
              • Full payment
              <br />
              • 2-month installment plan
              <br />• Contact us for financing options
            </p>
            <p className="small text-muted text-center">
              All sales are final. Refunds only for life events as credit.
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
