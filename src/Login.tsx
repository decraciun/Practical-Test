import { useState } from "react";

const ENDPOINT_URL = "http://localhost:3000/api/login";

export function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleLogin(event: React.FormEvent) {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch(ENDPOINT_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Login failed");

			localStorage.setItem("token", data.token);
			localStorage.setItem("user_id", data.user_id);
			window.location.href = "/profile";
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
			<form
				className="bg-white p-6 rounded shadow-md w-80 flex flex-col items-center justify-center"
				onSubmit={handleLogin}
			>
				<h2 className="text-2xl font-bold mb-4">Login</h2>
				{error && <p className="text-red-500 mb-3 font-bold">{error}</p>}
				<input
					type="email"
					placeholder="Email"
					className="w-full p-2 mb-3 border rounded"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<input
					type="password"
					placeholder="Password"
					className="w-full p-2 mb-3 border rounded"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<button
					type="submit"
					className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
					disabled={loading}
				>
					{loading ? "Logging in..." : "Login"}
				</button>
			</form>
		</div>
	);
}
