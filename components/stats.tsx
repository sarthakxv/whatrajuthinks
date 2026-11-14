"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useApi, num } from "@/lib/client";
import type { Conversation, Report, Stats } from "@/lib/types";
import { Icon, LoadingView, PageError } from "./ui";

const COLORS = ["#ff90e8", "#ffc900", "#7ee0b5", "#c4b5fd", "#ffb38a"];
const MINT = { background: "#b9f3e0", color: "#17343d" };
const LILAC = { background: "#d8c9ff", color: "#3e1a7a" };
const ROSE = { background: "#ffc3d1", color: "#9a0a3a" };
const PEACH = { background: "#ffcfb5", color: "#6b3000" };
const CREAM = { background: "#fdedb0", color: "#5a4a00" };
const NIGHT = { background: "#141a33", color: "#fff3c4" };

type Person = Stats["participants"][number];

function colorAt(index: number) {
  return COLORS[index % COLORS.length];
}

function percent(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

function personName(name: string, count: number, you?: string | null) {
  return count === 2 && you && name === you ? "You" : name;
}

function replyParts(minutes: number) {
  if (minutes < 1) return { n: "< 1", unit: "min" };
  if (minutes < 60)
    return { n: new Intl.NumberFormat("en-GB").format(Math.round(minutes)), unit: "min" };
  return {
    n: new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(minutes / 60),
    unit: "hr",
  };
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="stat-dot"
      aria-hidden="true"
      style={{
        background: color,
        borderColor: `color-mix(in oklab, ${color} 78%, black)`,
      }}
    />
  );
}

function Who({ name, color }: { name: string; color: string }) {
  return (
    <div className="stat-who">
      <Dot color={color} />
      <bdi>{name}</bdi>
    </div>
  );
}

function Figure({
  n,
  unit,
  color,
}: {
  n: string;
  unit?: string;
  color?: string;
}) {
  return (
    <span className="stat-figure">
      {n}
      {unit ? (
        <>
          {" "}
          {color ? (
            <span className="stat-figure-name">
              <Dot color={color} />
              <bdi>{unit}</bdi>
            </span>
          ) : (
            <span className="stat-figure-unit">{unit}</span>
          )}
        </>
      ) : null}
    </span>
  );
}

function Card({
  tint,
  label,
  children,
}: {
  tint: { background: string; color: string };
  label: string;
  children: ReactNode;
}) {
  return (
    <article className="stat-card" style={tint}>
      <h3>
        <bdi>{label}</bdi>
      </h3>
      <div className="stat-card-body">{children}</div>
    </article>
  );
}

function ShareRing({
  slices,
  size,
}: {
  slices: { value: number; color: string }[];
  size: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg
      className="stat-ring"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {slices.length === 2 ? (
        <>
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={slices[1].color}
            strokeWidth="30"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={slices[0].color}
            strokeWidth="30"
            strokeDasharray={`${(slices[0].value / total) * circ} ${circ}`}
            transform="rotate(-90 100 100)"
          />
        </>
      ) : (
        slices.map((slice, index) => {
          const length = (slice.value / total) * circ;
          const circle = (
            <circle
              key={index}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="30"
              strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 100 100)"
            />
          );
          offset += length;
          return circle;
        })
      )}
    </svg>
  );
}

function YearHeatmap({ daily }: { daily: { date: string; count: number }[] }) {
  const counts = new Map(daily.map((day) => [day.date, day.count]));
  const max = Math.max(1, ...daily.map((day) => day.count));
  const today = new Date().toISOString().slice(0, 10);
  const startYear = Number(daily[0]?.date.slice(0, 4) ?? today.slice(0, 4));
  const endYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat("en-GB", {
      month: "narrow",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2020, month, 15))),
  );
  const gutter = 4;
  const width = gutter + 114.7;
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    const monthCount = year === endYear ? currentMonth + 1 : 12;
    const cells = [];
    for (let month = 0; month < monthCount; month++) {
      const y = (3.7 * month).toFixed(1);
      cells.push(
        <text
          key={`${year}-${month}-label`}
          x="0"
          y={(3.7 * month + 2.7).toFixed(1)}
          fontSize="2.6"
          fontWeight="600"
          fontFamily="inherit"
          fill="currentColor"
          opacity="0.5"
        >
          {months[month]}
        </text>,
      );
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day++) {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (date > today) break;
        const x = (gutter + (day - 1) * 3.7).toFixed(1);
        const count = counts.get(date) ?? 0;
        cells.push(
          <rect
            key={`${date}-empty`}
            x={x}
            y={y}
            width="3"
            height="3"
            rx="0.6"
            fill="#fff"
            opacity="0.1"
          />,
        );
        if (count > 0) {
          cells.push(
            <rect
              key={date}
              x={x}
              y={y}
              width="3"
              height="3"
              rx="0.6"
              fill="#ffd166"
              opacity={(0.35 + 0.65 * Math.sqrt(count / max)).toFixed(2)}
            >
              <title>{`${longDate(date)}: ${num(count)} messages`}</title>
            </rect>,
          );
        }
      }
    }
    years.push(
      <div key={year}>
        <p className="stat-year">{year}</p>
        <svg
          viewBox={`0 0 ${width} ${3.7 * monthCount}`}
          className="stat-heat"
          role="img"
          aria-label={`${year} message calendar`}
        >
          {cells}
        </svg>
      </div>,
    );
  }
  return <div className="stat-years">{years}</div>;
}

