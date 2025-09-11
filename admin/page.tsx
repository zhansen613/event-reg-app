'use client'
</main>
)
}


return (
<main className="mx-auto max-w-5xl p-6">
<div className="flex items-center justify-between mb-4">
<h1 className="text-2xl font-semibold">Admin — Events</h1>
<button onClick={openCreate} className="px-3 py-2 rounded-xl border text-sm">+ New Event</button>
</div>


<div className="grid md:grid-cols-2 gap-4">
{events.map((e:any) => (
<div key={e.id} className="rounded-2xl border p-4 bg-white">
<h3 className="text-lg font-semibold">{e.title}</h3>
<p className="text-sm text-gray-600">{format(new Date(e.start_at), 'PPP p')} · {e.location || 'TBA'}</p>
<p className="text-sm mt-2 line-clamp-3">{e.description}</p>
<div className="mt-3 flex items-center gap-2">
<button onClick={()=>openEdit(e)} className="px-3 py-1.5 rounded-lg border text-xs">Edit</button>
<button onClick={()=>delEvent(e.id)} className="px-3 py-1.5 rounded-lg border text-xs">Delete</button>
<button onClick={()=>viewRegs(e)} className="px-3 py-1.5 rounded-lg border text-xs">Registrations</button>
</div>
</div>
))}
</div>


<Modal open={formOpen} onClose={()=>setFormOpen(false)} title={editing ? 'Edit event' : 'New event'}>
<EventForm initial={editing} onSave={saveEvent} />
</Modal>


<Modal open={regOpen} onClose={()=>setRegOpen(false)} title={`Registrations — ${activeEvent?.title || ''}`}>
<div className="flex items-center justify-between mb-3">
<p className="text-sm text-gray-600">{regs.length} total</p>
<button onClick={exportCSV} className="px-3 py-1.5 rounded-lg border text-xs">Export CSV</button>
</div>
<div className="max-h-80 overflow-auto border rounded-xl">
<table className="w-full text-sm">
<thead className="bg-gray-50">
<tr>
<th className="text-left p-2">Name</th>
<th className="text-left p-2">Email</th>
<th className="text-left p-2">Dept</th>
<th className="text-left p-2">Status</th>
<th className="text-left p-2">When</th>
<th className="text-left p-2"></th>
</tr>
</thead>
<tbody>
{regs.map((r:any) => (
<tr key={r.id} className="border-t">
<td className="p-2">{r.name}</td>
<td className="p-2">{r.email}</td>
<td className="p-2">{r.dept || ''}</td>
<td className="p-2">{r.status}</td>
<td className="p-2">{format(new Date(r.created_at), 'PP p')}</td>
<td className="p-2 text-right">
{r.status === 'waitlisted' && (
<button onClick={()=>promote(r.id)} className="px-2 py-1 rounded-lg border text-xs">Promote</button>
)}
</td>
</tr>
))}
</tbody>
</table>
</div>
</Modal>
</main>
)
}


function EventForm({ initial, onSave }: any) {
const [title, setTitle] = useState(initial?.title || '')
const [description, setDescription] = useState(initial?.description || '')
const [location, setLocation] = useState(initial?.location || '')
const [startAt, setStartAt] = useState<string>(() => {
if (!initial?.start_at) return ''
// Convert ISO → datetime-local
const d = new Date(initial.start_at)
const pad = (n:number)=>String(n).padStart(2,'0')
const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
return s
})
const [capacity, setCapacity] = useState(initial?.capacity || 50)


const submit = async () => {
const payload = {
title,
description,
location,
start_at: startAt ? new Date(startAt).toISOString() : null,
capacity: Number(capacity)
}
await onSave(payload)
}


return (
<div>
<div className="grid sm:grid-cols-2 gap-3">
<div className="flex flex-col gap-1">
<label className="text-sm">Title</label>
<input className="border rounded-xl px-3 py-2 text-sm" value={title} onChange={(e)=>setTitle(e.target.value)} />
</div>
<div className="flex flex-col gap-1">
<label className="text-sm">Location</label>
<input className="border rounded-xl px-3 py-2 text-sm" value={location} onChange={(e)=>setLocation(e.target.value)} />
</div>
<div className="flex flex-col gap-1 sm:col-span-2">
<label className="text-sm">Description</label>
<textarea className="border rounded-xl px-3 py-2 text-sm" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />
</div>
<div className="flex flex-col gap-1">
<label className="text-sm">Start (local time)</label>
<input type="datetime-local" className="border rounded-xl px-3 py-2 text-sm" value={startAt} onChange={(e)=>setStartAt(e.target.value)} />
</div>
<div className="flex flex-col gap-1">
<label className="text-sm">Capacity</label>
<input type="number" min={1} className="border rounded-xl px-3 py-2 text-sm" value={capacity} onChange={(e)=>setCapacity(e.target.value)} />
</div>
</div>
<div className="mt-4 flex items-center justify-end gap-2">
<button onClick={submit} className="px-4 py-2 rounded-xl border text-sm">Save</button>
</div>
</div>
)
}
