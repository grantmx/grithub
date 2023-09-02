"use client"

import { useReducer, createContext, useEffect } from 'react';
import { InternReducer, initialState } from './InternReducer';

export const InternContext = createContext();

// Create our Provider with our Reducer as our state manager
export const InternContextProvider = props => {
    const [ state, dispatch ] = useReducer(InternReducer, initialState);

    useEffect(() => {
        dispatch({
            type: "setup",
            data: props
        })

    }, [ props ])
  

    return (
        <InternContext.Provider value={[state, dispatch]}>
            {props.children}
        </InternContext.Provider>
    );
};

