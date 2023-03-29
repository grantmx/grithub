import IconAdd from "components/icons/IconAdd";
import Style from "./AddButton.module.scss";

function AddButton({ onClick }){
    return(
        <button 
            type="button"
            className={Style.block}
            onClick={onClick}
        >
            <IconAdd className={Style.icon} />
        </button>
    )
}

export default AddButton;