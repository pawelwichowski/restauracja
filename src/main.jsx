import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./authValidation.js";
import App from "./App.jsx";
import "./styles.css";
import "./auth.css";
import "./restaurantForm.css";
import "./reviews.css";
import "./commentSearch.css";
import "./presentation.css";
import "./workshopTheme.css";
import "./visualPolish.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
