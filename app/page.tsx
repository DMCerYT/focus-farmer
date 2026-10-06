"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type Outfit = "blue" | "green" | "red";
type Screen = "landing" | "login" | "signup" | "welcome" | "setup" | "focus" | "summary" | "rest" | "collection";
type Focus = { id: string; started_at: string; ends_at: string; minutes: number; mode: string; display_mode: string; outfit: Outfit; claimed_at: string | null; completed: boolean | null; base_coins: number | null; hard_bonus: number | null; lucky_bonus: number | null; earned: number | null };
type Pet = { id: string; name: string; rarity: string; asset_id: string };
const tracks = ["Upbeat_Focus_Investigation.mp3", "Azure_Archipelago_SunsetMusic.mp3", "Azure_Isle_Thinking.mp3", "Midnight_Rain_JPN.mp3", "Azure_Horizon_Zen.mp3", "Rainy_Day_Orchestral_Study_Session.mp3", "focus_music.mp3"];
const tips = ["Plant one small task and give it your full attention.", "Put your phone away and let your focus grow.", "A short break can make your next harvest stronger.", "Start with the hardest row while your mind is fresh."];
const jokes = ["Why did the farmer study? To grow their knowledge!", "What did the corn say after focusing? A-maize-ing!", "Why are farmers great at focus? They stay grounded.", "Why did the chicken cross the road? To get to the other side of the focus block.", "Why did the rooster cross the road? To get c(l)ocked in for his shift at the farm!", "What do you call a fake noodle? An impasta.", "Why did the chicken not cross the road in Athens? Because it got run over by a super speeder... probably on the football team."];
const petAssets: Record<string, string> = { wave: "Piskel Penguin Wave_Kangadrew.gif", yellow_hat: "Piskel Penguin with a Yellow Hat.png", matcha: "Piskel Penguin with Matcha Latte v1.1.png", wizard: "Piskel Wizard Penguin_Kangadrew.png", surfer: "Piskel Penguin Surfer Bro WhiteAndGold_Kangadrew.png" };
const asset = (name: string) => `/assets/${encodeURIComponent(name)}`;
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const withTimeout = <T,>(request: PromiseLike<T>, milliseconds: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Connection timed out. Please try again.")), milliseconds);
  Promise.resolve(request).then(
    value => { clearTimeout(timer); resolve(value); },
    error => { clearTimeout(timer); reject(error); },
  );
});

function Farmer({ color, frame = 0, walking = false, size = 128 }: { color: Outfit; frame?: number; walking?: boolean; size?: number }) {
  return <div role="img" aria-label={`${color} farmer`} className={`farmer ${walking ? "walking" : ""}`} style={{ width: size, height: size, backgroundImage: `url(${asset(`jojo_${color}_${walking ? "walk" : "front"}.png`)})`, backgroundSize: `${size * (walking ? 4 : 5)}px ${size}px`, backgroundPosition: `${-frame * size}px 0` }} />;
}
function Coin({ size = 24 }: { size?: number }) { return <span className="coin" aria-hidden="true" style={{ width: size, height: size, backgroundImage: `url(${asset("coin_anim.png")})`, backgroundSize: `${size * 10}px ${size}px`, "--coin-end": `${-size * 10}px` } as CSSProperties} />; }

