"use client"
import { useState } from "react"
import { BOOKING_URL } from "@/src/config/env"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const aliases = {
  player: ["player","customer","player name","customer name","full name","name"],
  device: ["device","console","console type","gaming device","station","machine"],
  date: ["date","booking date","session date","played on"],
  start: ["start","from","start time","check in"],
  end: ["end","to","end time","check out"],
  paid: ["paid","amount","amount paid","total paid","total","total amount"],
} as const
type Field = keyof typeof aliases
type Entry = Record<Field | "key",string>
const fields = Object.keys(aliases) as Field[]
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g,"")

function correct(field: Field, raw: string) {
  const value = raw.trim()
  if (field === "paid") return value.replace(/^(?:₹|INR|Rs\.?)\s*/i,"").replace(/^(\d{1,3}(?:,\d{2,3})+)(\.\d+)?$/, (_,a,b) => a.replaceAll(",","") + (b || ""))
  if (field === "date") {
    const iso = value.match(/^(\d{4}-\d\d-\d\d)(?:T.*)?$/)
    if (iso) return iso[1]
    const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (dmy && Number(dmy[1]) > 12) return [dmy[3],dmy[2].padStart(2,"0"),dmy[1]].join("-")
  }
  if (field === "start" || field === "end") {
    const time = value.match(/^(?:\d{4}-\d\d-\d\dT)?(\d{1,2}):(\d\d)(?::00(?:\.000Z)?)?\s*(am|pm)?$/i)
    if (time) {
      let hour = Number(time[1])
      if (time[3] && hour >= 1 && hour <= 12) hour = hour % 12 + (time[3].toLowerCase() === "pm" ? 12 : 0)
      return String(hour).padStart(2,"0") + ":" + time[2]
    }
    if (/^0\.\d+$/.test(value)) {
      const minutes = Math.round(Number(value)*1440) % 1440
      return String(Math.floor(minutes/60)).padStart(2,"0") + ":" + String(minutes%60).padStart(2,"0")
    }
  }
  return value
}

function issue(row: Entry) {
  if (!row.player.trim() || !row.device.trim()) return "Player and device required"
  const day = new Date(row.date + "T00:00:00Z")
  if (!/^\d{4}-\d\d-\d\d$/.test(row.date) || !Number.isFinite(+day) || day.toISOString().slice(0,10) !== row.date) return "Use YYYY-MM-DD"
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (![row.start,row.end].every(t => validTime.test(t)) || row.start === row.end) return "Check start and end (HH:MM)"
  const end = +new Date(row.date + "T" + row.end + ":00+05:30") + (row.end < row.start ? 86400000 : 0)
  if (end > Date.now()) return "Session has not ended"
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(row.paid)) return "Check amount paid"
  return ""
}

