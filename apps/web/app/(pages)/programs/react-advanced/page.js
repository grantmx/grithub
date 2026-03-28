export default function ReactAdvanced() {
  return (
    <section className="container-xxl d-flex flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-2 fw-bold">
          React (Advanced)
        </h1>
        <p className="lead text-muted fs-3">
          Learn how to build stateful component-based UIs and applications using the React.js library.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            Learn how to easily build stateful component-based UIs and applications using the React.js library. You will learn how to setup React, understand fundamentals such as components, props, state, techniques, pitfalls, and strengths of modern React development.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            <li><strong>Duration:</strong> 8 weeks (16 sessions)</li>
            <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li>
            <li><strong>Price:</strong> R4,499 per course</li>
            <li><strong>Format:</strong> In-person (George) or online via Zoom</li>
            <li><strong>Prerequisite:</strong> Strong JavaScript fundamentals required</li>
          </ul>

          <h2 className="mt-5">Course Syllabus</h2>
          
          <div className="accordion mt-3" id="syllabusAccordion">
            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#week1">
                  Week 1-2: React Fundamentals
                </button>
              </h3>
              <div id="week1" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <ul>
                    <li>What is React and why use it?</li>
                    <li>Setting up a React project (Vite, Create React App)</li>
                    <li>JSX syntax and expressions</li>
                    <li>Components (functional vs class)</li>
                    <li>Props and prop types</li>
                    <li>Rendering lists and conditional content</li>
                    <li><strong>Project:</strong> Build a component library</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week3">
                  Week 3-4: State Management
                </button>
              </h3>
              <div id="week3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Understanding state in React</li>
                    <li>useState hook</li>
                    <li>useEffect for side effects</li>
                    <li>Forms and controlled components</li>
                    <li>Lifting state up</li>
                    <li><strong>Project:</strong> Build an interactive form with validation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week5">
                  Week 5-6: Advanced Hooks & Patterns
                </button>
              </h3>
              <div id="week5" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>useContext for global state</li>
                    <li>useReducer for complex state</li>
                    <li>Custom hooks</li>
                    <li>useMemo and useCallback</li>
                    <li>useRef for DOM references</li>
                    <li><strong>Project:</strong> Build a shopping cart</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week7">
                  Week 7-8: Data Fetching & Deployment
                </button>
              </h3>
              <div id="week7" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Fetching data with useEffect</li>
                    <li>React Query (TanStack Query)</li>
                    <li>Error boundaries</li>
                    <li>React Router for navigation</li>
                    <li>Testing React components</li>
                    <li>Deployment strategies (Vercel, Netlify)</li>
                    <li><strong>Final Project:</strong> Build and deploy a complete e-commerce frontend</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>✅ Build production-ready React applications</li>
            <li>✅ Master React hooks and patterns</li>
            <li>✅ Manage complex application state</li>
            <li>✅ Fetch and display data from APIs</li>
            <li>✅ Deploy React apps to production</li>
          </ul>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="display-6 fw-bold text-danger">R4,499</p>
            <a href="/contact" className="btn rounded-pill btn-danger btn-lg w-100">
              Register Now →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}