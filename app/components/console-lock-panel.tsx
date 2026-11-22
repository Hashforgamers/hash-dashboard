"use client";
// Hash Console Lock (Smart TV) controls for one console station.
// Session start / extend stay in the existing booking and Live session flows;
// this panel adds pairing, TV health, lock state and display controls.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Lock, LockOpen, MonitorPlay, Link2, Unlink, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";
import { cafeCall } from "@/lib/cafe-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type ConsoleTvSession = {
  sessionId: string; status: "IDLE" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "ENDED"; startedAt: string | null;
  expiresAt: string | null; endedAt: string | null; serverTime: string; version: number; playAllowed: boolean;
  secondsRemaining: number; runtimeState: string;
};
type Verification = { status: string; source?: string; at?: string };
export type ConsoleTvStation = {
  stationId: number; stationNumber: number; stationName: string; consoleType: string; hdmiInput: string | null;
  linked: boolean; deviceKind: "PC_KIOSK" | "CONSOLE_TV" | null;
  device: null | { deviceId: number; tvPlatform: string | null; tvManufacturer: string | null; tvModel: string | null;
    appVersion: string | null; online: boolean; lastHeartbeatAt: string | null; heartbeat: Record<string, unknown> | null;
    controlCapabilities: Record<string, boolean>; capabilityVerification: Record<string, Verification>; pairedAt: string | null };
  session: ConsoleTvSession | null;
  display: null | { controlStatus: string; lockState: string; security: "SESSION_ACTIVE" | "SECURE" | "NOT_SECURE";
    securelyLocked: boolean; warning: string | null;
    lastCommand: null | { commandId: string; commandType: string; commandStatus: string; issuedAt: string; completedAt: string | null; failureReason: string | null };
    lastSuccessfulLock: null | { completedAt: string }; lastSuccessfulUnlock: null | { completedAt: string };
    lastHdmiTest: null | { commandId: string; commandStatus: string; completedAt: string | null; staffVerification: string | null } };
};
type DeviceEvent = { id: number; type: string; direction: string; createdAt: string; actor: string | null };

const api = (vendorId: number, path = "") => `${DASHBOARD_URL}/api/vendors/${vendorId}/console-devices${path}`;
const CAPABILITY_LABELS: Record<string, string> = { switchToApp: "Open Hash app", switchToHdmi: "Switch to HDMI", lockEnforcement: "Enforce lock" };

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { code?: string; message?: string; error?: string } } })?.response?.data;
  const messages: Record<string, string> = {
    end_session_first: "End the running session on this station first.",
    session_not_authorized: "There is no paid session on this station, so the TV cannot be sent back to the console.",
    pairing_code_not_found: "That code is wrong or has expired. Ask the TV to show a new code.",
    station_already_paired: "This station already has a paired device.",
    station_is_pc: "PC stations use the PC kiosk link instead.",
    rate_limited: "Too many attempts. Wait a minute and try again.",
  };
  return (data?.code && messages[data.code]) || data?.message || data?.error || "Request failed";
}

export function clock(value: string | null | undefined) {
  return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--";
}

export function useConsoleTvStations(vendorId: number | null, pollMs = 30000) {
  const [stations, setStations] = useState<ConsoleTvStation[]>([]);
  const [available, setAvailable] = useState(true);
  const refresh = useCallback(async () => {
    if (!vendorId) return;
    try {
      const response = await axios.get(api(vendorId));
      setStations(response.data?.stations || []); setAvailable(true);
    } catch (error) {
      // 503 until the Console Lock migration runs: keep the console list as it was.
      if ((error as { response?: { status?: number } })?.response?.status === 503) setAvailable(false);
    }
  }, [vendorId]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);
  return { stations, available, refresh };
}

export function ConsoleLockBadge({ station }: { station?: ConsoleTvStation }) {
  if (!station || station.deviceKind !== "CONSOLE_TV" || !station.device) return null;
  if (!station.device.online) return <Badge variant="danger">TV offline</Badge>;
  if (station.display?.security === "NOT_SECURE") return <Badge variant="warning">Not securely locked</Badge>;
  return <Badge variant="success">TV online</Badge>;
}

