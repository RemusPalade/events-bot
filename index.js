const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const API_URL = "https://mu-beginning.co.il/web/eventTimes";
const CHANNEL_ID = process.env.CHANNEL_ID;
const WARN_BEFORE_SECONDS = 5 * 60;
const CHECK_INTERVAL_MS = 60 * 1000;

// Remove events you don't want alerts for
const ALERT_EVENTS = new Set([
  "White Rabbit",
  "Fire Flame Ghost",
  // "Blood Castle",
  // "Kanturu Event",
  // "Goat",
  "Pouch of Blessing",
  // "Chaos Castle",
  // "Goblin",
  // "Illus.Temple",
  // "Devil Square",
  // "TvT event",
  "Skeleton King",
  // "Red Dragon",
  "Golden Invasion",
  // "White Wizard",
  // "Medusa",
  // "Protector of Acheron",
  // "Boss Battle Together III",
  // "Chicken",
  // "Monkey",
  // "Invocation Demons",
  // "Merchant Zyro",
  // "Boss Battle Together I",
  // "Horse",
  // "Silent Invasion",
  // "Golden Hell Maine",
  // "Nix",
  // "God of Darkness",
  // "Core Magriffy",
  // "Lord Silvestre",
  // "Boss Battle Together II",
  // "Imperial Guardian",
  // "Evomon",
  // "Arka War",
  // "Ferea",
  // "Kalima Kundun",
  // "Moss Merch.",
]);

const activeAlerts = new Map();

function eventKey(event) {
  return `${event.name}:${event.nextAt}`;
}

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return remainingSeconds === 1 ? "1 second" : `${remainingSeconds} seconds`;
  }

  if (remainingSeconds === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const secondLabel =
    remainingSeconds === 1 ? "1 second" : `${remainingSeconds} seconds`;

  return `${minuteLabel} and ${secondLabel}`;
}

async function checkEvents() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const eventsList = data.events ?? [];
    const tracked = eventsList.filter(
      (event) =>
        ALERT_EVENTS.has(event.name) && typeof event.remainSeconds === "number",
    );

    let channel = null;

    for (const event of tracked) {
      const key = eventKey(event);
      const existing = activeAlerts.get(key);
      const isSoon =
        event.remainSeconds > 0 && event.remainSeconds < WARN_BEFORE_SECONDS;

      if (isSoon) {
        const text = `The event **${event.name}** starts in ${formatRemaining(event.remainSeconds)}`;

        if (existing) {
          await existing.edit(text);
          continue;
        }

        if (!channel) {
          channel = await client.channels.fetch(CHANNEL_ID);
          if (!channel || !channel.isTextBased()) {
            return;
          }
        }

        const message = await channel.send(text);
        activeAlerts.set(key, message);
        continue;
      }

      if (existing && event.remainSeconds <= 0) {
        await existing.edit(`The event **${event.name}** has started.`);
        activeAlerts.delete(key);
      }
    }
  } catch (error) {
    console.error("Error checking API:", error);
  }
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  checkEvents();
  setInterval(checkEvents, CHECK_INTERVAL_MS);
});

client.login(process.env.DISCORD_TOKEN);
