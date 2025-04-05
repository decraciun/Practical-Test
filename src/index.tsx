import { serve } from "bun";
import { Database } from "bun:sqlite";
import { seedDatabase } from "./seed";
import index from "./index.html";
import { computeBitSlow } from "./bitslow";
import { hashSync, compareSync } from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { en } from "@faker-js/faker";

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
	throw new Error("SECRET_KEY is missing in environment variables!");
}

// Initialize the database
const db = new Database(":memory:");

// Seed the database with random data
seedDatabase(db, {
	clientCount: 30,
	bitSlowCount: 50,
	transactionCount: 50,
	clearExisting: true,
});

// Cache for better performance
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 sec

function getFromCache(key: string) {
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data;
	}
	cache.delete(key);
	return null;
}

function setInCache(key: string, data: any) {
	cache.set(key, { data, timestamp: Date.now() });
}

const server = serve({
	routes: {
		"/signup": index,
		"/": index,
		"/login": index,
		"/profile": index,
		"/marketplace": index,
		// API for generating new BitSlow coins
		"/api/generateCoin": async (req) => {
			try {
				const { user_id, value } = await req.json();

				if (!user_id) {
					return new Response(
						JSON.stringify({ error: "User ID is required" }),
						{ status: 400 },
					);
				}

				const existingCombinations = db
					.query("SELECT bit1, bit2, bit3 FROM coins")
					.all();
				const existingSet = new Set(
					existingCombinations.map(
						({ bit1, bit2, bit3 }) => `${bit1}-${bit2}-${bit3}`,
					),
				);

				let newBits = null;
				for (let i = 1; i < 1000; i++) {
					for (let j = i + 1; j < 1000; j++) {
						for (let k = j + 1; k < 1000; k++) {
							if (!existingSet.has(`${i}-${j}-${k}`)) {
								newBits = { bit1: i, bit2: j, bit3: k };
								break;
							}
						}
						if (newBits) break;
					}
					if (newBits) break;
				}

				if (!newBits) {
					return new Response(
						JSON.stringify({
							error: "No unique BitSlow combination available",
						}),
						{ status: 400 },
					);
				}

				if (value < 10000 || value > 100000) {
					return new Response(
						JSON.stringify({
							error: "The amount should be between $10000 and $100000!",
						}),
						{ status: 400 },
					);
				}

				cache.clear();

				db.query(
					"INSERT INTO coins (bit1, bit2, bit3, value, client_id) VALUES (?, ?, ?, ?, ?)",
				).run(newBits.bit1, newBits.bit2, newBits.bit3, value, user_id);

				return new Response(
					JSON.stringify({
						message: "New BitSlow coin generated successfully",
					}),
					{ status: 201 },
				);
			} catch (error) {
				console.error("Error generating coin:", error);
				return new Response(
					JSON.stringify({ error: "Error generating coin" }),
					{ status: 500 },
				);
			}
		},
		// API for buying process
		"/api/buyCoin": async (req) => {
			try {
				const { coinId, buyer_id } = await req.json();

				if (!coinId || !buyer_id) {
					return new Response(
						JSON.stringify({ error: "Missing required data." }),
						{ status: 400 },
					);
				}

				const coin = db
					.query("SELECT client_id, value FROM coins WHERE coin_id = ?")
					.get(coinId);

				if (!coin) {
					return new Response(JSON.stringify({ error: "Coin not found" }), {
						status: 404,
					});
				}

				if (coin.client_id !== null) {
					return new Response(JSON.stringify({ error: "Coin already owned" }), {
						status: 400,
					});
				}

				db.query("UPDATE coins SET client_id = ? WHERE coin_id = ?").run(
					buyer_id,
					coinId,
				);
				db.query(
					"INSERT INTO transactions (coin_id, amount, transaction_date, buyer_id) VALUES (?, ?, datetime('now'), ?)",
				).run(coinId, coin.value, buyer_id);

				cache.clear();

				return new Response(
					JSON.stringify({ message: "Coin purchased successfully" }),
					{ status: 200 },
				);
			} catch (error) {
				console.error("Error buying coin:", error);
				return new Response(JSON.stringify({ error: "Error buying coin" }), {
					status: 500,
				});
			}
		},
		// API for the marketplace
		"/api/coins": (req) => {
			try {
				const url = new URL(req.url);
				const page = Number.parseInt(url.searchParams.get("page") || "1");
				const limit = Number.parseInt(url.searchParams.get("limit") || "30");
				const offset = (page - 1) * limit;

				const cacheKey = `page=${page}&limit=${limit}`;
				const cachedData = getFromCache(cacheKey);

				if (cachedData) {
					return new Response(JSON.stringify(cachedData), {
						headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
					});
				}

				const coins = db
					.query(
						`SELECT c.coin_id AS id, c.bit1, c.bit2, c.bit3, c.value, 
						c.client_id AS owner_id, cl.name AS owner_name 
					 FROM coins c 
					 LEFT JOIN clients cl ON c.client_id = cl.id
					 ORDER BY c.coin_id ASC
					 LIMIT ? OFFSET ?`,
					)
					.all(limit, offset);

				const totalCount =
					db.query("SELECT COUNT(*) AS total FROM coins").get()?.total || 0;

				const usedCombinations = db
					.query("SELECT bit1, bit2, bit3 FROM coins")
					.all();
				const hasAvailableCombinations = usedCombinations.length < 1000;

				const enhancedCoins = coins.map((coin) => ({
					...coin,
					computedBitSlow: computeBitSlow(coin.bit1, coin.bit2, coin.bit3),
				}));

				const result = {
					coins: enhancedCoins,
					totalCount,
					hasAvailableCombinations,
				};
				setInCache(cacheKey, result);

				return Response.json({
					coins: enhancedCoins,
					totalCount,
					hasAvailableCombinations,
				});
			} catch (error) {
				console.error("Error fetching coins:", error);
				return new Response(JSON.stringify({ error: "Error fetching coins" }), {
					status: 500,
				});
			}
		},
		// API for the registration
		"/api/signup": async (req) => {
			try {
				const { name, password, email, phone, address } = await req.json();

				if (!email || !password || !name || !phone || !address) {
					return new Response(
						JSON.stringify({ error: "All fields are required." }),
						{ status: 400 },
					);
				}

				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(email)) {
					return new Response(
						JSON.stringify({ error: "Invalid email format." }),
						{ status: 400 },
					);
				}

				const phoneRegex = /^\d+$/;
				if (!phoneRegex.test(phone)) {
					return new Response(
						JSON.stringify({ error: "Phone number must contain only digits." }),
						{ status: 400 },
					);
				}

				const hashedPassword = hashSync(password, 10);
				db.query(
					"INSERT INTO clients (name, password, email, phone, address) VALUES (?, ?, ?, ?, ?)",
				).run(name, hashedPassword, email, phone, address);

				return new Response(
					JSON.stringify({ message: "User registered successfully." }),
					{ status: 201 },
				);
			} catch (error) {
				console.error("Signup Error:", error);

				if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
					return new Response(
						JSON.stringify({ error: "User with this email already exists." }),
						{ status: 400 },
					);
				}

				return new Response(JSON.stringify({ error: "Signup failed." }), {
					status: 500,
				});
			}
		},
		// API for the authentication
		"/api/login": async (req) => {
			try {
				const { email, password } = await req.json();

				if (!email || !password) {
					return new Response(
						JSON.stringify({ error: "Email and password are required." }),
						{ status: 400 },
					);
				}

				const user = db
					.query("SELECT id, email, password FROM clients WHERE email = ?")
					.get(email) as
					| { id: number; email: string; password: string }
					| undefined;
				if (!user) {
					return new Response(
						JSON.stringify({ error: "Invalid email or password." }),
						{ status: 401 },
					);
				}

				if (!compareSync(password, user.password)) {
					return new Response(
						JSON.stringify({ error: "Invalid email or password." }),
						{ status: 401 },
					);
				}

				const token = jwt.sign({ id: user.id }, SECRET_KEY, {
					expiresIn: "1h",
				});

				return new Response(
					JSON.stringify({ message: "Login successful.", token, user_id: user.id }),
					{ status: 200 },
				);
			} catch (error) {
				console.error("Login Error:", error);
				return new Response(JSON.stringify({ error: "Login failed." }), {
					status: 500,
				});
			}
		},
		// API for the profile page
		"/api/profile": async (req) => {
			try {
				const token = req.headers.get("Authorization")?.split(" ")[1];

				if (!token) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
					});
				}

				const decoded = jwt.verify(token, SECRET_KEY) as { id: number };
				const user = db
					.query("SELECT name, email, phone, address FROM clients WHERE id = ?")
					.get(decoded.id);

				const transactionsCount =
					db
						.query(
							"SELECT COUNT(*) as total FROM transactions WHERE buyer_id = ? OR seller_id = ?",
						)
						.get(decoded.id, decoded.id)?.total || 0;

				const totalBitSlowCoins =
					db
						.query("SELECT COUNT(*) as total FROM coins WHERE client_id = ?")
						.get(decoded.id)?.total || 0;

				const totalBitSlowValue =
					db
						.query("SELECT SUM(value) as total FROM coins WHERE client_id = ?")
						.get(decoded.id)?.total || 0;

				if (!user) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
					});
				}

				return new Response(
					JSON.stringify({
						...user,
						transactionsCount,
						totalBitSlowCoins,
						totalBitSlowValue,
					}),
					{ status: 200 },
				);
			} catch (error) {
				return new Response(JSON.stringify({ error: "Invalid token" }), {
					status: 401,
				});
			}
		},
		"/api/transactions": (req) => {
			try {
				const url = new URL(req.url);
				const page = Number.parseInt(url.searchParams.get("page") || "1");
				const limit = Number.parseInt(url.searchParams.get("limit") || "15");
				const startDate = url.searchParams.get("startDate");
				const endDate = url.searchParams.get("endDate");
				const minValue = url.searchParams.get("minValue");
				const maxValue = url.searchParams.get("maxValue");
				const buyerName = url.searchParams.get("buyerName");
				const sellerName = url.searchParams.get("sellerName");
				const offset = (page - 1) * limit;

				const cacheKey = `transactions_page=${page}&limit=${limit}&start_date=${startDate}&end_date=${endDate}&min_val=${minValue}&max_val=${maxValue}&buyer_name=${buyerName}&seller_name=${sellerName}`;
				const cachedData = getFromCache(cacheKey);

				if (cachedData) {
					return new Response(JSON.stringify(cachedData), {
						headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
					});
				}

				let query = `SELECT t.id, t.coin_id, t.amount, t.transaction_date,
            seller.name as seller_name, buyer.name as buyer_name,
            c.bit1, c.bit2, c.bit3, c.value
            FROM transactions t
            LEFT JOIN clients seller ON t.seller_id = seller.id
            JOIN clients buyer ON t.buyer_id = buyer.id
            JOIN coins c ON t.coin_id = c.coin_id WHERE 1=1`;

				let countQuery = `SELECT COUNT(*) as total FROM transactions t
            LEFT JOIN clients seller ON t.seller_id = seller.id
            JOIN clients buyer ON t.buyer_id = buyer.id
            JOIN coins c ON t.coin_id = c.coin_id WHERE 1=1`;

				const params = [];

				if (startDate) {
					query += " AND t.transaction_date >= ?";
					countQuery += " AND t.transaction_date >= ?";
					params.push(startDate);
				}
				if (endDate) {
					query += " AND t.transaction_date <= ?";
					countQuery += " AND t.transaction_date <= ?";
					params.push(endDate);
				}
				if (minValue) {
					query += " AND c.value >= ?";
					countQuery += " AND c.value >= ?";
					params.push(minValue);
				}
				if (maxValue) {
					query += " AND c.value <= ?";
					countQuery += " AND c.value <= ?";
					params.push(maxValue);
				}
				if (buyerName) {
					query += " AND buyer.name LIKE ?";
					countQuery += " AND buyer.name LIKE ?";
					params.push(`%${buyerName}%`);
				}
				if (sellerName) {
					query += " AND seller.name LIKE ?";
					countQuery += " AND seller.name LIKE ?";
					params.push(`%${sellerName}%`);
				}

				query += " ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?";
				params.push(limit, offset);

				const transactions = db.query(query).all(...params);

				const countParams = params.slice(0, params.length - 2);
				const totalCount = db.query(countQuery).get(...countParams)?.total || 0;

				const enhancedTransactions = transactions.map((transaction) => ({
					...transaction,
					computedBitSlow: computeBitSlow(
						transaction.bit1,
						transaction.bit2,
						transaction.bit3,
					),
				}));

				const result = { transactions: enhancedTransactions, totalCount };
				setInCache(cacheKey, result);

				return Response.json({
					transactions: enhancedTransactions,
					totalCount,
				});
			} catch (error) {
				console.error("Error fetching transactions:", error);
				return new Response("Error fetching transactions", { status: 500 });
			}
		},
	},
	development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
