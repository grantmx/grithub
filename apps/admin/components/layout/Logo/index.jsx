import Link from "next/link";
import logo from 'public/assets/grithub-logo-horz-white-red.svg';
import mobileLogo from 'public/assets/grithub-circle-logo.svg';

import Style from "./Logo.module.scss"


function Logo(){
    return(
        <Link href="/" className={Style.logoLink}>
            <picture className={Style.logo}>
                <source srcSet={mobileLogo.src} media="(max-width: 1024px)" />
                <img src={logo.src} alt="GRIT Hub" />
            </picture>
        </Link>
    )
}


export default Logo;