import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function Profile() {
	const [user, setUser] = useState<{
		name: string;
		email: string;
		phone: string;
		address: string;
		transactionsCount: number;
		totalBitSlowCoins: number;
		totalBitSlowValue: number;
	} | null>(null);

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					setError("Not authenticated");
					return;
				}

				const response = await fetch("/api/profile", {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (!response.ok) {
					throw new Error("Failed to fetch profile");
				}

				const data = await response.json();
				setUser(data);
			} catch (err) {
				setError(err.message);
			}
		};

		fetchProfile();
	}, []);

	if (error)
		return (
			<div className="text-red-500 text-center mt-5">⚠ Error: {error}</div>
		);
	if (!user)
		return (
			<div className="text-center text-gray-500 mt-5">Loading profile...</div>
		);

	return (
		<div className="flex justify-center mt-10">
			<div className="bg-white shadow-lg rounded-lg p-6 w-96 text-center">
				<h2 className="text-2xl font-semibold text-gray-800">{user.name}</h2>
				<p className="text-gray-600">{user.email}</p>

				<hr className="my-4 border-gray-300" />

				<div className="text-left mb-6 text-gray-700">
					<p>
						<strong>Phone:</strong> {user.phone}
					</p>
					<p>
						<strong>Address:</strong> {user.address}
					</p>
					<p>
						<strong>Transactions:</strong> {user.transactionsCount}
					</p>
					<p>
						<strong>BitSlow Coins:</strong> {user.totalBitSlowCoins}
					</p>
					<p>
						<strong>Total Value:</strong> $
						{user.totalBitSlowValue.toLocaleString()}
					</p>
				</div>

				<Link
					to="/"
					className="btn btn-primary bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
				>
					Transactions
				</Link>
			</div>
		</div>
	);
}

export default Profile;
