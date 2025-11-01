import axios from "axios";

import dailySummaries from "./data.json" with { type: "json" };


// // 🔧 Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DATABASE_ID = process.env.DATABASE_ID

// Helper — convert "21 Apr 2025" → "2025-04-21"
function toISODate(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 🔁 Function to create a Notion page
async function createNotionPage(item) {
  try {
    console.log('====================================');
    console.log(item);
    const response = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          database_id: DATABASE_ID,
        },
        properties: {
          id: {
            title: [
              {
                text: {
                  content: item.title,
                },
              },
            ],
          },
          date: {
            date: {
              start: toISODate(item.title),
            },
          },
          Trades: {
            relation: item.trades.map((t) => ({ id: t.id })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-02-22",
        },
      }
    );

    console.log(`✅ Created page for ${item.title}`);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Failed for ${item.title}:`,
      error.response?.data || error.message
    );
  }
}

// 🧩 Create all pages sequentially
async function main() {
  for (const item of dailySummaries.data) {
    await createNotionPage(item);
    await new Promise((r) => setTimeout(r, 1000)); // ⏳ small delay to respect rate limit
  }
  console.log("🎉 All pages created!");
}

main();
