import React, { useReducer, createContext } from 'react';
import { StepperReducer, InitialState } from './StepperReducer';

export const StepperContext = createContext({});


// Create our Provider with our Reducer as our state manager
export const StepperContextProvider = props => {
    const [state, dispatch] = useReducer(StepperReducer, InitialState);
    
    return (
        <StepperContext.Provider value={[state, dispatch]}>
            {props.children}
        </StepperContext.Provider>
    );
};

