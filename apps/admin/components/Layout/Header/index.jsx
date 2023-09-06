import { GlobalContext } from 'contexts/GlobalContext';
import { NextSeo } from 'next-seo';
import { useContext } from 'react';
import Style from './Header.module.scss'
import Breadcrumbs from 'components/navigation/Breadcrumbs';


function Header(){
    const [ global, _ ] = useContext(GlobalContext)

    return(
        <>
            <NextSeo title={global.heading} />

            <header className={Style.block}>
                <h1 className={Style.title}>
                    {global.heading}
                </h1>

                <Breadcrumbs />
            </header> 
        </>
    )
}

export default Header;