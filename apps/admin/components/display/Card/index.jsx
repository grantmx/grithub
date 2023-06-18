import clsx from 'clsx';
import Style from './Card.module.scss'


function Card({ children, className, marginBottom = null }){
    return(
        <article className={clsx(Style.block, className)} style={{ marginBottom: `${marginBottom}rem` }}>
            {children}
        </article>
    )
}

export default Card;