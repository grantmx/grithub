import clsx from 'clsx';
import Image from 'next/image';
import hero from "public/assets/hero.jpg" 

import Style from "styles/portal.module.scss"


export default function Portal(){
	return(
        <main className="container-fluid d-flex p-0 flex-column">
            <section className={Style.heroWrapper}>
                <Image 
                    className={Style.heroImg} 
                    src={hero}
                    layout="fill" 
                    alt="See your future ahead of you" 
                />

                <div className={Style.signinWrapper}>
                    <form className={clsx(Style.signin, "shadow-lg", "rounded", "form-floating")}>
                        <Image 
                            src="/assets/grithub-logo-horz-dark.svg" 
                            width={400} 
                            height={120} 
                            alt="GRITHub Logo" 
                            layout="responsive"
                            className={Style.logo}
                        />                  

                        <h1 className="h3 mb-3 mt-3 fw-normal">Please sign in</h1>

                        <div className="form-floating w-100">
                            <input type="email" className="form-control" id="floatingInput" placeholder="name@example.com" />
                            <label for="floatingInput">Email address</label>
                        </div>
                        
                        <div className="form-floating w-100">
                            <input type="password" className="form-control" id="floatingPassword" placeholder="Password" />
                            <label for="floatingPassword">Password</label>
                        </div>

                        <div className="checkbox mb-3 w-100 mt-3">
                            <label>
                                <input type="checkbox" value="remember-me" /> Remember me
                            </label>
                        </div>
                        
                        <button className="w-100 btn btn-lg btn-primary" type="submit">Sign in</button>
                        
                        <p className="mt-3 mb-1 text-muted">© 2017–2022</p>
                    </form>
                </div>
                
            </section>
        </main>
	)
}

