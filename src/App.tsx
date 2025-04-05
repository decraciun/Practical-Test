import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface Transaction {
	id: number;
	coin_id: number;
	amount: number;
	transaction_date: string;
	seller_id: number | null;
	seller_name: string | null;
	buyer_id: number;
	buyer_name: string;
	bit1: number;
	bit2: number;
	bit3: number;
	value: number;
	computedBitSlow: string;
}

const ENDPOINT_URL = "http://localhost:3000/";

function fetchTransactions(
	filters: Record<string, string>,
): Promise<{ transactions: Transaction[]; totalCount: number }> {
	const queryParams = new URLSearchParams(
		Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
	);

	return fetch(`${ENDPOINT_URL}api/transactions?${queryParams}`)
		.then((response) => response.json())
		.then((data) => ({
			transactions: data.transactions || [],
			totalCount: data.totalCount || 0,
		}))
		.catch((error) => {
			console.error("Error fetching transactions:", error);
			return { transactions: [], totalCount: 0 };
		});
}

function useTransactions(filters: Record<string, string>) {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		setLoading(true);

		fetchTransactions(filters)
			.then(({ transactions, totalCount }) => {
				setTransactions(transactions);
				setTotalCount(totalCount);
				setLoading(false);
			})
			.catch((err) => {
				setError(err);
				setLoading(false);
			});
	}, [filters]);

	return { transactions, totalCount, loading, error };
}

export function App() {
	const [filterInputs, setFilterInputs] = useState({
		startDate: "",
		endDate: "",
		minValue: "",
		maxValue: "",
		buyerName: "",
		sellerName: "",
		page: "1",
		limit: "15",
	});
	const [filters, setFilters] = useState(filterInputs);

	const { transactions, totalCount, loading, error } = useTransactions(filters);

	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const applyFilters = () => {
		setFilters((prevFilters) => ({ ...filterInputs, page: "1" }));
	};

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

	const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newLimit = e.target.value;
		setFilterInputs((prev) => ({ ...prev, limit: newLimit }));
		setFilters({ ...filters, limit: newLimit, page: "1" });
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user_id");
		setIsLoggedIn(false);
	};

	const [loadingTime, setLoadingTime] = useState(0);

	// Checks local storage for a token to determine login status
	useEffect(() => {
		const token = localStorage.getItem("token");
		setIsLoggedIn(!!token);
	}, []);

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

	if (loading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen bg-gray-50 p-4">
				<div className="w-16 h-16 mb-4 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
				<div className="animate-pulse flex flex-col items-center">
					<h2 className="text-xl font-semibold text-gray-700 mb-2 text-center">
						Loading Transactions
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

	if (error) {
		return (
			<div className="text-red-500 p-4 text-center">
				Error loading transactions: {error.message}
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto p-4">
			<div className="flex flex-col md:flex-row md:justify-between gap-2 mb-3">
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
					BitSlow Transactions
				</h1>
				<div className="flex flex-wrap gap-2 justify-start">
					{/* Displays different buttons depending on login state */}
					{isLoggedIn ? (
						<>
							<Link
								to="/marketplace"
								className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
							>
								Marketplace
							</Link>
							<Link
								to="/profile"
								className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
							>
								My Profile
							</Link>
							<button
								onClick={handleLogout}
								className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
							>
								Log out
							</button>
						</>
					) : (
						<>
							<Link
								to="/signup"
								className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
							>
								Sign up
							</Link>
							<Link
								to="/login"
								className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
							>
								Sign in
							</Link>
						</>
					)}
				</div>
			</div>

			<div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
				<input
					type="date"
					value={filterInputs.startDate}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, startDate: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<input
					type="date"
					value={filterInputs.endDate}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, endDate: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<input
					type="number"
					placeholder="Min Value"
					value={filterInputs.minValue}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, minValue: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<input
					type="number"
					placeholder="Max Value"
					value={filterInputs.maxValue}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, maxValue: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<input
					type="text"
					placeholder="Buyer Name"
					value={filterInputs.buyerName}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, buyerName: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<input
					type="text"
					placeholder="Seller Name"
					value={filterInputs.sellerName}
					onChange={(e) =>
						setFilterInputs({ ...filterInputs, sellerName: e.target.value })
					}
					className="border p-2 rounded w-full"
				/>
				<button
					onClick={applyFilters}
					className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
				>
					Apply Filters
				</button>
			</div>

			<div className="mb-4 flex justify-center">
				<div>
					<label className="mr-2 font-semibold">Transactions per page:</label>
					<select
						value={filters.limit}
						onChange={handleLimitChange}
						className="border p-2 rounded"
					>
						<option value="15">15</option>
						<option value="30">30</option>
						<option value="50">50</option>
					</select>
				</div>
			</div>

			{transactions.length === 0 ? (
				<p className="text-gray-500 text-center">No transactions found</p>
			) : (
				<div className="overflow-x-auto rounded-lg shadow-md">
					<table className="min-w-[640px] w-full border-collapse bg-white text-sm sm:text-base">
						<thead>
							<tr className="bg-gray-800 text-white">
								<th className="p-4 text-left">ID</th>
								<th className="p-4 text-left">BitSlow</th>
								<th className="p-4 text-left">Seller</th>
								<th className="p-4 text-left">Buyer</th>
								<th className="p-4 text-right">Amount</th>
								<th className="p-4 text-left">Date</th>
							</tr>
						</thead>
						<tbody>
							{transactions.map((transaction, index) => (
								<tr
									key={transaction.id}
									className={`hover:bg-gray-50 transition-colors ${index === transactions.length - 1 ? "" : "border-b border-gray-200"}`}
								>
									<td className="p-4 text-gray-600">{transaction.id}</td>
									<td className="p-4">
										<div>
											<div className="font-medium text-gray-800">
												{transaction.computedBitSlow}
											</div>
											<div className="text-xs text-gray-500 mt-1">
												Bits: {transaction.bit1}, {transaction.bit2},{" "}
												{transaction.bit3}
											</div>
											<div className="text-xs text-gray-500">
												Value: ${transaction.value.toLocaleString()}
											</div>
										</div>
									</td>
									<td className="p-4 text-gray-700">
										{transaction.seller_name
											? transaction.seller_name
											: "Original Issuer"}
									</td>
									<td className="p-4 text-gray-700">
										{transaction.buyer_name}
									</td>
									<td className="p-4 text-right font-semibold text-gray-800">
										${transaction.amount.toLocaleString()}
									</td>
									<td className="p-4 text-sm text-gray-600">
										{new Date(transaction.transaction_date).toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Allows users to navigate between pages */}
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

export default App;
