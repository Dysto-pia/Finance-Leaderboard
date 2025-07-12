const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1:27017/finance_leaderboard", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const JWT_SECRET = "your_jwt_secret"; // In production, use env variable

// Plaid configuration
// Improved error handling for missing credentials
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

// Check for missing credentials
if (
  !PLAID_CLIENT_ID ||
  PLAID_CLIENT_ID === "replace_with_your_actual_client_id" ||
  !PLAID_SECRET ||
  PLAID_SECRET === "replace_with_your_actual_sandbox_secret"
) {
  console.warn("\n⚠️ WARNING: Missing or invalid Plaid API credentials! ⚠️");
  console.warn("To use Plaid features, you need to:");
  console.warn(
    "1. Sign up for a free account at https://dashboard.plaid.com/signup"
  );
  console.warn("2. Get your client_id and sandbox secret");
  console.warn("3. Add them to your .env file");
  console.warn("4. Restart the server\n");
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
      "PLAID-SECRET": PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// --- Mongoose Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String, // In production, hash passwords!
  plaidAccessToken: { type: String, select: false },
  plaidItemId: { type: String, select: false },
});
const User = mongoose.model("User", userSchema);

// Update leaderboard schema to include financial metrics
const leaderboardSchema = new mongoose.Schema({
  username: String,
  score: Number,
  savings: Number, // Savings rate (income - expenses)/income * 100
  createdAt: { type: Date, default: Date.now },
});
const LeaderboardEntry = mongoose.model("LeaderboardEntry", leaderboardSchema);

// Update the financial data schema to include expense breakdown
const financialDataSchema = new mongoose.Schema({
  username: String,
  income: Number,
  expenses: Number,
  expenseBreakdown: {
    housing: Number,
    utilities: Number,
    food: Number,
    transportation: Number,
    healthcare: Number,
    entertainment: Number,
    other: Number,
  },
  notes: String,
  createdAt: { type: Date, default: Date.now },
});
const FinancialData = mongoose.model("FinancialData", financialDataSchema);

const profileSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  goal: String,
  fullName: String,
  income: Number,
  targetSavingsRate: { type: Number, default: 20 },
  monthlyBudget: Number,
  savingsGoal: Number,
  savingsTimeframe: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Profile = mongoose.model("Profile", profileSchema);

// --- Routes ---

// Register user
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// Login user
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    console.log("Login attempt:", {
      username,
      userFound: !!user,
      passwordLength: password?.length,
      hashedLength: user?.password?.length,
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Handle both hashed and unhashed passwords during transition
    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password);
    } catch (e) {
      // If bcrypt.compare fails, try direct comparison (for old passwords)
      isValid = password === user.password;
      if (isValid) {
        // Update to hashed password
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.updateOne({ _id: user._id }, { password: hashedPassword });
      }
    }

    if (isValid) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });
      res.json({ message: "Login successful", token });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Create link token
