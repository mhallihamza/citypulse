import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import App from "@/App";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      {/* BrowserRouter (path-based routes like /login, /app/tickets).
          Deep links & hard refreshes are served by the SPA rewrite in
          vercel.json — required for Supabase email-link redirects, which
          land on /login#access_token=... before the app can read them. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);