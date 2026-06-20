// controllers/aiController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');
require('dotenv').config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ── 1. AUTO-GENERATED PRODUCT DESCRIPTIONS ───────────────────────────
async function generateDescription(req, res) {
  try {
    const { name, category, specs } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Product name and category are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    const prompt = `You are an expert copywriter for a premium health and fitness supplement store. Generate an engaging, professional, and SEO-friendly product description for a product.
Product Name: ${name}
Category: ${category}
Key Specifications/Notes: ${specs || 'None provided'}

Output ONLY the description in clear, readable paragraphs or bullet points. Do not include markdown headers (#) or intro/outro conversational text. Keep it focused on the customer benefits.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ description: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── 2. PERSONALIZED DIET & MACRO ADVISOR ─────────────────────────────
async function getMacroAdvice(req, res) {
  try {
    const { weight, age, height, goal } = req.body;
    if (!weight || !age || !height || !goal) {
      return res.status(400).json({ error: 'weight, age, height, and goal are required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    const wt = parseFloat(weight);
    const ageNum = parseInt(age);
    const ht = parseFloat(height);

    // Standard Miffln-St Jeor formula assuming active lifestyle (1.375 multiplier)
    const bmr = (10 * wt) + (6.25 * ht) - (5 * ageNum) + 5;
    const tdee = Math.round(bmr * 1.375);

    let targetCalories = tdee;
    let targetProtein = Math.round(wt * 2.0); // 2g/kg default

    if (goal === 'muscle_gain') {
      targetCalories = Math.round(tdee + 400);
      targetProtein = Math.round(wt * 2.2);
    } else if (goal === 'fat_loss') {
      targetCalories = Math.round(tdee - 400);
      targetProtein = Math.round(wt * 1.8);
    }

    const targetCarbs = Math.round((targetCalories * 0.45) / 4);
    const targetFats = Math.round((targetCalories * 0.25) / 9);

    // Fetch instock products to feed as filtered context
    const [products] = await db.query(
      'SELECT product_id, name, category, price, description FROM Products WHERE in_stock = 1'
    );

    const productsList = products.map(p => ({
      id: p.product_id,
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description
    }));

    const prompt = `You are an AI Supplement & Nutrition Coach for a premium supplement store. A customer has calculated their macro targets:
- Weight: ${wt} kg
- Height: ${ht} cm
- Age: ${ageNum} years
- Daily Calories: ${targetCalories} kcal
- Daily Protein: ${targetProtein} g
- Daily Carbs: ${targetCarbs} g
- Daily Fats: ${targetFats} g
- Fitness Goal: ${goal.replace('_', ' ')}

Here are the products currently in our store inventory:
${JSON.stringify(productsList)}

Briefly explain how they can hit their macro targets and recommend 2-3 specific products from our inventory list that best align with their goal. Provide a brief rationale for each choice. Keep your response encouraging, friendly, and formatted in clean markdown bullet points. Recommend ONLY products from the list provided.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({
      macros: {
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fats: targetFats
      },
      advice: text.trim()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── 3. NATURAL LANGUAGE SEARCH PARSER ────────────────────────────────
async function parseNaturalSearch(req, res) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    const categories = ['Whey Protein', 'Whey Isolate', 'Creatine', 'Omega-3', 'Amino Acids', 'Mass Gainer', 'Pre-Workout', 'Plant Protein', 'Vitamins'];

    const prompt = `You are a translation assistant that converts natural language shopping queries for a protein store into structured filter parameters.

Available product categories:
${JSON.stringify(categories)}

Parse this query: '${query}'

Output a JSON object with the following fields (omit fields that are not mentioned or implied by the query):
{
  "search": string (any search keywords like flavors, e.g. 'chocolate', or brand like 'ON'),
  "category": string (must match one of the categories above EXACTLY if category is implied),
  "min_price": number,
  "max_price": number,
  "sort": string (must be either 'price_asc', 'price_desc', or 'newest')
}

Output ONLY valid JSON. Do not include markdown block ticks (e.g. \`\`\`json) or any additional text. Your output must be directly parseable by JSON.parse().`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean markdown wraps if the model ignores instructions
    if (text.startsWith('```')) {
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.warn("JSON Parse failed for Gemini output:", text);
      return res.status(422).json({ error: 'Could not structure query' });
    }

    // Safety Validation & Allow-List Enforcement
    const validated = {};
    if (parsed.search && typeof parsed.search === 'string') {
      // Basic sanitization
      validated.search = parsed.search.replace(/[^\w\s-]/g, '').trim();
    }
    if (parsed.category && categories.includes(parsed.category)) {
      validated.category = parsed.category;
    }
    if (parsed.min_price && !isNaN(parseFloat(parsed.min_price))) {
      validated.min_price = Math.max(0, parseFloat(parsed.min_price));
    }
    if (parsed.max_price && !isNaN(parseFloat(parsed.max_price))) {
      validated.max_price = Math.max(0, parseFloat(parsed.max_price));
    }
    if (parsed.sort && ['price_asc', 'price_desc', 'newest'].includes(parsed.sort)) {
      validated.sort = parsed.sort;
    }

    res.json(validated);
  } catch (err) {
    if (err.message && (err.message.includes('API key not valid') || err.message.includes('not found') || err.message.includes('not supported'))) {
      return res.status(503).json({ error: 'Gemini API Key is not configured or is invalid for this model.' });
    }
    res.status(500).json({ error: err.message });
  }
}

// ── 4. CUSTOMER SUPPORT CHATBOT (FAQ, Product recommender, Order Lookup) ──
async function chatSupport(req, res) {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    // 1. Fetch active products for recommendations context
    const [products] = await db.query(
      'SELECT name, category, price FROM Products WHERE in_stock = 1'
    );
    const productsList = products.map(p => ({
      name: p.name,
      category: p.category,
      price: p.price
    }));

    // 2. User-scoped Order lookup
    let orderContext = null;
    const orderMatch = message.match(/#?(\d+)/);
    if (orderMatch) {
      const orderId = parseInt(orderMatch[1]);
      if (req.user) {
        const [orders] = await db.query(
          `SELECT o.order_id, o.status, o.total_amount, o.created_at,
                  (SELECT GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) SEPARATOR ', ')
                   FROM Order_Items oi JOIN Products p ON oi.product_id = p.product_id
                   WHERE oi.order_id = o.order_id) as items
           FROM Orders o
           WHERE o.user_id = ? AND o.order_id = ?`,
          [req.user.user_id, orderId]
        );
        if (orders.length > 0) {
          orderContext = orders[0];
        } else {
          orderContext = { error: `Order #${orderId} was not found under your account.` };
        }
      } else {
        orderContext = { error: "User is not logged in. Tell them to log in first to check order status." };
      }
    }

    // 3. Define the instructions
    const systemPrompt = `You are a helpful customer support chatbot for FitFuel.
- You can recommend supplements, answer FAQs, or discuss order status.
- Current active inventory: ${JSON.stringify(productsList)}
- User login status: ${req.user ? `Logged in as user_id ${req.user.user_id}` : 'Guest (Not logged in)'}
${orderContext ? `- Order Context details from DB: ${JSON.stringify(orderContext)}` : ''}

Rules:
1. If the user is checking order status and is not logged in, politely inform them that they must log in first.
2. If order details are provided in the Order Context, summarize the status, items, and total price. If the context says the order was not found, explain that politely.
3. Keep answers concise, helpful, and friendly.
4. You cannot modify, cancel, or refund orders. If the user asks for edits, explain that they should email support@fitfuel.com.
5. Recommend ONLY products that are present in the inventory list.`;

    // 4. Construct prompt including history
    let contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];
    if (history && Array.isArray(history)) {
      history.forEach(h => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    res.json({ reply: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── 5. ADMIN ANALYTICS ASSISTANT (Natural Language to SQL) ────────────
async function adminQuery(req, res) {
  let generatedSql = null;
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    // Explicit Allow-List of tables/views context (Excludes Users / passwords)
    const schemaContext = `
Available Database Tables & Columns:
1. Products (product_id, name, category, price, stock, in_stock, low_stock, created_at)
2. Orders (order_id, user_id, total_amount, status, created_at)
   - Note: status can be 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'. Use status != 'cancelled' for valid revenue calculations.
3. Order_Items (order_item_id, order_id, product_id, quantity, price)
4. Payments (payment_id, order_id, amount, payment_method, status, paid_at)
   - Note: status can be 'pending', 'success', 'failed'. 'success' indicates a completed/paid transaction.
5. vw_product_stock_status (product_id, name, category, price, stock, in_stock, low_stock, stock_status)
   - Note: stock_status can be 'In Stock', 'Low Stock', 'Out of Stock'.
6. vw_order_summary (order_id, created_at, order_status, total_amount, customer_name, customer_email, payment_method, payment_status, paid_at)
   - Note: order_status uses the same values as Orders.status.
   - Note: payment_status uses the same values as Payments.status ('success' represents successful/paid payments; do not use 'paid').
`;

    const prompt = `You are a MySQL database expert translating natural language reporting questions into valid SELECT queries.
Schema context:
${schemaContext}

User Question: "${query}"

Rules:
1. Generate ONLY a single MySQL SELECT query that answers the question.
2. DO NOT use table or column names that are not in the schema context above. Specifically, do not reference the Users table or query passwords.
3. Return ONLY the raw SQL query. Do NOT write any code blocks, backticks (e.g. \`\`\`sql), comments, or explanation text.
4. Keep the query clean and optimized.`;

    const result = await model.generateContent(prompt);
    generatedSql = result.response.text().trim();

    // Clean backticks
    if (generatedSql.startsWith('```')) {
      generatedSql = generatedSql.replace(/```sql/gi, '').replace(/```/g, '').trim();
    }

    // Safety Checks (Application Layer Guardrails)
    const cleanSql = generatedSql.toLowerCase();
    
    // Rule A: Must start with SELECT
    if (!cleanSql.startsWith('select')) {
      return res.status(400).json({ 
        error: 'Security block: Generated query is not a read-only SELECT statement.',
        generatedSql 
      });
    }

    // Rule B: Reject modifying statements
    const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'grant', 'replace', 'rename'];
    for (const kw of forbiddenKeywords) {
      if (cleanSql.includes(kw)) {
        return res.status(400).json({ 
          error: `Security block: Generated query contains forbidden keyword: "${kw}".`,
          generatedSql 
        });
      }
    }

    // Rule C: Force execution timeout (5s) and row limit (500)
    // Strip trailing semicolon from the generated SQL first
    const baseSql = generatedSql.replace(/;+$/, '');
    const wrappedQuery = `SELECT /*+ MAX_EXECUTION_TIME(5000) */ * FROM (${baseSql}) as admin_report_sub LIMIT 500`;

    // Run using reporter pool
    const reporterDb = db.reporterDb;
    const [rows] = await reporterDb.query(wrappedQuery);

    res.json({
      query: generatedSql,
      rows
    });
  } catch (err) {
    res.status(500).json({ 
      error: 'Query execution failed: ' + err.message,
      query: generatedSql
    });
  }
}

module.exports = { generateDescription, getMacroAdvice, parseNaturalSearch, chatSupport, adminQuery };
