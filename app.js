require("dotenv").config();
const axios = require("axios");
const readline = require("readline");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Allow selecting a model via env var. Default to a modern OpenRouter model.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
// Optional specialized models
const OPENROUTER_CODE_MODEL = process.env.OPENROUTER_CODE_MODEL || "gpt-4";
const OPENROUTER_FAST_MODEL =
  process.env.OPENROUTER_FAST_MODEL || OPENROUTER_MODEL;

if (!OPENROUTER_API_KEY) {
  console.error("❌ Error: OPENROUTER_API_KEY is not set in .env file");
  console.log(
    "Please create a .env file with: OPENROUTER_API_KEY=your_api_key_here",
  );
  process.exit(1);
}

// Store conversation history
const conversationHistory = [];
const MAX_HISTORY = 10;

// Function to send message to OpenRouter API
async function sendMessageToOpenRouter(userMessage) {
  try {
    // Add user message to history
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Keep history within limit
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(
        0,
        Math.max(1, conversationHistory.length - MAX_HISTORY),
      );
    }

    // choose model automatically based on message content
    function pickModelForMessage(msg) {
      const codeHints =
        /```|<\/?\w+>|\bfunction\b|\bclass\b|\bdef\b|\bimport\b|console\.log|\bкод\b|\bscript\b/i;
      if (codeHints.test(msg) || msg.length > 300) return OPENROUTER_CODE_MODEL;
      return OPENROUTER_FAST_MODEL;
    }

    const modelToUse = pickModelForMessage(userMessage);

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: modelToUse,
        messages: conversationHistory,
        temperature: 0.7,
        top_p: 1,
        top_k: 0,
        repetition_penalty: 1,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Chat App",
          "X-Model-Used": modelToUse,
        },
      },
    );

    const aiMessage = response.data.choices[0].message.content;

    // Add AI response to history
    conversationHistory.push({
      role: "assistant",
      content: aiMessage,
    });

    return aiMessage;
  } catch (error) {
    console.error(
      "OpenRouter API Error:",
      error.response?.data || error.message,
    );
    throw new Error("Failed to get response from AI");
  }
}

// Clear conversation history
function clearHistory() {
  conversationHistory.length = 0;
  console.log("✓ Conversation history cleared");
}

// REST API endpoint for chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await sendMessageToOpenRouter(message);
    res.json({
      message: response,
      historyLength: conversationHistory.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation history
app.get("/api/history", (req, res) => {
  res.json({ history: conversationHistory });
});

// Clear history endpoint
app.post("/api/clear", (req, res) => {
  clearHistory();
  res.json({ message: "History cleared" });
});

// Serve index page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// CLI Mode - Interactive chat
async function startCLIChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🤖 AI Chat Application (CLI Mode)");
  console.log(
    'Type your message and press Enter. Type "clear" to clear history, "exit" to quit.',
  );
  console.log("─".repeat(50));

  const askQuestion = () => {
    rl.question("\nYou: ", async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === "exit") {
        console.log("👋 Goodbye!");
        rl.close();
        process.exit(0);
      }

      if (userInput.toLowerCase() === "clear") {
        clearHistory();
        askQuestion();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      try {
        console.log("\n⏳ Waiting for response...");
        const response = await sendMessageToOpenRouter(userInput);
        console.log("\n🤖 AI:", response);
      } catch (error) {
        console.error("\n❌ Error:", error.message);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Start server and CLI
if (require.main === module) {
  // Check if running in web mode or CLI mode
  const args = process.argv.slice(2);

  if (args.includes("--web") || args.includes("-w")) {
    // Web mode - Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Web server is running at http://localhost:${PORT}`);
      console.log("📝 API endpoint: POST /api/chat");
      console.log("📚 Get history: GET /api/history");
      console.log("🗑️  Clear history: POST /api/clear");
    });
  } else {
    // Default - CLI mode
    startCLIChat();
  }
}

module.exports = app;
