// DOM Elements
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const messagesContainer = document.getElementById("messages");
const messageCount = document.getElementById("messageCount");
const statusEl = document.getElementById("status");

let isLoading = false;
let lastMessageDate = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function setupEventListeners() {
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isLoading) {
      sendMessage();
    }
  });
  clearBtn.addEventListener("click", clearHistory);
}

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) return;
  if (isLoading) return;

  // Add user message to UI
  addMessageToUI("user", message);
  messageInput.value = "";

  // Disable input while loading
  toggleLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get response");
    }

    const data = await response.json();
    addMessageToUI("ai", data.message);
    updateMessageCount(data.historyLength);
  } catch (error) {
    console.error("Error:", error);
    addMessageToUI("ai", `❌ Error: ${error.message}`);
    setStatus("Error", "error");
  } finally {
    toggleLoading(false);
  }
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dateStr = date.toLocaleDateString("ru-RU");
  const todayStr = today.toLocaleDateString("ru-RU");
  const yesterdayStr = yesterday.toLocaleDateString("ru-RU");

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return dateStr;
}

function addDateSeparator(date) {
  const separator = document.createElement("div");
  separator.className = "date-separator";
  separator.innerHTML = `<span>${formatDate(date)}</span>`;
  messagesContainer.appendChild(separator);
}

function parseMessageContent(text) {
  const contentEl = document.createElement("div");
  contentEl.className = "message-text";

  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  parts.forEach((part) => {
    if (part.startsWith("```")) {
      const codeContent = part
        .replace(/^```(\w+)?\n?/m, "")
        .replace(/```$/, "");
      const language = part.match(/^```(\w+)?/)
        ? part.match(/^```(\w+)?/)[1] || ""
        : "";

      const codeBlockEl = document.createElement("div");
      codeBlockEl.className = "code-block";

      if (language) {
        const langEl = document.createElement("div");
        langEl.className = "code-language";
        langEl.textContent = language;
        codeBlockEl.appendChild(langEl);
      }

      const codeEl = document.createElement("pre");
      const codeTextEl = document.createElement("code");
      codeTextEl.textContent = codeContent.trim();
      codeEl.appendChild(codeTextEl);
      codeBlockEl.appendChild(codeEl);

      const copyCodeBtn = document.createElement("button");
      copyCodeBtn.className = "copy-code-btn";
      copyCodeBtn.innerHTML = "📋";
      copyCodeBtn.title = "Copy code";
      copyCodeBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(codeContent.trim()).then(() => {
          const originalText = copyCodeBtn.innerHTML;
          copyCodeBtn.innerHTML = "✅";
          copyCodeBtn.classList.add("copied");
          setTimeout(() => {
            copyCodeBtn.innerHTML = originalText;
            copyCodeBtn.classList.remove("copied");
          }, 2000);
        });
      });
      codeBlockEl.appendChild(copyCodeBtn);

      contentEl.appendChild(codeBlockEl);
    } else if (part.trim()) {
      const lines = part.split(/\r?\n/);
      let ol = null;
      let ul = null;

      function flushLists() {
        if (ol) {
          contentEl.appendChild(ol);
          ol = null;
        }
        if (ul) {
          contentEl.appendChild(ul);
          ul = null;
        }
      }

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          flushLists();
          return;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
        const ulMatch = trimmed.match(/^[-*+]\s+(.*)/);

        if (headingMatch) {
          flushLists();
          const level = Math.min(6, headingMatch[1].length);
          const h = document.createElement(`h${level}`);
          h.className = "md-heading";
          h.textContent = headingMatch[2];
          contentEl.appendChild(h);
        } else if (olMatch) {
          if (!ol) ol = document.createElement("ol");
          const li = document.createElement("li");
          li.textContent = olMatch[1];
          ol.appendChild(li);
        } else if (ulMatch) {
          if (!ul) ul = document.createElement("ul");
          const li = document.createElement("li");
          li.textContent = ulMatch[1];
          ul.appendChild(li);
        } else {
          flushLists();
          const p = document.createElement("div");
          p.className = "md-paragraph";
          p.textContent = trimmed;
          contentEl.appendChild(p);
        }
      });

      flushLists();
    }
  });

  return contentEl;
}

function addMessageToUI(sender, text) {
  const now = new Date();
  const currentDate = now.toLocaleDateString("ru-RU");

  if (lastMessageDate && lastMessageDate !== currentDate) {
    addDateSeparator(now);
  }
  lastMessageDate = currentDate;

  const messageEl = document.createElement("div");
  messageEl.className = `message ${sender}`;

  const messageWrapper = document.createElement("div");
  messageWrapper.className = "message-wrapper";

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "message-bubble";

  const contentEl = parseMessageContent(text);
  bubbleEl.appendChild(contentEl);

  // Add time
  const timeEl = document.createElement("div");
  timeEl.className = "message-time";
  timeEl.textContent = formatTime(now);
  bubbleEl.appendChild(timeEl);

  // Add copy button for AI messages
  if (sender === "ai") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.title = "Copy";
    copyBtn.innerHTML = "📋";
    copyBtn.addEventListener("click", () => copyToClipboard(text, copyBtn));
    bubbleEl.appendChild(copyBtn);
  }

  messageWrapper.appendChild(bubbleEl);

  messageEl.appendChild(messageWrapper);
  messagesContainer.appendChild(messageEl);

  // Auto scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function copyToClipboard(text, btn) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = btn.innerHTML;
      btn.innerHTML = "✅";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove("copied");
      }, 2000);
    })
    .catch(() => {
      btn.innerHTML = "❌";
      setTimeout(() => {
        btn.innerHTML = "📋";
      }, 2000);
    });
}

function updateMessageCount(count) {
  messageCount.textContent = count;
}

function toggleLoading(loading) {
  isLoading = loading;
  sendBtn.disabled = loading;
  messageInput.disabled = loading;

  if (loading) {
    setStatus("Loading...", "loading");
    sendBtn.textContent = "⏳ Sending...";
  } else {
    setStatus("Ready", "ready");
    sendBtn.textContent = "Send";
  }
}

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = `status-${type}`;
}

async function clearHistory() {
  if (confirm("Are you sure you want to clear all messages?")) {
    try {
      const response = await fetch("/api/clear", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      messagesContainer.innerHTML = "";
      lastMessageDate = null;
      messageCount.textContent = "0";
      messageInput.focus();
      setStatus("History cleared", "ready");
    } catch (error) {
      console.error("Error:", error);
      setStatus("Error clearing history", "error");
    }
  }
}

// Focus input on page load
window.addEventListener("load", () => {
  messageInput.focus();
});
