export const metadata = {
    openGraph:{
        title: "Next.js (Advanced)",
        description: "This class that will take you from a beginner to a professional Next.js developer.",
    },
    title: "Next.js (Advanced)",
    description: "This class that will take you from a beginner to a professional Next.js developer.",
    alternates: {
        canonical: "https://grithub.co.za/programs/nextjs-advanced"
    }
}



export default function NextJsAdvanced() {
  return (
    <section className="container-xxl d-flex flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-1">
          Next.js (Advanced)
        </h1>
        <p className="lead text-muted fs-3">
          Next.js is a React framework used in tens of thousands of production-facing websites and web applications, including many of the world's largest brands.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            Learn about page-based routing, SSR and ISR pre-rendering, code splitting, API routes, and modern Next.js best practices. This course will prepare you to build production-ready full-stack applications using the most popular React framework.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            <li><strong>Duration:</strong> 8 weeks (16 sessions)</li>
            <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li>
            <li><strong>Price:</strong> R4,999 per course</li>
            <li><strong>Format:</strong> In-person (George) or online via Zoom</li>
            <li><strong>Prerequisite:</strong> Strong React knowledge required</li>
          </ul>

          <h2 className="mt-5">Course Syllabus</h2>
          
          <div className="accordion mt-3" id="syllabusAccordion">
            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#week1">
                  Week 1-2: Next.js Fundamentals
                </button>
              </h3>
              <div id="week1" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <ul>
                    <li>Why Next.js? Framework vs Library</li>
                    <li>Creating a Next.js app</li>
                    <li>File-based routing (App Router vs Pages Router)</li>
                    <li>Pages and layouts</li>
                    <li>Linking between pages</li>
                    <li>Image optimization with next/image</li>
                    <li><strong>Project:</strong> Create a multi-page marketing site</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week3">
                  Week 3-4: Rendering Strategies
                </button>
              </h3>
              <div id="week3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Static Site Generation (SSG)</li>
                    <li>Server-Side Rendering (SSR)</li>
                    <li>Incremental Static Regeneration (ISR)</li>
                    <li>Client-side rendering</li>
                    <li>When to use each strategy</li>
                    <li><strong>Project:</strong> Build a blog with ISR</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week5">
                  Week 5-6: Data Fetching & API Routes
                </button>
              </h3>
              <div id="week5" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Server Components vs Client Components</li>
                    <li>Data fetching in Server Components</li>
                    <li>API routes and route handlers</li>
                    <li>Middleware and rewrites</li>
                    <li>Environment variables</li>
                    <li><strong>Project:</strong> Build a full-stack application with database</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week7">
                  Week 7-8: Advanced Features & Deployment
                </button>
              </h3>
              <div id="week7" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Metadata and SEO optimization</li>
                    <li>Authentication (NextAuth.js)</li>
                    <li>Internationalization (i18n)</li>
                    <li>Performance optimization</li>
                    <li>Deployment to Vercel</li>
                    <li>Monitoring and analytics</li>
                    <li><strong>Final Project:</strong> Build and deploy a complete Next.js application</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>Master Next.js App Router architecture</li>
            <li>Build full-stack applications with API routes</li>
            <li>Optimize performance with appropriate rendering strategies</li>
            <li>Implement authentication and SEO</li>
            <li>Deploy production-ready Next.js applications</li>
          </ul>

          <div className="alert alert-success mt-4">
            <strong>🎓 Career Impact:</strong> Next.js developers are in high demand globally. This course will prepare you for senior frontend and full-stack roles.
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="display-6 fw-bold text-danger">R4,999</p>
            <a href="/contact" className="btn rounded-pill btn-danger btn-lg w-100">
              Register Now →
            </a>
            <hr />
            <p className="small text-muted mt-3">
              <strong>Includes:</strong><br />
              • 8 weeks of instruction<br />
              • 1-on-1 project reviews<br />
              • Certificate of completion<br />
              • Career guidance
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}