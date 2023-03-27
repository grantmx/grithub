import { GlobalContext } from 'contexts/GlobalContext';
import { useContext } from 'react';
import Style from './Header.module.scss'


function Header(){
    const [ global, _ ] = useContext(GlobalContext)

    return(
        <header className={Style.block}>
            <h1 className={Style.heading}>
                {global.heading}
            </h1>
        </header>
    )
}

export default Header;