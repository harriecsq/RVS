
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { installApiUserHeaders } from "./utils/apiUserHeaders";

  installApiUserHeaders();

  createRoot(document.getElementById("root")!).render(<App />);
  