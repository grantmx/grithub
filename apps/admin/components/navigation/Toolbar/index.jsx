import Style from "./ToolBar.module.scss"

import Notification from "./Notification";
import Search from "./Search";
import User from "./User";
import Logo from "../Logo";


function ToolBar(){
    return(
        <ul className={Style.block}>
            <div className={Style.logoBlock}>
                <Logo />
            </div>
            <Search />
            <Notification />
            <User />
        </ul>
    )
}


export default ToolBar;