app.post("/api/create_link_token", authenticateToken, async (req, res) => {
  try {
    // Check for Plaid credentials before proceeding
    if (
      !PLAID_CLIENT_ID ||
      PLAID_CLIENT_ID === "replace_with_your_actual_client_id" ||
      !PLAID_SECRET ||
      PLAID_SECRET === "replace_with_your_actual_sandbox_secret"
    ) {
      return res.status(500).json({
        error:
          "Plaid API credentials not configured. Please add valid credentials to .env file.",
        missingCredentials: true,
      });
    }

    const username = req.user.username;
    const clientUserId = username;

    // Updated configuration for the link token request
    const request = {
      user: {
        client_user_id: clientUserId,
      },
      client_name: "Finance Leaderboard",
      products: ["transactions"],
      language: "en",
      country_codes: ["US"],
      webhook: process.env.WEBHOOK_URL,
    };

    console.log("Creating link token with request:", JSON.stringify(request));

    const tokenResponse = await plaidClient.linkTokenCreate(request);
    console.log("Link token created successfully");
    res.json(tokenResponse.data);
  } catch (error) {
    console.error("Error creating link token:", error);
    // More detailed error logging
    if (error.response && error.response.data) {
      console.error("Plaid API error details:", error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

// Exchange public token for access token
app.post("/api/exchange_public_token", authenticateToken, async (req, res) => {
  const username = req.user.username;
  const { public_token } = req.body;

  try {
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    // Store access token securely with the user
    await User.findOneAndUpdate(
      { username },
      {
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
      },
      { new: true }
    );

    res.json({ message: "Bank account connected successfully" });
  } catch (error) {
    console.error("Error exchanging token:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction data
app.get("/api/plaid/transactions", authenticateToken, async (req, res) => {
  const username = req.user.username;

  try {
    // Need to include plaidAccessToken in the select fields since it's hidden by default
    const user = await User.findOne({ username }).select("+plaidAccessToken");
    if (!user || !user.plaidAccessToken) {
      return res.status(400).json({ error: "No connected bank account found" });
    }

    // Get transactions from the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const request = {
      access_token: user.plaidAccessToken,
      start_date: startDate,
      end_date: endDate,
    };

    const response = await plaidClient.transactionsGet(request);
    const transactions = response.data.transactions;

    // Process transactions for insights
    const categorizedTransactions =
      processCategorizedTransactions(transactions);

    res.json({
      transactions: transactions.slice(0, 10), // Send only first 10 transactions
      summary: categorizedTransactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Process transactions and categorize them
function processCategorizedTransactions(transactions) {
  // Group by category
  const categories = {};
  let totalExpenses = 0;
  let totalIncome = 0;

  transactions.forEach((transaction) => {
    const amount = transaction.amount;
    const category = transaction.category ? transaction.category[0] : "Other";

    // If negative amount, it's likely income (credit)
    if (amount < 0) {
      totalIncome += Math.abs(amount);
    } else {
      totalExpenses += amount;
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += amount;
    }
  });

  return {
    totalExpenses,
    totalIncome,
    categories,
    savingsRate:
      totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
  };
}

// Add a route to fetch financial insights from Plaid data
app.get("/api/plaid/insights", authenticateToken, async (req, res) => {
  const username = req.user.username;

  try {
    const user = await User.findOne({ username }).select("+plaidAccessToken");
    if (!user || !user.plaidAccessToken) {
      return res.status(400).json({ error: "No connected bank account found" });
    }

    // Get transactions from the last 60 days for better analysis
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const startDate = sixtyDaysAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    const request = {
      access_token: user.plaidAccessToken,
      start_date: startDate,
      end_date: endDate,
    };

    const response = await plaidClient.transactionsGet(request);
    const transactions = response.data.transactions;

    // Generate insights
    const insights = generateFinancialInsights(transactions);
    res.json(insights);
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate insights from transactions
function generateFinancialInsights(transactions) {
  // Group transactions by month
  const monthlyData = {};
  transactions.forEach((transaction) => {
    const month = transaction.date.substring(0, 7); // YYYY-MM format
    if (!monthlyData[month]) {
      monthlyData[month] = { expenses: 0, income: 0, categories: {} };
    }

    const amount = transaction.amount;
    const category = transaction.category ? transaction.category[0] : "Other";

    if (amount < 0) {
      monthlyData[month].income += Math.abs(amount);
    } else {
      monthlyData[month].expenses += amount;
      if (!monthlyData[month].categories[category]) {
        monthlyData[month].categories[category] = 0;
      }
      monthlyData[month].categories[category] += amount;
    }
  });

  // Calculate trends and insights
  const months = Object.keys(monthlyData).sort();
  const trends = {
    savingsRate: [],
    topExpenseCategory: [],
    monthlyIncome: [],
    monthlyExpenses: [],
  };

  months.forEach((month) => {
    const data = monthlyData[month];
    const savingsRate =
      data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;

    const categories = Object.entries(data.categories);
    const topCategory =
      categories.length > 0
        ? categories.reduce((max, item) => (item[1] > max[1] ? item : max))
        : ["None", 0];

    trends.savingsRate.push({ month, value: savingsRate });
    trends.topExpenseCategory.push({
      month,
      category: topCategory[0],
      amount: topCategory[1],
    });
    trends.monthlyIncome.push({ month, value: data.income });
    trends.monthlyExpenses.push({ month, value: data.expenses });
  });

  // Generate text insights
  const textInsights = [];

  // Savings rate trend
  if (trends.savingsRate.length >= 2) {
    const currentSavingsRate =
      trends.savingsRate[trends.savingsRate.length - 1].value;
    const previousSavingsRate =
      trends.savingsRate[trends.savingsRate.length - 2].value;
    const difference = currentSavingsRate - previousSavingsRate;

    if (difference > 5) {
      textInsights.push(
        `Great job! Your savings rate increased by ${difference.toFixed(
          1
        )}% compared to last month.`
      );
    } else if (difference < -5) {
      textInsights.push(
        `Your savings rate decreased by ${Math.abs(difference).toFixed(
          1
        )}% compared to last month.`
      );
    }
  }

  // Spending patterns
  const latestMonth = months[months.length - 1];
  if (monthlyData[latestMonth]) {
    const topCategories = Object.entries(monthlyData[latestMonth].categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (topCategories.length > 0) {
      const percentage =
        (topCategories[0][1] / monthlyData[latestMonth].expenses) * 100;
      textInsights.push(
        `Your highest spending category is ${
          topCategories[0][0]
        } at ${percentage.toFixed(0)}% of your monthly expenses.`
      );
    }
  }

  return {
    trends,
    insights:
      textInsights.length > 0
        ? textInsights
        : ["Collect more transaction data for personalized insights."],
  };
}

// Disconnect Plaid account
app.post("/api/plaid/disconnect", authenticateToken, async (req, res) => {
  const username = req.user.username;

  try {
    const user = await User.findOne({ username }).select(
      "+plaidItemId +plaidAccessToken"
    );

    if (!user || !user.plaidAccessToken) {
      return res.status(400).json({ error: "No connected bank account found" });
    }

    // Remove the access token from our database
    await User.findOneAndUpdate(
      { username },
      {
        $unset: {
          plaidAccessToken: "",
          plaidItemId: "",
        },
      }
    );

    res.json({ message: "Bank account disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting bank account:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
app.get("/api/leaderboard", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const entries = await LeaderboardEntry.find()
    .sort({ score: -1 })
    .skip(skip)
    .limit(limit);

  res.json(entries);
});

// Submit score (JWT protected)
app.post("/api/score", authenticateToken, async (req, res) => {
  const { score } = req.body;
  const username = req.user.username;

  if (
    !username ||
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score <= 0
  ) {
    return res
      .status(400)
      .json({ error: "Username and a positive score are required" });
  }

  try {
    const entry = new LeaderboardEntry({ username, score });
    await entry.save();
    res.json({ message: "Score submitted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit score" });
  }
});

// Submit financial data (JWT protected)
app.post("/api/financial-data", authenticateToken, async (req, res) => {
  const { income, expenses, expenseBreakdown, notes } = req.body;
  const username = req.user.username;

  if (
    typeof income !== "number" ||
    typeof expenses !== "number" ||
    !Number.isFinite(income) ||
    !Number.isFinite(expenses)
  ) {
    return res
      .status(400)
      .json({ error: "Income and expenses must be numbers" });
  }

  try {
    console.log(
      `Processing financial data for ${username}: Income=${income}, Expenses=${expenses}`
    );

    // Save the financial data entry with expense breakdown if provided
    const entry = new FinancialData({
      username,
      income,
      expenses,
      expenseBreakdown: expenseBreakdown || null,
      notes,
    });
    await entry.save();

    // Calculate score based on savings rate
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const score = Math.max(0, Math.round(savingsRate * 10)); // Example scoring: 10 points per % saved

    console.log(
      `Calculated savings rate: ${savingsRate.toFixed(2)}%, Score: ${score}`
    );

    // Create a new leaderboard entry
    const leaderboardEntry = new LeaderboardEntry({
      username,
      score,
      savings: parseFloat(Math.max(0, savingsRate).toFixed(2)),
    });
    await leaderboardEntry.save();

    console.log(
      `Created leaderboard entry: ${JSON.stringify(leaderboardEntry)}`
    );

    res.json({
      message: "Financial data submitted and leaderboard updated",
      score,
      savings: Math.max(0, savingsRate).toFixed(2),
    });
  } catch (err) {
    console.error("Failed to submit financial data:", err);
    res.status(500).json({ error: "Failed to submit financial data" });
  }
});

// Get profile (JWT protected)
app.get("/api/profile", authenticateToken, async (req, res) => {
  const username = req.user.username;

  try {
    const profile = await Profile.findOne({ username });

    if (!profile) {
      return res.json({
        goal: "",
        fullName: "",
        targetSavingsRate: 20,
      });
    }

    res.json({
      goal: profile.goal || "",
      fullName: profile.fullName || "",
      income: profile.income || null,
      targetSavingsRate: profile.targetSavingsRate || 20,
      monthlyBudget: profile.monthlyBudget || null,
      savingsGoal: profile.savingsGoal || null,
      savingsTimeframe: profile.savingsTimeframe || null,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile data" });
  }
});

// Set profile (JWT protected)
app.post("/api/profile", authenticateToken, async (req, res) => {
  const username = req.user.username;
  const {
    goal,
    fullName,
    income,
    targetSavingsRate,
    monthlyBudget,
    savingsGoal,
    savingsTimeframe,
  } = req.body;

  try {
    const updatedProfile = await Profile.findOneAndUpdate(
      { username },
      {
        goal,
        fullName,
        income,
        targetSavingsRate,
        monthlyBudget,
        savingsGoal,
        savingsTimeframe,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Profile updated",
      profile: {
        goal: updatedProfile.goal,
        fullName: updatedProfile.fullName,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get personalized lessons
app.get("/api/lessons", authenticateToken, async (req, res) => {
  const username = req.user.username;

  try {
    // Get user's financial profile
    const profile = await Profile.findOne({ username });
    const financialData = await FinancialData.find({ username })
      .sort({ createdAt: -1 })
      .limit(3);

    // Calculate spending and saving patterns
    let spendingHabit = "balanced";
    let hasGoal = false;
    let goalKeywords = [];

    if (financialData.length > 0) {
      const avgIncome =
        financialData.reduce((sum, entry) => sum + entry.income, 0) /
        financialData.length;
      const avgExpenses =
        financialData.reduce((sum, entry) => sum + entry.expenses, 0) /
        financialData.length;

      if (avgExpenses > avgIncome * 0.9) {
        spendingHabit = "overspending";
      } else if (avgExpenses < avgIncome * 0.6) {
        spendingHabit = "saving";
      }
    }

    // Extract keywords from goal
    if (profile?.goal) {
      hasGoal = true;
      const goal = profile.goal.toLowerCase();

      if (goal.includes("save") || goal.includes("saving"))
        goalKeywords.push("saving");
      if (goal.includes("invest") || goal.includes("investing"))
        goalKeywords.push("investing");
      if (goal.includes("debt") || goal.includes("loan"))
        goalKeywords.push("debt");
      if (goal.includes("budget") || goal.includes("spending"))
        goalKeywords.push("budgeting");
      if (goal.includes("retire") || goal.includes("future"))
        goalKeywords.push("retirement");
    }

    // Select appropriate lessons
    const lessons = [];

    // Always include a lesson based on spending habit
    if (spendingHabit === "overspending") {
      lessons.push({
        title: "Managing Overspending",
        content:
          "You're spending most of your income. Try using the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings and debt repayment.",
      });
    } else if (spendingHabit === "saving") {
      lessons.push({
        title: "Optimizing Your Savings",
        content:
          "Great job saving! Consider putting your extra savings into different buckets: emergency fund, short-term goals, and long-term investments.",
      });
    } else {
      lessons.push({
        title: "Maintaining Financial Balance",
        content:
          "You have a good balance between spending and saving. Focus on consistently building your emergency fund and increasing investment contributions.",
      });
    }

    // Add lessons based on goal keywords
    if (goalKeywords.includes("saving")) {
      lessons.push({
        title: "Boosting Your Savings Rate",
        content:
          "Try the 24-hour rule before making non-essential purchases to reduce impulse buying and increase your savings rate.",
      });
    }

    if (goalKeywords.includes("investing")) {
      lessons.push({
        title: "Investment Fundamentals",
        content:
          "Start with low-cost index funds that give you broad market exposure before considering individual stocks or more complex investments.",
      });
    }

    if (goalKeywords.includes("debt")) {
      lessons.push({
        title: "Strategic Debt Repayment",
        content:
          "Use either the avalanche method (highest interest first) or snowball method (smallest balance first) to systematically eliminate debt.",
      });
    }

    if (goalKeywords.includes("budgeting")) {
      lessons.push({
        title: "Zero-Based Budgeting",
        content:
          "Assign every dollar of income a purpose (spending, saving, investing) to ensure you're making the most of your money.",
      });
    }

    if (goalKeywords.includes("retirement")) {
      lessons.push({
        title: "Retirement Planning Basics",
        content:
          "Start early and be consistent. Even small regular contributions to retirement accounts can grow significantly over time due to compound interest.",
      });
    }

    // If no specific goal or not enough lessons, add general lessons
    if (lessons.length < 3) {
      const generalLessons = [
        {
          title: "Emergency Fund Fundamentals",
          content:
            "Aim to save 3-6 months of essential expenses in an easily accessible account for unexpected situations.",
        },
        {
          title: "Understanding Credit Scores",
          content:
            "Payment history and credit utilization have the biggest impact on your score. Always pay on time and keep balances low.",
        },
        {
          title: "Automation is Your Friend",
          content:
            "Automate bill payments and savings transfers to ensure consistency and avoid late fees or missed savings opportunities.",
        },
        {
          title: "Tax-Efficient Investing",
          content:
            "Maximize contributions to tax-advantaged accounts like 401(k)s and IRAs before investing through standard taxable accounts.",
        },
      ];

      // Add general lessons until we have at least 3
      let i = 0;
      while (lessons.length < 3 && i < generalLessons.length) {
        lessons.push(generalLessons[i]);
        i++;
      }
    }

    res.json({
      lessons,
      profile: {
        hasGoal,
        spendingHabit,
      },
    });
  } catch (err) {
    console.error("Error generating lessons:", err);
    res.status(500).json({ error: "Failed to generate lessons" });
  }
});

// Get recent progress/insights for dashboard
app.get("/api/financial-data/recent", authenticateToken, async (req, res) => {
  const username = req.user.username;
  try {
    // Get most recent score entry
    const lastScoreEntry = await LeaderboardEntry.findOne({ username }).sort({
      _id: -1,
    });

    // Get most recent financial data
    const lastFinEntry = await FinancialData.findOne({ username }).sort({
      createdAt: -1,
    });

    // Generate insight based on income/expense ratio
    let insight = null;
    if (lastFinEntry && lastFinEntry.income && lastFinEntry.expenses) {
      if (lastFinEntry.income > lastFinEntry.expenses * 1.5) {
        insight = "Great job! You're saving more than 33% of your income.";
      } else if (lastFinEntry.income > lastFinEntry.expenses) {
        insight = "You're saving money, but try to increase your savings rate.";
      } else if (lastFinEntry.income === lastFinEntry.expenses) {
        insight = "You're breaking even. Look for ways to reduce expenses.";
      } else {
        insight = "Watch out! Your expenses exceed your income.";
      }
    }

    // Return the data
    res.json({
      lastScore: lastScoreEntry?.score,
      lastIncome: lastFinEntry?.income,
      lastExpenses: lastFinEntry?.expenses,
      insight,
    });
  } catch (err) {
    console.error("Error fetching recent data:", err);
    res.status(500).json({ error: "Failed to fetch recent data" });
  }
});

// Temporary route to clear users (for dev only)
app.post("/api/dev/clear-users", async (req, res) => {
  await User.deleteMany({});
  res.json({ message: "All users deleted" });
});

// Temporary route to clear leaderboard (for dev only)
app.post("/api/dev/clear-leaderboard", async (req, res) => {
  await LeaderboardEntry.deleteMany({});
  res.json({ message: "Leaderboard cleared" });
});

// Temporary route to clear financial data (for dev only)
app.post("/api/dev/clear-financial-data", async (req, res) => {
  await FinancialData.deleteMany({});
  res.json({ message: "Financial data cleared" });
});

// Temporary route to reset everything (for dev only)
app.post("/api/dev/reset-all", async (req, res) => {
  await LeaderboardEntry.deleteMany({});
  await FinancialData.deleteMany({});
  await Profile.deleteMany({});
  await User.deleteMany({});
  res.json({ message: "All data reset" });
});

// Test route to check API is working
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", message: "API is working" });
});

app.get("/", (req, res) => {
  res.send("Finance Leaderboard API");
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
