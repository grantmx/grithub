/**
*   Global State Manager:
*   otherwise make it a local state or pass it in a prop
*/

// use our initial state as a type of manifest for the Global State
export const initialState = {
    heading: "Dashboard",
    secondaryNav: null,
    user: {
        isLoggedIn: false,
        email: "",
        customer_group_id: 5,
    },
}


export const GlobalReducer = (state, action) => {
    switch(action.type){

        case "setSecondaryNav": 
            return{
                ...state,
                secondaryNav: action.data
            }

        case "updateGlobalHeading": 
            return{
                ...state,
                heading : action.data
            }

            
        case "login":
            return{
                ...state,
                user: {
                    ...state.user,
                    isLoggedIn: true,
                    ...action.data
                }
            };

            

        case "setEmail":
            return{
                ...state,
                user: {
                    ...state.user,
                    ...action.data
                }
            };


            
        case "logout":
            return{
                ...state,
                user: {
                    ...state.user,
                    isLoggedIn: false,
                    data: {}
                }
            };
        

        default:
            throw new Error("Doh! You did not choose GlobalReducer method type to perform. Please try agin or go to GlobalContext.js for available types.")
    }
};
