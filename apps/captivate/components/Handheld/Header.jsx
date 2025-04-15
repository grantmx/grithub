import Style from "./styles/Handheld.module.scss"
// import logo from "ui/assets/GRITHUB-logo-white-cutout-solo.svg"
// import Image from "next/image";


function Header({ children, subText }){
    return(
        <header className={Style.headerBlock}>
            {/* <div className={clsx(utils.w_100, utils.text_center, utils.mb_1)}>
                <Image src={logo} width={100} height={100} alt="grit hub logo" />
            </div> */}

            <h1 className={Style.heading}>
                {children}
            </h1>

            {subText && (
                <>{subText}</>
            )}

        </header>
    )
}


export default Header;