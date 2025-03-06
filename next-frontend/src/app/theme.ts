// src/theme.ts

import { createTheme, ThemeOptions } from "@mui/material/styles";
import { blue, grey, red } from "@mui/material/colors";

// Define custom theme options
const themeOptions: ThemeOptions = {
  palette: {
    mode: "light", // Set to 'dark' for dark mode
    primary: {
      main: blue[700],
    },
    secondary: {
      main: grey[500],
    },
    error: {
      main: red[500],
    },
    background: {
      default: grey[50],
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h1: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: blue[700],
        },
      },
    },
  },
};

// Create the theme
const theme = createTheme(themeOptions);

export default theme;
