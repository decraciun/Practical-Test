import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface BitSlowCoin {
	id: number;
	bit1: number;
	bit2: number;
	bit3: number;
	value: number;
	owner_id: number | null;
	owner_name: string | null;
	computedBitSlow: string;
}

const ENDPOINT_URL = "http://localhost:3000/";

function fetchCoins(
	filters: Record<string, string>,
): Promise<{
	coins: BitSlowCoin[];
	totalCount: number;
	hasAvailableCombinations: boolean;
}> {
	const queryParams = new URLSearchParams(
		Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
	);

	return fetch(`${ENDPOINT_URL}api/coins?${queryParams}`)
		.then((response) => response.json())
		.then((data) => ({
			coins: data.coins || [],
			totalCount: data.totalCount || 0,
			hasAvailableCombinations: data.hasAvailableCombinations ?? true,
		}))
		.catch((error) => {
			console.error("Error fetching coins:", error);
			return { coins: [], totalCount: 0, hasAvailableCombinations: true };
		});
}

function useCoins(filters: Record<string, string>) {
	const [coins, setCoins] = useState<BitSlowCoin[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [hasAvailableCombinations, setHasAvailableCombinations] =
		useState(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		setLoading(true);
		fetchCoins(filters)
			.then(({ coins, totalCount, hasAvailableCombinations }) => {
				setCoins(coins);
				setTotalCount(totalCount);
				setHasAvailableCombinations(hasAvailableCombinations);
				setLoading(false);
			})
			.catch((err) => {
				setError(err);
				setLoading(false);
			});
	}, [filters]);

	return { coins, totalCount, hasAvailableCombinations, loading, error };
}

