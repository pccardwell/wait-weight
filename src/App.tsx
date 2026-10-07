import { useEffect, useState } from "react";
import { Today } from "./components/Today";
import { Weight } from "./components/Weight";
import { Progress } from "./components/Progress";
import { Settings } from "./components/Settings";
import { getData, todayKey } from "./storage";
import type { TabId } from "./types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "today", label: "Food", icon: "◐" },
  { id: "weight", label: "Weight", icon: "⚖" },
  { id: "progress", label: "Progress", icon: "▤" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function App() {
  const [data, setData] = useState(getData);
  const [tab, setTab] = useState<TabId>("today");
  const [date, setDate] = useState(todayKey);

  useEffect(() => {
    let lastToday = todayKey();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = todayKey();
      if (now !== lastToday) {
        setDate((d) => (d === lastToday ? now : d));
        lastToday = now;
      }
      setData(getData());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="app">
      {tab === "today" && <Today data={data} date={date} onDateChange={setDate} onChange={setData} />}
      {tab === "weight" && <Weight data={data} onChange={setData} />}
      {tab === "progress" && (
        <Progress
          data={data}
          onOpenDay={(d) => {
            setDate(d);
            setTab("today");
          }}
        />
      )}
      {tab === "settings" && <Settings data={data} onChange={setData} />}

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            <span className="nav-icon" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
