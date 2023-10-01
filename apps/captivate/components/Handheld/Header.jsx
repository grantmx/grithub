import Style from "./styles/Handheld.module.scss"
import utils from "ui/styles/globals/utils.module.scss"
import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"

import Image from "next/image";
import clsx from "clsx";


function Header({ children }){
    return(
        <header className={clsx(utils.w_100, utils.mb_2)}>
            {/* <div className={clsx(utils.w_100, utils.text_center, utils.mb_1)}>
                <Image src={logo} width={100} height={100} alt="grit hub logo" />
            </div> */}

            <h1 className={Style.heading}>
                {children}
            </h1>
        </header>
    )
}


export default Header;