export default function ConsoleLockPanel({ vendorId, consoleId, onChanged }: { vendorId: number; consoleId: number; onChanged?: () => void }) {
  const { stations, available, refresh } = useConsoleTvStations(vendorId, 10000);
  const station = stations.find((s) => s.stationId === consoleId);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [target, setTarget] = useState("");
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const freeStations = useMemo(() => stations.filter((s) => s.consoleType !== "PC" && !s.linked && s.stationId !== consoleId), [stations, consoleId]);
  const deviceId = station?.device?.deviceId;

  useEffect(() => { setInput(station?.hdmiInput || ""); }, [station?.hdmiInput]);
  const loadEvents = useCallback(async () => {
    if (!deviceId) { setEvents([]); return; }
    try { setEvents((await axios.get(api(vendorId, `/${deviceId}/events?limit=15`))).data.events || []); } catch { /* health log is optional */ }
  }, [vendorId, deviceId]);
  useEffect(() => { void loadEvents(); }, [loadEvents, station?.display?.lastCommand?.commandId]);

  async function run(label: string, action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(label);
    try { await action(); toast.success(success); await refresh(); await loadEvents(); onChanged?.(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setBusy(null); }
  }
  const command = (commandType: string, success: string) =>
    run(commandType, () => axios.post(api(vendorId, `/${deviceId}/commands`), { commandType }), success);

  if (!available) return <p className="text-sm text-muted-foreground">Console Lock is not enabled on the server yet.</p>;
  if (!station) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading station…</div>;
  if (station.consoleType === "PC") return <p className="text-sm text-muted-foreground">PC stations are controlled by the PC kiosk.</p>;

  const session = station.session;
  const display = station.display;
  const device = station.device;
  const running = session && (session.status === "ACTIVE" || session.status === "EXPIRING");

  return (
    <div className="space-y-5 text-sm">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Station type" value={station.consoleType} />
        <Fact label="HDMI source" value={station.hdmiInput || "Not set"} />
        <Fact label="Session" value={session ? session.status : "IDLE"} />
        <Fact label="Ends" value={session ? clock(session.expiresAt) : "--"} />
      </section>

      {!device ? (
        <section className="space-y-2 rounded-md border p-3">
          <h4 className="font-medium">Pair a TV</h4>
          <p className="text-xs text-muted-foreground">Open Hash Console Lock on the TV. Enter the code it shows. The TV gets its credentials only after you approve here.</p>
          <div className="flex flex-wrap gap-2">
            <Input aria-label="Pairing code" placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-36 font-mono" maxLength={9} />
            <Input aria-label="HDMI input" placeholder="HDMI_1" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} className="w-28" maxLength={32} />
            <Button size="sm" disabled={!!busy || code.replace("-", "").length !== 8}
              onClick={() => run("pair", () => axios.post(api(vendorId, "/pairing/approve"), { pairingCode: code, consoleId, hdmiInput: input || undefined }), "Pairing approved. The TV finishes setup on its own.")}>
              {busy === "pair" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}Approve pairing
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium">{[device.tvManufacturer, device.tvModel].filter(Boolean).join(" ") || "Paired TV"} <span className="text-xs text-muted-foreground">({device.tvPlatform?.replace("_", " ")})</span></h4>
              <Badge variant={device.online ? "success" : "danger"}>{device.online ? "Online" : "Offline"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Last heartbeat {device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleString("en-IN") : "never"}{device.appVersion ? ` · App ${device.appVersion}` : ""}</p>
            <ul className="grid gap-1 sm:grid-cols-3">
              {Object.keys(CAPABILITY_LABELS).map((key) => {
                const verification = device.capabilityVerification?.[key]?.status || "UNVERIFIED";
                return <li key={key} className="rounded border px-2 py-1 text-xs">
                  <span className="font-medium">{CAPABILITY_LABELS[key]}</span>
                  <span className="block text-muted-foreground">TV says {device.controlCapabilities?.[key] === true ? "yes" : device.controlCapabilities?.[key] === false ? "no" : "unknown"} · {verification.replaceAll("_", " ").toLowerCase()}</span>
                </li>;
              })}
            </ul>
          </section>

          <section className={`space-y-2 rounded-md border p-3 ${display?.security === "NOT_SECURE" ? "border-amber-500/60" : ""}`}>
            <div className="flex items-center gap-2 font-medium">
              {display?.security === "NOT_SECURE" ? <ShieldAlert className="h-4 w-4 text-amber-400" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
              {display?.security === "SESSION_ACTIVE" ? "Session running" : display?.security === "SECURE" ? "Locked (reported by TV)" : "Station is not securely locked"}
            </div>
            {display?.warning && <p className="text-xs text-amber-300">{display.warning}.</p>}
            <p className="text-xs text-muted-foreground">
              Last command: {display?.lastCommand ? `${display.lastCommand.commandType} ${display.lastCommand.commandStatus.toLowerCase()}${display.lastCommand.failureReason ? ` (${display.lastCommand.failureReason})` : ""}` : "none"}
              {" · "}Last lock {clock(display?.lastSuccessfulLock?.completedAt)} · Last unlock {clock(display?.lastSuccessfulUnlock?.completedAt)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => command("LOCK", "Lock sent to the TV")}><Lock className="mr-1 h-4 w-4" />Lock</Button>
              <Button size="sm" variant="outline" disabled={!!busy || !running} title={running ? undefined : "Needs a running paid session"} onClick={() => command("UNLOCK", "Unlock sent to the TV")}><LockOpen className="mr-1 h-4 w-4" />Unlock</Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => command("HDMI_TEST", "HDMI test sent. Watch the TV.")}><MonitorPlay className="mr-1 h-4 w-4" />Test HDMI switch</Button>
              {session && running && session.sessionId && <Button size="sm" variant="soft-warning" disabled={!!busy}
                onClick={() => run("end", () => cafeCall(`/${vendorId}/extensions/${session.sessionId}/end`, { mode: "now", revision: session.version, idempotency_key: `console-tv-end-${session.sessionId}-${session.version}` }), "Session ended")}>End session</Button>}
            </div>
            {display?.lastHdmiTest && display.lastHdmiTest.completedAt && !display.lastHdmiTest.staffVerification && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span>HDMI test: TV reported {display.lastHdmiTest.commandStatus.toLowerCase()}. Did the TV actually switch?</span>
                <Button size="sm" disabled={!!busy} onClick={() => run("verify", () => axios.post(api(vendorId, `/${deviceId}/commands/${display.lastHdmiTest!.commandId}/verify`), { observed: true }), "Recorded as confirmed")}>Yes, it switched</Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("verify", () => axios.post(api(vendorId, `/${deviceId}/commands/${display.lastHdmiTest!.commandId}/verify`), { observed: false }), "Recorded as not working")}>No</Button>
              </div>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-md border p-3">
              <h4 className="font-medium">HDMI source</h4>
              <div className="flex gap-2">
                <Input aria-label="HDMI input" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="HDMI_1" maxLength={32} />
                <Button size="sm" variant="outline" disabled={!!busy}
                  onClick={() => run("input", () => axios.put(api(vendorId, `/stations/${consoleId}/display`), { hdmiInput: input || null }), "HDMI source saved")}>Save</Button>
              </div>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <h4 className="font-medium">Move or remove this TV</h4>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Move TV to station" className="h-9 rounded-md border bg-transparent px-2 text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Move to…</option>
                  {freeStations.map((s) => <option key={s.stationId} value={s.stationId}>{s.stationName} ({s.consoleType})</option>)}
                </select>
                <Button size="sm" variant="outline" disabled={!!busy || !target}
                  onClick={() => run("move", () => axios.post(api(vendorId, `/${deviceId}/reassign`), { consoleId: Number(target) }), "TV moved")}>Move</Button>
                <Button size="sm" variant="outline" className="text-red-400" disabled={!!busy}
                  onClick={() => run("revoke", () => axios.post(api(vendorId, `/${deviceId}/revoke`)), "TV unpaired. Its credentials no longer work.")}><Unlink className="mr-1 h-4 w-4" />Unpair</Button>
              </div>
            </div>
          </section>

          <section className="space-y-1">
            <div className="flex items-center justify-between"><h4 className="font-medium">Device health</h4>
              <Button size="sm" variant="ghost" onClick={() => { void refresh(); void loadEvents(); }} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button></div>
            {events.length ? <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {events.map((item) => <li key={item.id}>{new Date(item.createdAt).toLocaleString("en-IN")} · {item.type}{item.actor ? ` · ${item.actor}` : ""}</li>)}
            </ul> : <p className="text-xs text-muted-foreground">No events yet.</p>}
          </section>
        </>
      )}
      <p className="text-xs text-muted-foreground">Start and extend sessions from the booking and Live session screens as usual. Lock results are what the TV reports; use the HDMI test to confirm the TV really switches.</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