export default function HistoryImport({vendor}: {vendor:number}) {
  const [headers,setHeaders] = useState<string[]>([])
  const [source,setSource] = useState<string[][]>([])
  const [idColumn,setIdColumn] = useState(-1)
  const [fileKey,setFileKey] = useState("")
  const [fieldsMap,setMap] = useState<Partial<Record<Field,number>>>({})
  const [entries,setEntries] = useState<Entry[]>([])
  const [status,setStatus] = useState("")
  const [busy,setBusy] = useState(false)
  const [page,setPage] = useState(0)
  const [archive,setArchive] = useState(false)
  const [review,setReview] = useState(false)
  const url = BOOKING_URL + "/api/vendor/" + vendor + "/desk-history"
  const [sheets,setSheets] = useState<{name:string; data:string[][]}[]>([])
  function selectSheet(index:number, list = sheets, fingerprint = fileKey) {
    const [head = [], ...rows] = list[index].data
    setHeaders(head); setSource(rows); setReview(false); setEntries([]); setArchive(false); setPage(0)
    const id = head.findIndex(h => ["bookingid","bookingreference","bookingref","sessionid"].includes(normalize(h)))
    setIdColumn(id)
    const mapping = Object.fromEntries(fields.map(f => [f,head.findIndex(h => aliases[f].some(alias => normalize(alias) === normalize(h)))]))
    setMap(mapping)
    if (rows.length && fields.every(f => mapping[f] >= 0)) preview(rows, mapping, id, fingerprint, index)
    setSheetIndex(index)
  }
  const [sheetIndex,setSheetIndex] = useState(0)
  async function upload(file:File) {
    setBusy(true);setStatus("");setSheets([]);setHeaders([]);setEntries([]);setReview(false);setArchive(false)
    try {
      if (file.size > 8*1024*1024) throw Error("Choose a workbook under 8 MB.")
      const {Workbook} = await import("exceljs")
      const bytes = await file.arrayBuffer()
      const digest = await crypto.subtle.digest("SHA-256",bytes)
      const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("")
      setFileKey(fingerprint)
      const workbook = new Workbook()
      await workbook.xlsx.load(bytes)
      const list = workbook.worksheets.filter(sheet => sheet.actualRowCount > 0).map(sheet => {
        if(sheet.rowCount > 10001 || sheet.columnCount > 150) throw Error("Use at most 10,000 data rows and 150 columns per sheet.")
        const data:string[][] = []
        sheet.eachRow(row => {
          data.push(Array.from({length:sheet.columnCount},(_,i) => {
            const cell = row.getCell(i+1)
            return cell.value instanceof Date ? cell.value.toISOString() : cell.text
          }))
        })
        return {name:sheet.name,data}
      })
      if (!list.length) throw Error("Workbook has no data.")
      setSheets(list); selectSheet(0,list,fingerprint)
    } catch(e) {setStatus(e instanceof Error ? e.message : "Could not read workbook.")}
    finally {setBusy(false)}
  }
  function preview(data = source, mapping = fieldsMap, identity = idColumn, fingerprint = fileKey, sheet = sheetIndex) {
    let corrections = 0
    const seen = new Set<string>()
    const rows: Entry[] = []
    for (const [i,cells] of data.entries()) {
      const row = {key:fingerprint + "-" + sheet + "-" + i} as Entry
      if (identity >= 0) {
        const external = (cells[identity] || "").trim()
        if (!external || external.length > 95 || seen.has(external)) {
          setStatus("Row "+(i+2)+" needs a unique booking ID. Fix the source or use workbook row identity.")
          return
        }
        seen.add(external)
        row.key = "ref:"+external
      }
      for (const f of fields) {
        const raw = cells[mapping[f]!] || ""
        row[f] = correct(f, raw)
        if (raw !== row[f]) corrections++
      }
      rows.push(row)
    }
    setEntries(rows)
    setReview(true);setPage(0);setStatus(corrections + " values normalized. Check flagged rows before importing.")
  }
  async function history(offset:number) {
    setBusy(true)
    try {
      const response = await fetch(url+"?offset="+offset,{headers:creditAuthHeaders()})
      if (!response.ok) throw Error("Could not load imported history.")
      setEntries(await response.json());setPage(offset/50);setArchive(true);setReview(false);setStatus("")
    } catch(e) {setStatus(String(e))} finally {setBusy(false)}
  }
  async function save(rows:Entry[], edit=false) {
    setBusy(true)
    let inserted = 0, skipped = 0, posted = 0
    try {
      for(let i=0;i<rows.length;i+=500) {
        const response = await fetch(url,{method:edit?"PATCH":"POST",headers:creditAuthHeaders(),body:JSON.stringify({rows:rows.slice(i,i+500)})})
        const result = await response.json()
        if (!response.ok) throw Error(result.error || "Could not save.")
        inserted += result.inserted; skipped += result.skipped; posted += result.transactions_saved ?? result.inserted
      }
      window.dispatchEvent(new Event("desk-transactions-imported"))
      setStatus(edit?"Changes saved.":posted+" transactions saved"+(skipped ? " · "+skipped+" existing history rows" : ""))
    } catch(e) {setStatus(inserted+" saved before error. "+String(e))}
    finally {setBusy(false)}
  }
  const issues = entries.filter(row => issue(row)).length
  const visible = archive ? entries : entries.slice(page*25,page*25+25)
  return <Dialog><DialogTrigger className="rounded border px-2 py-1 text-xs">Import Excel</DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-auto bg-background"><DialogTitle>Import past transactions</DialogTitle>
      <p className="text-sm text-muted-foreground">Upload completed sessions. Review the amounts before adding them to Transaction Report.</p>
      <div className="flex flex-wrap items-center gap-3 text-sm"><label>Upload Excel (.xlsx) <input type="file" accept=".xlsx" disabled={busy} onChange={e => {if(e.target.files?.[0]) void upload(e.target.files[0]);e.target.value=""}}/></label>
      <button disabled={busy} onClick={() => history(0)}>View imported history</button></div>
      {!!sheets.length && !archive && <><label>Worksheet <select className="bg-background" disabled={busy} value={sheetIndex} onChange={e => selectSheet(Number(e.target.value))}>{sheets.map((s,i) => <option key={i} value={i}>{s.name}</option>)}</select></label>
      <details key={sheetIndex} open={!review}><summary className="cursor-pointer text-sm">Match columns</summary><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{fields.map(f => <label className="text-xs capitalize" key={f}>{f}<select disabled={busy} className="block w-full rounded border bg-background p-1" value={fieldsMap[f] ?? -1} onChange={e => {setMap({...fieldsMap,[f]:Number(e.target.value)});setReview(false)}}>
        <option value={-1}>Choose column</option>{headers.map((h,i) => <option key={i} value={i}>{h || "Column "+(i+1)}</option>)}</select></label>)}</div>
      <label className="text-xs">Duplicate check <select disabled={busy} className="rounded border bg-background p-1" value={idColumn} onChange={e => {setIdColumn(Number(e.target.value));setReview(false)}}>
        <option value={-1}>Same workbook and row</option>{headers.map((h,i) => <option key={i} value={i}>Booking ID from {h || i+1}</option>)}</select></label>
      <button className="rounded border p-1" disabled={busy || !source.length || fields.some(f => (fieldsMap[f] ?? -1)<0) || new Set(Object.values(fieldsMap)).size !== fields.length} onClick={() => preview()}>Preview mapped rows</button></details></>}
      {(review || archive) && <><div className="overflow-auto"><table className="w-full text-sm"><thead><tr>{[...fields,"Review"].map(f => <th className="text-left capitalize" key={f}>{f}</th>)}</tr></thead>
        <tbody>{visible.map((row,i) => <tr key={row.key}>{fields.map(f=><td key={f}>{review && source[page*25+i]?.[fieldsMap[f]!] !== row[f] && <small className="block text-muted-foreground">Was: {source[page*25+i]?.[fieldsMap[f]!] || "blank"}</small>}<input aria-label={f+" row "+(i+1)} disabled={busy} className="w-24 rounded border bg-background px-1" value={row[f]} onChange={e=>setEntries(prev=>prev.map(item=>item.key===row.key?{...item,[f]:e.target.value}:item))}/></td>)}<td>{issue(row) || (archive ? <button disabled={busy} onClick={()=>save([row],true)}>Save row</button> : "Ready")}</td></tr>)}</tbody></table></div>
        <div className="flex items-center gap-3 text-sm"><button disabled={busy||page===0} onClick={()=>archive?history((page-1)*50):setPage(page-1)}>Previous</button>Page {page+1}<button disabled={busy||(archive?entries.length<50:(page+1)*25>=entries.length)} onClick={()=>archive?history((page+1)*50):setPage(page+1)}>Next</button>
        {review && <button disabled={busy||!!issues||!entries.length} className="rounded border px-3 py-1" onClick={()=>save(entries)}>{issues ? issues+" rows need review" : "Import "+entries.length+" bookings"}</button>}</div></>}
      <p role="status" className="text-sm">{busy?"Working…":status}</p>
    </DialogContent></Dialog>
}
