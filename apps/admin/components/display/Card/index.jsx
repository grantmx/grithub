import Style from './Card.module.scss'


function Card({ children }){
    return(
        <article className={Style.block}>
            {children}
        </article>
    )
}

export default Card;