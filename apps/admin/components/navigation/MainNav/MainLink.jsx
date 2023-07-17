import clsx from 'clsx';
import Link from 'next/link';
import Style from './MainNav.module.scss'


function MainLink({ href = "/", name, path = "", icon }){
    const Icon = icon;

    return(
        <Link 
            href={href} 
            className={clsx(Style.link, path.includes(href) && Style.active )} 
        >
            {icon && <Icon className={Style.icon} />}
            
            <span className={Style.title}>
                {name}
            </span>
        </Link>
    )
}


export default MainLink;