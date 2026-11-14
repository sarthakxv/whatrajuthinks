const MAX_TEXT = 20 * 1024 * 1024;

function inferDateOrder(text) {
  let dayFirst = false,
    monthFirst = false;
  for (const match of text.matchAll(
    /^(?:\[|\w+,?\s+)?(\d{1,4})[./-](\d{1,2})[./-]\d{1,4}(?:,?\s+\d{1,2}:\d{2}|(?:\s*\([^)]*\))?\s*$)/gm,
  )) {
    if (match[1].length === 4) continue;
    if (Number(match[1]) > 12) dayFirst = true;
    if (Number(match[2]) > 12) monthFirst = true;
  }
  if (dayFirst && monthFirst)
    throw new Error(
      "This export mixes day/month and month/day dates. Please export it again using one consistent date format.",
    );
  // shortcut: entirely ambiguous exports default to day/month; add a locale picker if users need to override it.
  return monthFirst ? "mdy" : "dmy";
}

function timestamp(date, time = "00:00", order = "dmy") {
  if (!date) return null;
  const parts = date.trim().split(/[./-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  let year, month, day;
  if (String(parts[0]).length === 4) [year, month, day] = parts;
  else {
    if (order === "mdy") [month, day, year] = parts;
    else [day, month, year] = parts;
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  }
  const clock = time
    .replace(/[\u202f\u00a0]/g, " ")
    .match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!clock) return null;
  let hour = Number(clock[1]);
  if (clock[4]) hour = (hour % 12) + (/pm/i.test(clock[4]) ? 12 : 0);
  const minute = Number(clock[2]),
    second = Number(clock[3] || 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return null;
  const result = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (result.getUTCDate() !== day || result.getUTCMonth() !== month - 1)
    return null;
  return result.toISOString();
}

function jsonMessages(value) {
  const entries = Array.isArray(value)
    ? value
    : (value.messages ?? value.chat?.messages);
  if (!Array.isArray(entries))
    throw new Error("JSON must contain a messages array.");
  return entries
    .map((m) => {
      const sender = m.sender_name ?? m.sender ?? m.author ?? m.from;
      const text = m.content ?? m.text ?? m.message;
      let date = m.timestamp_ms ?? m.timestamp ?? m.date;
      if (typeof date === "number" && date < 1e11) date *= 1000;
      const parsed = date == null ? null : new Date(date);
      return {
        sender: typeof sender === "string" ? sender.trim() : "",
        text: typeof text === "string" ? text.trim() : "",
        timestamp:
          parsed && !Number.isNaN(parsed.getTime())
            ? parsed.toISOString()
            : null,
      };
    })
    .filter((m) => m.sender && m.text);
}

export function parseChat(text, filename = "") {
  if (typeof text !== "string" || !text.trim())
    throw new Error("The chat file is empty.");
  if (Buffer.byteLength(text) > MAX_TEXT)
    throw new Error("The extracted chat must be under 20 MB.");
  text = text
    .replace(/^\uFEFF/, "")
    .replace(/[\u200e\u200f]/g, "")
    .replace(/\r\n?/g, "\n");
  let messages = [],
    format = "text";
  if (/^\s*[\[{]/.test(text)) {
    try {
      messages = jsonMessages(JSON.parse(text));
      format = "json";
    } catch (e) {
      if (/\.json$/i.test(filename))
        throw new Error(`Invalid chat JSON: ${e.message}`);
    }
  }
  if (!messages.length) {
    const dateOrder = inferDateOrder(text);
    let lineDate = null;
    for (const raw of text.split("\n")) {
      let match =
        raw.match(
          /^\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s?(.*)$/i,
        ) ??
        raw.match(
          /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s+-\s+([^:]+):\s?(.*)$/i,
        );
      if (match) {
        messages.push({
          sender: match[3].trim(),
          text: match[4],
          timestamp: timestamp(match[1], match[2], dateOrder),
        });
        format = "whatsapp";
        continue;
      }
      const dateMatch = raw.match(
        /^(?:\w+,?\s+)?(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?:\s*\([^)]*\))?\s*$/,
      );
      if (dateMatch) {
        lineDate = dateMatch[1];
        continue;
      }
      match = raw.match(/^(\d{1,2}:\d{2}(?:\s*[AP]M)?)\t([^\t]+)\t(.*)$/i);
      if (match) {
        messages.push({
          sender: match[2].trim(),
          text: match[3],
          timestamp: timestamp(lineDate, match[1], dateOrder),
        });
        format = "line";
        continue;
      }
      match = raw.match(
        /^\[([^\]]+)\]\s*\[(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]\s?(.*)$/i,
      );
      if (match) {
        messages.push({
          sender: match[1].trim(),
          text: match[3],
          timestamp: timestamp(lineDate, match[2], dateOrder),
        });
        format = "kakaotalk";
        continue;
      }
      // Timestamped system notices are not continuations of another person's words.
      if (/^(?:\[)?\d{1,4}[./-]\d{1,2}[./-]\d{1,4}[,\s]/.test(raw)) continue;
      if (messages.length && raw.trim()) messages.at(-1).text += `\n${raw}`;
    }
  }
  messages = messages
    .filter((m) => m.sender && m.text.trim())
    .map((m) => ({ ...m, text: m.text.trim() }));
  const participants = [...new Set(messages.map((m) => m.sender))];
  if (participants.length < 2)
    throw new Error(
      "We need messages from at least two people. Export a conversation with sender names.",
    );
  if (messages.length < 5)
    throw new Error(
      "Please upload at least five messages so there is something to read.",
    );
  if (participants.some((x) => x.length > 200))
    throw new Error("A participant name is too long. Check the export format.");
  return { messages, participants, format };
}

const STOP_WORDS = new Set(
  "a an the and or but if so to of in on for at by from with as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their not no nor do does did doing done have has had having what which who whom when where why how am im ive id youre youve theyre thats dont cant wont isnt arent wasnt werent omitted media image video sticker audio gif document message deleted".split(
    " ",
  ),
);

function topCounted(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

export function computeStats(messages) {
  const people = new Map(),
    monthly = new Map(),
    daily = new Map(),
    emojis = new Map(),
    hours = Array(24).fill(0);
  let night = 0,
    dated = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!people.has(m.sender))
      people.set(m.sender, {
        name: m.sender,
        messages: 0,
        words: 0,
        questions: 0,
        initiations: 0,
        replies: [],
        wordCounts: new Map(),
        emoji: new Map(),
      });
    const p = people.get(m.sender);
    p.messages++;
    p.words += m.text.split(/\s+/u).filter(Boolean).length;
    p.questions += Number(/[?？]/.test(m.text));
    for (const word of m.text.toLowerCase().match(/\p{L}{2,}/gu) || []) {
      if (STOP_WORDS.has(word)) continue;
      p.wordCounts.set(word, (p.wordCounts.get(word) || 0) + 1);
    }
    const ms = m.timestamp ? Date.parse(m.timestamp) : NaN;
    const prev = messages[i - 1],
      before = prev?.timestamp ? Date.parse(prev.timestamp) : NaN;
    if (Number.isFinite(ms)) {
      const month = m.timestamp.slice(0, 7);
      const day = m.timestamp.slice(0, 10);
      const hour = Number(m.timestamp.slice(11, 13));
      monthly.set(month, (monthly.get(month) || 0) + 1);
      daily.set(day, (daily.get(day) || 0) + 1);
      if (hour >= 0 && hour < 24) {
        hours[hour]++;
        dated++;
        if (hour >= 22 || hour < 5) night++;
      }
      if (
        !prev ||
        (Number.isFinite(before) && ms - before >= 6 * 60 * 60 * 1000)
      )
        p.initiations++;
      if (
        prev &&
        prev.sender !== m.sender &&
        Number.isFinite(before) &&
        ms >= before &&
        ms - before <= 24 * 60 * 60 * 1000
      )
        p.replies.push((ms - before) / 60000);
    }
    for (const emoji of m.text.match(
      /\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu,
    ) || []) {
      emojis.set(emoji, (emojis.get(emoji) || 0) + 1);
      p.emoji.set(emoji, (p.emoji.get(emoji) || 0) + 1);
    }
  }
  const dates = messages
    .map((m) => m.timestamp)
    .filter(Boolean)
    .sort();
  const dailyList = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  let longestStreakDays = dailyList.length ? 1 : 0,
    longestSilenceDays = 0,
    streak = longestStreakDays;
  for (let i = 1; i < dailyList.length; i++) {
    const gap = Math.round(
      (Date.parse(`${dailyList[i].date}T00:00:00Z`) -
        Date.parse(`${dailyList[i - 1].date}T00:00:00Z`)) /
        86400000,
    );
    if (gap === 1) streak++;
    else {
      longestStreakDays = Math.max(longestStreakDays, streak);
      streak = 1;
      if (gap > 1) longestSilenceDays = Math.max(longestSilenceDays, gap - 1);
    }
  }
  longestStreakDays = Math.max(longestStreakDays, streak);
  return {
    messageCount: messages.length,
    wordCount: [...people.values()].reduce((n, p) => n + p.words, 0),
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    participants: [...people.values()].map(
      ({ replies, wordCounts, emoji, ...p }) => {
        replies.sort((a, b) => a - b);
        const middle = Math.floor(replies.length / 2);
        return {
          ...p,
          percentage: Math.round((p.messages / messages.length) * 1000) / 10,
          medianReplyMinutes: replies.length
            ? Math.round(
                (replies.length % 2
                  ? replies[middle]
                  : (replies[middle - 1] + replies[middle]) / 2) * 10,
              ) / 10
            : null,
          topWords: topCounted(wordCounts, 3),
          topEmoji: topCounted(emoji, 3),
        };
      },
    ),
    monthly: [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
    topEmoji: [...emojis.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([emoji, count]) => ({ emoji, count })),
    daily: dailyList,
    hours,
    busiestDay: dailyList.reduce(
      (best, day) => (!best || day.count > best.count ? day : best),
      null,
    ),
    activeDays: dailyList.length,
    longestStreakDays,
    longestSilenceDays,
    nightShare: dated ? night / dated : null,
    busiestHour: dated ? hours.indexOf(Math.max(...hours)) : null,
  };
}

export async function decodeImport({ filename, text, base64 }) {
  if (typeof filename !== "string" || filename.length > 250)
    throw new Error("A valid filename is required.");
  if (typeof text === "string" && !/\.zip$/i.test(filename)) {
    if (Buffer.byteLength(text) > 10 * 1024 * 1024)
      throw new Error("Uploads must be under 10 MB.");
    return text;
  }
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/=\r\n]+$/.test(base64))
    throw new Error("Choose a text, JSON or ZIP chat export.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 10 * 1024 * 1024)
    throw new Error("Uploads must be under 10 MB.");
  if (!/\.zip$/i.test(filename)) return bytes.toString("utf8");
  const { unzipSync } = await import("fflate");
  let total = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      total += file.originalSize;
      if (total > MAX_TEXT)
        throw new Error("The extracted archive must be under 20 MB.");
      return (
        /\.(txt|json)$/i.test(file.name) && !file.name.startsWith("__MACOSX/")
      );
    },
  });
  const entries = Object.entries(files).sort(
    ([a], [b]) =>
      Number(/_chat\.txt$/i.test(b)) - Number(/_chat\.txt$/i.test(a)),
  );
  if (!entries.length)
    throw new Error("No text or JSON chat was found in this ZIP.");
  return new TextDecoder().decode(entries[0][1]);
}