export default function Home() {
  const [supabase] = useState(createClient);
  const [screen, setScreen] = useState<Screen>("landing");
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const activeUser = useRef<string | null>(null);
  const loadVersion = useRef(0);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ coins: 0, sessions: 0 });
  const [pets, setPets] = useState<Pet[]>([]); const [focus, setFocus] = useState<Focus | null>(null); const [summary, setSummary] = useState<Focus | null>(null);
  const [minutes, setMinutes] = useState(25); const [displayMode, setDisplayMode] = useState<"down" | "up">("down"); const [mode, setMode] = useState<"regular" | "hard">("regular");
  const [outfit, setOutfit] = useState<Outfit>("blue"); const [muted, setMuted] = useState(false); const [volume, setVolume] = useState(0.5);
  const [now, setNow] = useState(0); const [breakMinutes, setBreakMinutes] = useState(5); const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null); const [restLine, setRestLine] = useState("");
  const [gachaOpen, setGachaOpen] = useState(false); const [eggStage, setEggStage] = useState<"idle" | "wobble" | "reveal">("idle"); const [newPet, setNewPet] = useState<Pet | null>(null);
  const [walkthrough, setWalkthrough] = useState(-1); const [prefsReady, setPrefsReady] = useState(false); const audioRef = useRef<HTMLAudioElement | null>(null); const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (id: string, isCurrent: () => boolean = () => true) => {
    const version = ++loadVersion.current;
    const [p, s, collection] = await withTimeout(Promise.all([
      supabase.from("progress").select("coins,sessions").eq("user_id", id).single(),
      supabase.from("focus_sessions").select("*").eq("user_id", id).is("claimed_at", null).maybeSingle(),
      supabase.from("pets").select("id,name,rarity,asset_id").eq("user_id", id).order("created_at", { ascending: false }),
    ]), 12000);
    if (!isCurrent() || activeUser.current !== id || loadVersion.current !== version) return;
    if (p.error || s.error || collection.error) throw new Error(p.error?.message || s.error?.message || collection.error?.message);
    if (p.data) setProgress(p.data); if (collection.data) setPets(collection.data);
    if (s.data) { setFocus(s.data as Focus); setScreen("focus"); } else setScreen("setup");
    const key = `focus-farmer:${id}:`;
    try {
      const prefs = JSON.parse(localStorage.getItem(key + "prefs") || "{}");
      if (["blue", "green", "red"].includes(prefs.outfit)) setOutfit(prefs.outfit);
      if (typeof prefs.muted === "boolean") setMuted(prefs.muted);
      if (typeof prefs.volume === "number") setVolume(prefs.volume);
      const end = Number(localStorage.getItem(key + "breakEndsAt")); if (end > Date.now()) { setBreakEndsAt(end); if (!s.data) setScreen("rest"); }
      if (!localStorage.getItem(key + "walkthrough")) setWalkthrough(0);
    } catch { /* Ignore damaged local settings. */ }
    setPrefsReady(true);
  }, [supabase]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setLoading(false); return; }
    let alive = true;
    const initialize = async () => {
      setLoading(true);
      setStartupError("");
      try {
        // A valid stored session avoids a network round trip on every mobile launch.
        const { data, error } = await withTimeout(supabase.auth.getSession(), 12000);
        if (!alive) return;
        if (error) throw error;
        const id = data.session?.user.id || null;
        activeUser.current = id;
        setUserId(id);
        if (id) await loadData(id, () => alive);
        if (alive) setLoading(false);
      } catch (error) {
        if (!alive) return;
        loadVersion.current++;
        activeUser.current = null;
        setUserId(null);
        setStartupError(error instanceof Error ? error.message : "Could not load your farm.");
        setLoading(false);
      }
    };
    void initialize();
    return () => { alive = false; };
  }, [supabase, loadData, startupAttempt]);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  useEffect(() => { if (userId && prefsReady) localStorage.setItem(`focus-farmer:${userId}:prefs`, JSON.stringify({ outfit, muted, volume })); }, [userId, prefsReady, outfit, muted, volume]);
  useEffect(() => { if (audioRef.current) { audioRef.current.muted = muted; audioRef.current.volume = volume; } }, [muted, volume]);
  useEffect(() => { if (focus && now >= new Date(focus.ends_at).getTime()) audioRef.current?.pause(); }, [focus, now]);
  useEffect(() => {
    if (screen !== "focus" || !focus || Date.now() >= new Date(focus.ends_at).getTime()) return;
    const audio = new Audio(); audioRef.current = audio;
    const next = () => { let index = Math.floor(Math.random() * tracks.length); if (tracks.length > 1 && audio.src.endsWith(encodeURIComponent(tracks[index]))) index = (index + 1) % tracks.length; audio.src = asset(tracks[index]); audio.muted = muted; audio.volume = volume; void audio.play().catch(() => {}); };
    audio.addEventListener("ended", next); next(); return () => { audio.pause(); audio.removeEventListener("ended", next); audioRef.current = null; };
    // Music starts once per focus session. The effect above updates volume separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, focus?.id]);

  const authenticate = async (kind: "login" | "signup") => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setMessage("Add your Supabase URL and publishable key to .env.local to sign in."); return; }
    setBusy(true); setMessage("");
    try {
      if (kind === "signup") { const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } }); if (error) throw error; setMessage("Check your email to verify your account before logging in."); }
      else { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; activeUser.current = data.user.id; setUserId(data.user.id); setScreen("welcome"); welcomeTimer.current = setTimeout(() => { void loadData(data.user.id).catch(error => { loadVersion.current++; activeUser.current = null; setUserId(null); setStartupError(error instanceof Error ? error.message : "Could not load your farm."); }); }, 1700); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  };
  const logout = async () => { if (!window.confirm("Log out of Focus Farmer?")) return; setBusy(true); const { error } = await supabase.auth.signOut(); setBusy(false); if (error) { setMessage(error.message); return; } if (welcomeTimer.current) clearTimeout(welcomeTimer.current); audioRef.current?.pause(); activeUser.current = null; setUserId(null); setPrefsReady(false); setFocus(null); setSummary(null); setPets([]); setProgress({ coins: 0, sessions: 0 }); setBreakEndsAt(null); setWalkthrough(-1); setOutfit("blue"); setMuted(false); setVolume(0.5); setScreen("landing"); setMessage(""); };
  const farm = async () => { const duration = Number(minutes); if (!Number.isFinite(duration) || duration < 0.1 || duration > 180) { setMessage("Choose 0.1 to 180 minutes."); return; } setBusy(true); setMessage(""); const { data, error } = await supabase.rpc("start_focus", { p_minutes: duration, p_mode: mode, p_display_mode: displayMode, p_outfit: outfit }); setBusy(false); if (error) { setMessage(error.message); return; } setFocus(data as Focus); setNow(Date.now()); setScreen("focus"); };
  const reap = async () => { if (!focus || busy) return; setBusy(true); setMessage(""); const { data, error } = await supabase.rpc("reap_focus", { p_session_id: focus.id }); setBusy(false); if (error) { setMessage(error.message); return; } const result = data as Focus; setFocus(null); setSummary(result); if (userId) { const { data: latest } = await supabase.from("progress").select("coins,sessions").eq("user_id", userId).single(); if (latest) setProgress(latest); } setScreen("summary"); };
  const pullEgg = async () => { if (progress.coins < 10) { setMessage("You need 10 coins to pull an egg."); return; } setBusy(true); setMessage(""); setNewPet(null); const { data, error } = await supabase.rpc("pull_egg"); if (error) { setBusy(false); setMessage(error.message); return; } const pet = data as Pet; setProgress(p => ({ ...p, coins: p.coins - 10 })); setPets(p => [pet, ...p]); setEggStage("wobble"); setTimeout(() => { setNewPet(pet); setEggStage("reveal"); setBusy(false); }, 1150); };
  const startBreak = () => { const duration = Number(breakMinutes); if (!Number.isFinite(duration) || duration < 0.1 || duration > 60) { setMessage("Choose 0.1 to 60 minutes."); return; } const end = Date.now() + duration * 60000; setBreakEndsAt(end); setRestLine(""); setMessage(""); if (userId) localStorage.setItem(`focus-farmer:${userId}:breakEndsAt`, String(end)); };
  const backToFocus = () => { setBreakEndsAt(null); setRestLine(""); if (userId) localStorage.removeItem(`focus-farmer:${userId}:breakEndsAt`); setScreen("setup"); };
  const nextWalkthrough = () => { if (walkthrough === 3) { setWalkthrough(-1); if (userId) localStorage.setItem(`focus-farmer:${userId}:walkthrough`, "done"); } else setWalkthrough(walkthrough + 1); };
  const remaining = focus ? new Date(focus.ends_at).getTime() - now : 0; const elapsed = focus ? now - new Date(focus.started_at).getTime() : 0; const complete = !!focus && remaining <= 0; const breakActive = breakEndsAt !== null && breakEndsAt > now;

  return <main className={`world ${progress.sessions > 0 ? "flow" : ""}`}><div className="ambient ambient-a" /><div className="ambient ambient-b" /><div className="app-shell">
    {loading ? <div className="card centered" role="status">Loading your farm...</div> : startupError ? <div className="card centered"><h1>Could not load your farm</h1><p className="notice" role="alert">{startupError}</p><button className="primary full" onClick={() => setStartupAttempt(attempt => attempt + 1)}>Try again</button><button className="text-button" onClick={() => { setStartupError(""); setScreen("login"); }}>Log in</button></div> : !userId ? screen === "landing" ? <section className="card intro centered"><img className="title-art" src={asset("title-screenhd.png")} alt="Focus Farmer title art" /><p>Plant your focus. Harvest your progress.</p><button className="primary big" onClick={() => { setScreen("login"); setMessage(""); }}>START</button></section> : <section className="card auth centered"><img className="auth-art" src={asset("title-screenhd.png")} alt="Focus Farmer" /><h1>{screen === "signup" ? "Join the farm" : "Welcome, Farmer"}</h1><p className="subtle">{screen === "signup" ? "Create an account to save every harvest." : "Log in to pick up where you left off."}</p><form onSubmit={e => { e.preventDefault(); void authenticate(screen === "signup" ? "signup" : "login"); }}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete={screen === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="primary full" disabled={busy}>{busy ? "Working..." : screen === "signup" ? "SIGN UP" : "LOG IN"}</button></form>{message && <p className="notice" role="status">{message}</p>}<button className="text-button" onClick={() => { setScreen(screen === "signup" ? "login" : "signup"); setMessage(""); }}>{screen === "signup" ? "Already have an account? Log in" : "New here? Sign up"}</button><button className="text-button muted-link" onClick={() => setScreen("landing")}>Back to title</button></section> : screen === "welcome" ? <section className="card intro centered"><img className="title-art" src={asset("title-screenhd.png")} alt="Focus Farmer" /><h1>Welcome Back, Farmer</h1></section> : <>
      <header className="topbar"><div className="brand">FOCUS <span>FARMER</span></div><div className="stats"><span className="stat"><Coin size={22} />{progress.coins}</span><span className="stat"><img src={asset("session_icon.png")} alt="" />{progress.sessions}</span></div><button className="logout" disabled={busy} onClick={logout}>Logout</button></header>
      {screen === "setup" && <section className="card centered"><div className="eyebrow">YOUR NEXT HARVEST</div><h1>Ready to focus?</h1><div className="sprite-stage"><div className="stage-ground" /><Farmer color={outfit} /></div><div className="form-grid"><label>Focus duration <span>(minutes)</span><input type="number" min="0.1" max="180" step="0.1" value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label><label>Timer display<select value={displayMode} onChange={e => setDisplayMode(e.target.value as "down" | "up")}><option value="down">Count down</option><option value="up">Count up</option></select></label><label>Mode<select value={mode} onChange={e => setMode(e.target.value as "regular" | "hard")}><option value="regular">Regular</option><option value="hard">Hard</option></select></label></div>{mode === "hard" && <p className="fineprint">Hard Mode adds 50% coins and a 30% chance for 30 lucky coins.</p>}<p className="outfit-label">Choose your outfit</p><div className="outfit-row">{(["blue", "green", "red"] as Outfit[]).map(color => <button key={color} className={`outfit-option ${outfit === color ? "selected" : ""}`} aria-label={`${color} outfit`} aria-pressed={outfit === color} onClick={() => setOutfit(color)}><Farmer color={color} size={55} /><span>{color}</span></button>)}</div><button className="primary big full" disabled={busy} onClick={farm}>FARM ✦</button><button className="secondary full" onClick={() => { setGachaOpen(true); setEggStage("idle"); setNewPet(null); setMessage(""); }}>🥚 Open Egg Gacha</button><button className="text-button" onClick={() => setScreen("collection")}>My Penguins →</button>{message && <p className="notice">{message}</p>}</section>}
      {screen === "focus" && focus && <section className="card centered"><div className="eyebrow">FOCUS IN PROGRESS</div><h1>{complete ? "Harvest is ready!" : "Keep on farming"}</h1><p className="subtle">{focus.mode === "hard" ? "Hard Mode" : "Regular Mode"} · {focus.minutes} minutes</p><div className="sprite-stage"><div className="stage-ground" /><Farmer color={focus.outfit} frame={complete ? 1 : 0} walking={!complete} /></div><div className="timer">{clock(focus.display_mode === "up" ? Math.min(elapsed, focus.minutes * 60000) : remaining)}</div><p className="timer-caption">{complete ? "Session complete — press REAP to claim." : focus.display_mode === "up" ? "time focused" : "time remaining"}</p><div className="music"><span>♫ Focus music</span><button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute music" : "Mute music"}>{muted ? "🔇" : "🔊"}</button><input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Music volume" onChange={e => setVolume(Number(e.target.value))} /></div><button className={`${complete ? "primary big" : "secondary"} full`} disabled={busy} onClick={reap}>REAP</button>{!complete && <p className="fineprint">Reaping early ends this session with no coins.</p>}</section>}
      {screen === "summary" && summary && <section className="card centered"><div className="eyebrow">HARVEST SUMMARY</div><h1>{summary.completed ? "A fine harvest!" : "Harvest ended early"}</h1><div className="sprite-stage"><div className="stage-ground" /><Farmer color={summary.outfit} frame={summary.completed ? 2 : 3} /></div><div className="reward-total"><Coin size={34} />+{summary.earned || 0}</div><div className="reward-lines"><div><span>Focus reward</span><strong>+{summary.base_coins || 0}</strong></div><div><span>Hard Mode bonus</span><strong>+{summary.hard_bonus || 0}</strong></div><div><span>Lucky bonus</span><strong>+{summary.lucky_bonus || 0}</strong></div></div><p className="subtle">{summary.completed ? "One more completed session for your farm." : "Only completed sessions earn coins and count toward your total."}</p><button className="primary big full" onClick={() => setScreen("rest")}>REST</button></section>}
      {screen === "rest" && <section className="card centered"><div className="eyebrow">REST GROVE</div><h1>Take a little breather</h1><div className="sprite-stage"><div className="stage-ground" /><Farmer color={outfit} frame={4} /></div><p className="subtle">Every good farmer needs a pause.</p><label className="break-input">Break timer <span>(minutes)</span><input type="number" min="0.1" max="60" step="0.1" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} /></label>{breakEndsAt && <div className="break-clock">{breakActive ? clock(breakEndsAt - now) : "00:00"}</div>}{breakEndsAt && !breakActive && <p className="ready">You&apos;re ready to FARM again!</p>}<button className="primary full" onClick={startBreak}>Start Break</button><div className="rest-actions"><button className="secondary" onClick={() => setRestLine(tips[Math.floor(Math.random() * tips.length)])}>Get Focus Advice</button><button className="secondary" onClick={() => setRestLine(jokes[Math.floor(Math.random() * jokes.length)])}>Hear Farm Joke</button><button className="secondary" onClick={() => setRestLine(`Your island has ${progress.sessions} completed harvests and ${progress.coins} coins.`)}>Check Island</button><button className="secondary" onClick={() => setScreen("collection")}>My Penguins</button></div>{restLine && <p className="rest-line" role="status">{restLine}</p>}<button className="primary full" onClick={backToFocus}>Back to Focus</button></section>}
      {screen === "collection" && <section className="card collection"><div className="eyebrow">YOUR COLLECTION</div><h1>My Penguins</h1><p className="subtle">Every hatch has a place on your shelves. Duplicates are welcome!</p>{(["legendary", "epic", "rare", "common"] as const).map(rarity => <div className="shelf" key={rarity}><h2>{rarity}</h2><div className="shelf-items">{pets.some(p => p.rarity === rarity) ? pets.filter(p => p.rarity === rarity).map(p => <div className="pet" key={p.id}><img src={asset(petAssets[p.asset_id])} alt="" /><span>{p.name}</span></div>) : <p>No {rarity} penguins yet.</p>}</div></div>)}<button className="primary full" onClick={() => setScreen(breakEndsAt ? "rest" : "setup")}>Back</button></section>}
      {message && screen !== "setup" && <p className="notice global-notice" role="status">{message}</p>}
    </>}
  </div>
  {gachaOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setGachaOpen(false); }}><div className="card gacha-modal centered" role="dialog" aria-modal="true" aria-label="Open Egg Gacha"><button className="close" aria-label="Close" disabled={busy} onClick={() => setGachaOpen(false)}>×</button><div className="eyebrow">EGG GACHA</div><h1>What will hatch?</h1><div className={`egg ${eggStage}`}>{eggStage === "reveal" && newPet ? <img src={asset(petAssets[newPet.asset_id])} alt={newPet.name} /> : <div role="img" aria-label="Mystery egg" className="egg-sprite" style={{ backgroundImage: `url(${asset("egg_base_wobble.png")})` }} />}</div>{newPet ? <p className="hatched">{newPet.name} <span>· {newPet.rarity}</span></p> : <p className="subtle">A new penguin is one lucky pull away.</p>}<div className="gacha-balance"><Coin />Your coins: <strong>{progress.coins}</strong></div><button className="primary full" disabled={busy || progress.coins < 10} onClick={pullEgg}>Pull Egg (10 coins)</button>{progress.coins < 10 && <p className="fineprint">You need 10 coins for an egg.</p>}{message && <p className="notice">{message}</p>}</div></div>}
  {walkthrough >= 0 && userId && <div className="modal-backdrop tutorial-backdrop"><div className="card tutorial" role="dialog" aria-modal="true" aria-label="Farm walkthrough"><div className="eyebrow">A LITTLE FARM TOUR · {walkthrough + 1} / 4</div><h2>{["Welcome to your farm", "FARM to begin", "REAP your harvest", "REST and repeat"][walkthrough]}</h2><p>{["Focus Farmer turns dedicated time into coins and penguin friends.", "Choose a duration, mode, and outfit. Your timer resumes after a refresh.", "When the timer ends, press REAP to collect your reward. Reaping early earns nothing.", "Take a break in Rest Grove, visit your penguins, then start fresh."][walkthrough]}</p><div className="steps">{[0,1,2,3].map(i => <span key={i} className={i === walkthrough ? "active" : ""} />)}</div><button className="primary full" onClick={nextWalkthrough}>{walkthrough === 3 ? "LET'S FARM" : "NEXT"}</button></div></div>}
  </main>;
}
