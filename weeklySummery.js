import { Client } from "@notionhq/client";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";

dayjs.extend(isoWeek);

const notion = new Client({
  auth: "",
});

const TRADES_DB_ID = "1c3a0156-6265-8147-a2d9-000b1a29866b";
const WEEKLY_DB_ID = "29ea0156-6265-80d3-a06d-000bf5c3074d";

function getWeekStart(date) {
  if (!date) {
    console.error("❌ getWeekStart called with empty date");
    return null;
  }

  const d = new Date(date);
  if (isNaN(d)) {
    console.error("❌ Invalid date format passed to getWeekStart:", date);
    return null;
  }

  const day = d.getDay(); // 0 (Sun) → 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday-based
  const monday = new Date(d.setDate(diff));

  return monday.toISOString().split("T")[0]; // ✅ "YYYY-MM-DD"
}

async function getAllPages() {
  let results = [];
  let cursor = undefined;
  console.log(TRADES_DB_ID);

  do {
    const response = await notion.dataSources.query({
      data_source_id: TRADES_DB_ID,

      start_cursor: cursor,
      page_size: 50,
    });
    results = results.concat(response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

async function findOrCreateWeeklySummary(dateprop) {
  const weekNumber = dayjs(dateprop).isoWeek();
  const year = dayjs(dateprop).year();
  const weekLabel = `${year} - Week ${weekNumber}`;

  const weekStart = getWeekStart(dateprop);
  console.log(weekStart);

  console.log("====================================");
  console.log(weekLabel);
  console.log("====================================");

  const response = await notion.dataSources.query({
    data_source_id: WEEKLY_DB_ID,
    filter: {
      property: "Name",
      title: {
        equals: weekLabel,
      },
    },
  });

  if (response.results.length > 0) {
    return response.results[0];
  }

  const newPage = await notion.pages.create({
    parent: { data_source_id: WEEKLY_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: weekLabel } }],
      },
      Week: {
        date: { start: weekStart },
      },
    },
  });

  return newPage;
}

async function linkTradesToWeeklySummary() {
  console.log("Fetching all trades...");
  const trades = await getAllPages();

  for (const trade of trades) {
    const dateProp = trade.properties["Date"]?.date?.start;
    if (!dateProp) continue;

    const weeklySummaryId = await findOrCreateWeeklySummary(dateProp);
    console.log("====================================");
    console.log(trade.id);
    console.log(weeklySummaryId["id"]);

    console.log("====================================");

    // Update the trade’s relation
    await notion.pages.update({
      page_id: trade.id,
      properties: {
        "Weekly Summery": {
          relation: [{ id: weeklySummaryId["id"] }],
        },
      },
    });

    console.log(`✅ Linked ${trade.properties["Trade"].title[0].plain_text} `);
  }
}

linkTradesToWeeklySummary()
  .then(() => console.log("🎯 All trades linked successfully!"))
  .catch(console.error.name);
