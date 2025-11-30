import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

import "./index.css";
import PlaylistTransfer from "./pages/playlist-transfer.tsx";
import AuthCallback from "./pages/auth-callback.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<PlaylistTransfer />} />
                    <Route
                        path="/auth/success"
                        element={<AuthCallback />}
                    />
                    <Route path="/auth/error" element={<AuthCallback />} />
                </Routes>
                <Toaster />
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>
);
