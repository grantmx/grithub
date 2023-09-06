import PropTypes from 'prop-types';

import Style from './RadioButtonGroup.module.scss';

function RadioButtonGroup ({ color, children }){

    return(
        <div className={Style.block}>
            {children}
        </div>
    )

}


RadioButtonGroup.propTypes = {
    color: PropTypes.string,
    name: PropTypes.string,
    buttons: PropTypes.array,
    onChange: PropTypes.func
};


export default RadioButtonGroup;