import clsx from 'clsx';
import Style from './Select.module.scss';


function SelectItem({ 
    value, 
    children, 
    name,
    index = -1, 
    isSelected = false,
    onClick = () => null 
}){
    return(
        <li 
            className={clsx(Style.menuItem, isSelected && Style.menuItemSelected)}
            data-value={value} 
            name={name}
            role="option" 
            tabIndex={isSelected ? 0 : index} 
            aria-selected={isSelected}
            onClick={() => onClick({ value, name })}
        >
            {children}
        </li>
    ) 
}


export default SelectItem;