/**
*   Global State Manager:
*   otherwise make it a local state or pass it in a prop
*/

// use our initial state as a type of manifest for the Global State
export const initialState = {}


export const InternReducer = (state, action) => {
    switch(action.type){
        case "setup":
            return {
                ...state,
                ...action.data
            }

        default:
            throw new Error("Doh! You did not choose GlobalReducer method type to perform. Please try agin or go to GlobalContext.js for available types.")
    }
};