export function Marketplace() {
	const [filters, setFilters] = useState({ page: "1", limit: "30" });
	const { coins, totalCount, hasAvailableCombinations, loading, error } =
		useCoins(filters);
	const [loadingTime, setLoadingTime] = useState(0);
	const [coinValue, setCoinValue] = useState<number | string>("");
	const token = localStorage.getItem("token");

	useEffect(() => {
		let timerId: number | undefined;

		if (loading) {
			timerId = window.setInterval(() => {
				setLoadingTime((prevTime) => prevTime + 1);
			}, 1000);
		} else {
			setLoadingTime(0);
		}

		return () => {
			if (timerId) clearInterval(timerId);
		};
	}, [loading]);

	const handleNextPage = () => {
		const nextPage = (Number.parseInt(filters.page) + 1).toString();
		if (
			(Number.parseInt(nextPage) - 1) * Number.parseInt(filters.limit) <
			totalCount
		) {
			setFilters((prevFilters) => ({ ...prevFilters, page: nextPage }));
		}
	};

	const handlePreviousPage = () => {
		const prevPage = Math.max(Number.parseInt(filters.page) - 1, 1).toString();
		setFilters((prevFilters) => ({ ...prevFilters, page: prevPage }));
	};

	const handleBuyCoin = async (coinId: number) => {
		try {
			const response = await fetch(`${ENDPOINT_URL}api/buyCoin`, {
				method: "POST",
				body: JSON.stringify({
					coinId: coinId,
					buyer_id: localStorage.getItem("user_id"),
				}),
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) throw new Error("Failed to buy the coin");

			alert("Coin purchased successfully!");
			setFilters({ ...filters });
		} catch (error) {
			console.error("Error buying coin:", error);
			alert("Failed to buy the coin.");
		}
	};

	const handleGenerateCoin = async () => {
		if (
			!coinValue ||
			Number.isNaN(Number(coinValue)) ||
			Number(coinValue) <= 0
		) {
			alert("Please enter a valid value for the coin.");
			return;
		}
		try {
			const response = await fetch(`${ENDPOINT_URL}api/generateCoin`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_id: localStorage.getItem("user_id"),
					value: coinValue,
				}),
			});

			if (!response.ok) throw new Error("Failed to generate a coin");

			alert("New coin generated successfully!");
			setFilters({ ...filters });
		} catch (error) {
			console.error("Error generating coin:", error);
			alert("Failed to generate a coin.");
		}
	};

	if (!token)
		return (
			<div className="text-red-500 text-center mt-5">
				⚠ Error: User not authenticated
			</div>
		);

	if (loading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-gray-50">
				<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
				<div className="animate-pulse flex flex-col items-center">
					<h2 className="text-xl font-semibold text-gray-700 mb-2">
						Loading Marketplace
					</h2>
					<p className="text-sm text-gray-600 mb-2">
						Time elapsed: {loadingTime} seconds
					</p>
					<div className="flex space-x-1">
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "0ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "150ms" }}
						></div>
						<div
							className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
							style={{ animationDelay: "300ms" }}
						></div>
					</div>
				</div>
			</div>
		);
	}

	if (error)
		return (
			<div className="text-red-500 text-center">
				Error loading coins: {error.message}
			</div>
		);

	return (
		<div className="max-w-7xl mx-auto p-4">
			<div className="flex flex-col md:flex-row md:justify-between gap-2 mb-3">
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
					BitSlow Marketplace
				</h1>
				<div className="flex flex-wrap gap-2 justify-start">
					<Link
						to="/"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-center"
					>
						Transactions
					</Link>
					<Link
						to="/profile"
						className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-center"
					>
						My Profile
					</Link>
				</div>
			</div>

			{hasAvailableCombinations && (
				<div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
					<button
						type="button"
						onClick={handleGenerateCoin}
						className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
					>
						Generate New Coin
					</button>

					<input
						type="number"
						placeholder="Amount"
						value={coinValue}
						onChange={(e) => setCoinValue(e.target.value)}
						className="border p-2 rounded w-full sm:w-48"
					/>
				</div>
			)}

			{coins.length === 0 ? (
				<p className="text-gray-500 text-center">No available coins</p>
			) : (
				<div className="overflow-x-auto rounded-lg shadow-md">
					<table className="w-full border-collapse bg-white min-w-[600px]">
						<thead>
							<tr className="bg-gray-800 text-white">
								<th className="p-4 text-left">ID</th>
								<th className="p-4 text-left">BitSlow</th>
								<th className="p-4 text-left">Owner</th>
								<th className="p-4 text-right">Value</th>
								<th className="p-4 text-center">Actions</th>
							</tr>
						</thead>
						<tbody>
							{coins.map((coin, index) => (
								<tr
									key={coin.id}
									className={`hover:bg-gray-50 transition-colors ${index === coins.length - 1 ? "" : "border-b border-gray-200"}`}
								>
									<td className="p-4 text-gray-600">{coin.id}</td>
									<td className="p-4">
										<div className="font-medium text-gray-800">
											{coin.computedBitSlow}
										</div>
										<div className="text-xs text-gray-500 mt-1">
											Bits: {coin.bit1}, {coin.bit2}, {coin.bit3}
										</div>
									</td>
									<td className="p-4 text-gray-700">
										{coin.owner_name ? coin.owner_name : "Available"}
									</td>
									<td className="p-4 text-right font-semibold text-gray-800">
										${coin.value.toLocaleString()}
									</td>
									<td className="p-4 text-center">
										{coin.owner_id === null ? (
											<button
												type="button"
												onClick={() => handleBuyCoin(coin.id)}
												className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
											>
												Buy
											</button>
										) : (
											<span className="text-gray-400">Owned</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
				<button
					type="button"
					onClick={handlePreviousPage}
					disabled={filters.page === "1"}
					className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 w-32 text-center"
				>
					Previous
				</button>

				<span className="text-gray-600 text-sm sm:text-base">
					Page {filters.page}
				</span>

				<button
					type="button"
					onClick={handleNextPage}
					disabled={
						Number.parseInt(filters.page) * Number.parseInt(filters.limit) >=
						totalCount
					}
					className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50 w-32 text-center"
				>
					Next
				</button>
			</div>
		</div>
	);
}

export default Marketplace;
