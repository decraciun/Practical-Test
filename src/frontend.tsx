/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { SignUp } from "./SignUp";
import { Login } from "./Login";
import { Profile } from "./Profile";
import { Marketplace } from "./Marketplace";
import "./index.css";

// Routes for transaction dashboard, sign-up page, login page, profile page and marketplace dashboard
function Main() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/signup" element={<SignUp />} />
				<Route path="/login" element={<Login />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/marketplace" element={<Marketplace />} />
			</Routes>
		</Router>
	);
}

function start() {
	const root = createRoot(document.getElementById("root")!);
	root.render(<Main />);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}
