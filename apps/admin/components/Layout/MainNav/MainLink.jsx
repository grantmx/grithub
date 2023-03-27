import clsx from 'clsx';
import Link from 'next/link';
import Style from './MainNav.module.scss'


function MainLink({ href = "/", name, path, icon }){
    const Icon = icon;

    return(
        <Link 
            href={href} 
            className={clsx(Style.link, path === href && Style.active )} 
            key={name}
        >
            {icon && <Icon className={Style.icon} />}
            {name}
        </Link>
    )
}


export default MainLink;