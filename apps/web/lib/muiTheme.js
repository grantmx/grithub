import { createTheme } from "@mui/material/styles";

// MUI defaults several states (selected day, headers, digital clock selection) to a bold/medium
// font weight - override those tokens so MUI components sit flush with the site's own type styles
const muiTheme = createTheme({
    typography: {
        fontWeightBold: 400,
        fontWeightMedium: 400,
    },
});


export default muiTheme;