export function ChatStats({
  stats,
  you,
}: {
  stats: Stats;
  you?: string | null;
}) {
  const people = [...stats.participants].sort(
    (a, b) => b.messages - a.messages || a.name.localeCompare(b.name),
  );
  const named = (person: Person) => personName(person.name, people.length, you);
  const total = stats.messageCount || 1;
  const starts = people.reduce((sum, person) => sum + person.initiations, 0);
  const replies = people.filter((person) => person.medianReplyMinutes !== null);
  const daily = stats.daily ?? [];
  const hours = stats.hours ?? [];
  const showHours =
    hours.length === 24 && stats.busiestHour != null && stats.nightShare != null;
  const activeDays = stats.activeDays ?? daily.length;
  const silence = stats.longestSilenceDays ?? 0;
  const streak = stats.longestStreakDays ?? 0;
  const wordPeople = people.filter((person) => (person.topWords?.length ?? 0) > 0);
  const emojiPeople = people.filter((person) => (person.topEmoji?.length ?? 0) > 0);
  const pair = people.length === 2;
  const firstShare = people[0] ? people[0].messages / total : 0;

  return (
    <>
      {daily.length > 0 && (
        <section className="stat-section">
          <div>
            <h2>Your years, day by day.</h2>
            <p className="stat-lead">
              One square per day. The brighter, the more you talked.
            </p>
          </div>
          <Card tint={NIGHT} label="Calendar">
            <YearHeatmap daily={daily} />
          </Card>
        </section>
      )}
      <section className="stat-section">
        <h2>Who talks, who starts.</h2>
        <div className="stat-stack">
          {pair && (
            <Card tint={MINT} label="Messages">
              <div className="stat-pair">
                {people.map((person, index) => (
                  <div key={person.name}>
                    <Who name={named(person)} color={colorAt(index)} />
                    <Figure n={num(person.messages)} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card tint={LILAC} label="Share of voice">
            {pair ? (
              <div className="stat-share">
                <ShareRing
                  size={96}
                  slices={people.map((person, index) => ({
                    value: person.messages,
                    color: colorAt(index),
                  }))}
                />
                <div className="stat-share-copy">
                  {people.map((person, index) => (
                    <Figure
                      key={person.name}
                      n={percent(index === 0 ? firstShare : 1 - firstShare)}
                      unit={named(person)}
                      color={colorAt(index)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="stat-share">
                <ShareRing
                  size={112}
                  slices={people.map((person, index) => ({
                    value: person.messages,
                    color: colorAt(index),
                  }))}
                />
                <ol className="stat-ranks">
                  {people.map((person, index) => (
                    <li className="stat-rank" key={person.name}>
                      <span className="stat-rank-n">{index + 1}</span>
                      <Dot color={colorAt(index)} />
                      <bdi>{named(person)}</bdi>
                      <span>{percent(person.messages / total)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
          {starts > 0 && (
            <Card tint={ROSE} label="Who starts the conversation">
              <div className="stat-starts">
                {people.map((person, index) => {
                  const share = Math.round((person.initiations / starts) * 100);
                  return (
                    <div className="stat-start" key={person.name}>
                      <bdi className="stat-start-name">{named(person)}</bdi>
                      <div className="stat-track">
                        <span
                          style={{
                            width: `${share}%`,
                            background: colorAt(index),
                          }}
                        />
                      </div>
                      <span className="stat-start-pct">{share}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </section>
      {(replies.length >= 2 ||
        stats.busiestDay ||
        activeDays >= 2 ||
        showHours) && (
        <section className="stat-section">
          <h2>Your rhythm.</h2>
          <div className="stat-stack">
            {replies.length >= 2 && (
              <Card tint={LILAC} label="Median reply time">
                <div className="stat-pair">
                  {(pair ? replies : [...replies].sort(
                    (a, b) =>
                      (a.medianReplyMinutes ?? 0) - (b.medianReplyMinutes ?? 0),
                  ).slice(0, 3)
                  ).map((person) => {
                    const index = people.findIndex((item) => item.name === person.name);
                    const parts = replyParts(person.medianReplyMinutes ?? 0);
                    return (
                      <div key={person.name}>
                        <Who name={named(person)} color={colorAt(index)} />
                        <Figure n={parts.n} unit={parts.unit} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            {stats.busiestDay && (
              <Card tint={PEACH} label="Record day">
                <Figure
                  n={num(stats.busiestDay.count)}
                  unit={`${stats.busiestDay.count === 1 ? "message" : "messages"} on ${longDate(stats.busiestDay.date)}`}
                />
              </Card>
            )}
            {activeDays >= 2 && silence === 0 && (
              <Card tint={MINT} label="Every day">
                <Figure n={num(streak)} unit={streak === 1 ? "day" : "days"} />
              </Card>
            )}
            {activeDays >= 2 && silence > 0 && (
              <div className="stat-split">
                <Card tint={MINT} label="Streak">
                  <Figure n={num(streak)} unit={streak === 1 ? "day" : "days"} />
                </Card>
                <Card tint={ROSE} label="Longest silence">
                  <Figure
                    n={num(silence)}
                    unit={silence === 1 ? "day" : "days"}
                  />
                </Card>
              </div>
            )}
            {showHours && (
              <Card tint={CREAM} label="By hour">
                <div>
                  <div className="stat-hours">
                    {hours.map((count, hour) => {
                      const peak = Math.max(1, ...hours);
                      return (
                        <div
                          key={hour}
                          className="stat-hour"
                          title={`${String(hour).padStart(2, "0")}: ${num(count)} messages`}
                          style={{
                            height: `${Math.max(3, (count / peak) * 100)}%`,
                            opacity: hour >= 22 || hour < 5 ? 1 : 0.3,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="stat-hour-labels">
                    <span>00</span>
                    <span>06</span>
                    <span>12</span>
                    <span>18</span>
                  </div>
                </div>
                <p className="stat-note">
                  {percent(stats.nightShare ?? 0)} after 10pm · peak at{" "}
                  {String(stats.busiestHour).padStart(2, "0")}
                </p>
              </Card>
            )}
          </div>
        </section>
      )}
      {(wordPeople.length > 0 || emojiPeople.length > 0) && (
        <section className="stat-section">
          <h2>Your words.</h2>
          <div className="stat-stack">
            {wordPeople.length > 0 && (
              <Card tint={MINT} label="Most used words">
                <div className="stat-pair">
                  {wordPeople.slice(0, 4).map((person) => {
                    const index = people.findIndex((item) => item.name === person.name);
                    return (
                      <div key={person.name}>
                        <Who name={named(person)} color={colorAt(index)} />
                        <ol className="stat-words">
                          {person.topWords?.map((word) => (
                            <li key={word}>{word}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            {emojiPeople.length > 0 && (
              <Card tint={CREAM} label="Most used emojis">
                <div className="stat-pair">
                  {emojiPeople.slice(0, 4).map((person) => {
                    const index = people.findIndex((item) => item.name === person.name);
                    return (
                      <div key={person.name}>
                        <Who name={named(person)} color={colorAt(index)} />
                        <ol className="stat-words stat-emoji">
                          {person.topEmoji?.map((emoji) => (
                            <li key={emoji}>{emoji}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </section>
      )}
    </>
  );
}

export function StatsFrame({
  title,
  backHref,
  backLabel,
  stats,
  you,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  stats: Stats;
  you?: string | null;
}) {
  return (
    <>
      <div className="stat-bar">
        <div className="stat-bar-inner">
          <Link className="stat-back" href={backHref} aria-label={backLabel}>
            <span>
              <Icon name="back" />
            </span>
          </Link>
          <p>The stats</p>
          <span aria-hidden="true" />
        </div>
      </div>
      <main className="stat-page" id="main">
        <h1>{title}</h1>
        <ChatStats stats={stats} you={you} />
      </main>
    </>
  );
}

export function ConversationStats({ id }: { id: string }) {
  const { data, error } = useApi<{ conversation: Conversation }>(
    `/api/conversations/${id}`,
  );
  if (error) return <PageError message={error} />;
  if (!data) return <LoadingView label="Opening the stats." />;
  const conversation = data.conversation;
  if (!conversation.stats)
    return (
      <PageError message="This chat has expired, so its stats are no longer available." />
    );
  return (
    <StatsFrame
      title={conversation.title}
      backHref={`/c/${id}`}
      backLabel="Back to the conversation"
      stats={conversation.stats}
      you={conversation.person}
    />
  );
}

function ReportChatStats({ report }: { report: Report }) {
  const { data, error } = useApi<{ conversation: Conversation }>(
    `/api/conversations/${report.conversationId}`,
  );
  if (!data && !error) return <LoadingView label="Opening the stats." />;
  const live = data?.conversation;
  return (
    <StatsFrame
      title={live?.title || report.participants.join(" & ")}
      backHref={`/r/${report.id}`}
      backLabel="Back to the report"
      stats={live?.stats ?? report.stats}
      you={live?.person || report.person}
    />
  );
}

export function ReportStats({ id }: { id: string }) {
  const { data, error } = useApi<{ report: Report }>(`/api/reports/${id}`);
  if (error) return <PageError message={error} />;
  if (!data) return <LoadingView label="Opening the stats." />;
  const report = data.report;
  if (!report.conversationId)
    return (
      <StatsFrame
        title={report.participants.join(" & ")}
        backHref={`/r/${report.id}`}
        backLabel="Back to the report"
        stats={report.stats}
        you={report.person}
      />
    );
  return <ReportChatStats report={report} />;
}
