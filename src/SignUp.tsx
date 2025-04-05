import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SignUp() {
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const navigate = useNavigate();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		const response = await fetch("http://localhost:3000/api/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, password, email, phone, address }),
		});

		if (response.ok) {
			setSuccess(true);
			setTimeout(() => navigate("/login"), 2000);
		} else {
			const data = await response.json();
			console.log("Error response:", data);
			setError(data.error || "Signup failed.");
		}
	}

	return (
		<div className="flex justify-center items-center h-screen bg-gray-100">
			<form
				onSubmit={handleSubmit}
				className="bg-white p-6 rounded shadow-md w-96 flex flex-col items-center justify-center"
			>
				<h2 className="text-2xl font-bold mb-4">Sign Up</h2>
				{error && <p className="text-red-500 font-bold">{error}</p>}
				{success && (
					<p className="text-green-500 font-bold">
						Account created! Redirecting...
					</p>
				)}
				<input
					type="text"
					placeholder="Name"
					className="w-full p-2 border rounded mb-2"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
				<input
					type="email"
					placeholder="Email"
					className="w-full p-2 border rounded mb-2"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<input
					type="password"
					placeholder="Password"
					className="w-full p-2 border rounded mb-2"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				<input
					type="password"
					placeholder="Confirm Password"
					className="w-full p-2 border rounded mb-2"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
				/>
				<input
					type="tel"
					placeholder="Phone Number"
					className="w-full p-2 border rounded mb-2"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					required
				/>
				<input
					type="text"
					placeholder="Address"
					className="w-full p-2 border rounded mb-2"
					value={address}
					onChange={(e) => setAddress(e.target.value)}
					required
				/>
				<button
					type="submit"
					className="w-full bg-blue-500 text-white p-2 rounded"
				>
					Sign Up
				</button>
			</form>
		</div>
	);
}
