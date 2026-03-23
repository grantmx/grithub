export default function IntroIntoJavaScript() {
  return (
    <section className="container-xxl d-flex p-md-5 p-4 flex-column mb-5">
      <article className="container-xxl d-flex pt-5 px-0 flex-column">
        <h1 className="display-2 fw-bold">
          Intro into JavaScript
        </h1>
        <p className="lead text-muted fs-3">
          Learn the history of JavaScript, functional syntax, Object Oriented Programming concepts, and build your first JavaScript application.
        </p>
      </article>

      <hr className="my-5" />

      <div className="col-12 d-flex flex-md-row flex-column mt-3">
        <div className="col-12 col-md-8 pe-md-5">
          <h2>Course Overview</h2>
          <p>
            This course covers the fundamentals of JavaScript programming. You'll learn proper functional JavaScript syntax and Object Oriented Programming concepts. By the end, you should be able to iterate data, show results in the browser, and have completed a functional JavaScript application.
          </p>

          <h3 className="mt-4">Course Details</h3>
          <ul>
            <li><strong>Duration:</strong> 6 weeks (12 sessions)</li>
            <li><strong>Schedule:</strong> Saturday mornings, 9am - 12pm</li>
            <li><strong>Price:</strong> R3,499 per course</li>
            <li><strong>Format:</strong> In-person (George) or online via Zoom</li>
            <li><strong>Prerequisite:</strong> Basic HTML & CSS knowledge recommended</li>
          </ul>

          <h2 className="mt-5">Course Syllabus</h2>
          
          <div className="accordion mt-3" id="syllabusAccordion">
            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#week1">
                  Week 1: JavaScript Fundamentals
                </button>
              </h3>
              <div id="week1" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <ul>
                    <li>History and evolution of JavaScript</li>
                    <li>Variables, data types, and operators</li>
                    <li>Working with strings and numbers</li>
                    <li>Basic input/output</li>
                    <li>Browser console and debugging</li>
                    <li><strong>Project:</strong> Create a simple greeting app</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week2">
                  Week 2: Control Flow & Functions
                </button>
              </h3>
              <div id="week2" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Conditional statements (if/else, switch)</li>
                    <li>Loops (for, while, forEach)</li>
                    <li>Functions and scope</li>
                    <li>Arrow functions</li>
                    <li>Callback functions</li>
                    <li><strong>Project:</strong> Build a number guessing game</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week3">
                  Week 3: Arrays & Objects
                </button>
              </h3>
              <div id="week3" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Working with arrays and array methods</li>
                    <li>Objects and properties</li>
                    <li>Iterating through data</li>
                    <li>Map, filter, and reduce</li>
                    <li>Destructuring arrays and objects</li>
                    <li><strong>Project:</strong> Create a movie list app</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week4">
                  Week 4: DOM Manipulation
                </button>
              </h3>
              <div id="week4" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Selecting and modifying HTML elements</li>
                    <li>Event listeners and handling</li>
                    <li>Creating dynamic content</li>
                    <li>Form validation</li>
                    <li>Working with local storage</li>
                    <li><strong>Project:</strong> Build a to-do list application</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week5">
                  Week 5: Object Oriented Programming
                </button>
              </h3>
              <div id="week5" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Constructor functions and classes</li>
                    <li>Prototypes and inheritance</li>
                    <li>Object methods and this keyword</li>
                    <li>Creating reusable code</li>
                    <li><strong>Project:</strong> Build a simple banking app</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="accordion-item">
              <h3 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#week6">
                  Week 6: APIs & Final Project
                </button>
              </h3>
              <div id="week6" className="accordion-collapse collapse">
                <div className="accordion-body">
                  <ul>
                    <li>Introduction to APIs and JSON</li>
                    <li>Fetching data from external APIs</li>
                    <li>Async/Await and promises</li>
                    <li>Error handling</li>
                    <li><strong>Final Project:</strong> Build a weather app using a public API</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <h3 className="mt-5">What You'll Achieve</h3>
          <ul>
            <li>✅ Write clean, functional JavaScript code</li>
            <li>✅ Manipulate the DOM dynamically</li>
            <li>✅ Work with arrays and objects</li>
            <li>✅ Create interactive web applications</li>
            <li>✅ Fetch and display data from APIs</li>
          </ul>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4">
            <h3>Enroll Now</h3>
            <p className="display-6 fw-bold text-danger">R3,499</p>
            <a href="/contact" className="btn rounded-pill btn-danger btn-lg w-100">
              Register Now →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}