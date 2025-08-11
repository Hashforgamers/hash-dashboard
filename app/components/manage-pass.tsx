// app/pass/page.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";

import { BadgeCheck, Pencil, Trash2, PlusCircle, Loader2 } from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";

function Loader() {
  return <Loader2 className="animate-spin h-4 w-4 text-blue-500" />;
}

const VENDOR_ID =
  typeof window !== "undefined"
    ? localStorage.getItem("selectedCafe")
    : "1";

// You may want to cache pass types from API
type PassType = {
  id: number;
  name: string;
  description?: string;
};
type CafePass = {
  id: number;
  name: string;
  price: number;
  days_valid: number;
  description?: string;
  pass_type: string;
};

export default function ManagePassesPage() {
  const [passes, setPasses] = useState<CafePass[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Get Pass types and Cafe passes (on mount)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [typesRes, passesRes] = await Promise.all([
        axios.get(`${DASHBOARD_URL}/api/pass_types`),
        axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`)
      ]);
      setPassTypes(typesRes.data);
      setPasses(passesRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // CRUD handlers
  const handleAddPass = async (
    data: Omit<CafePass, "id" | "pass_type"> & { pass_type_id: number },
    close: () => void
  ) => {
    await axios.post(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`, data);
    const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
    setPasses(passesRes);
    close();
  };

  const handleEditPass = async (
    id: number,
    data: Omit<CafePass, "id" | "pass_type"> & { pass_type_id: number },
    close: () => void
  ) => {
    await axios.put(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes/${id}`, data);
    const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
    setPasses(passesRes);
    close();
  };

  const handleDeletePass = async (id: number) => {
    setDeletingId(id); // disables delete button and shows loader
    await axios.delete(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes/${id}`);
    // Refresh passes after deactivation
    const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
    setPasses(passesRes);
    setDeletingId(null);
  };


  return (
    <main className="max-w-4xl mx-auto p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeCheck className="text-blue-500" /> Manage Cafe Passes
        </h1>
        <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
      </header>
      {loading ? (
        <div className="flex justify-center p-12"><Loader /></div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {passes.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
              No passes found. Add your first pass!
            </div>
          )}
          {passes.map(pass => (
            <Card key={pass.id} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
                <div>
                  <h2 className="font-semibold text-lg">{pass.name}</h2>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <BadgeCheck className="inline h-4 w-4 text-blue-500" />
                    {pass.pass_type} • Valid {pass.days_valid} days
                  </div>
                  {pass.description && <div className="mt-0.5 text-xs text-gray-500">{pass.description}</div>}
                </div>
                <div className="flex gap-1">
                  <EditPassDialog passTypes={passTypes} passObj={pass} onSave={handleEditPass} />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeletePass(pass.id)}
                    disabled={deletingId === pass.id}
                    aria-label={`Delete pass ${pass.name}`}
                  >
                    {deletingId === pass.id ? <Loader /> : <Trash2 className="w-4 h-4 text-rose-500" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-8">
                  <div>
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-xl">₹{pass.price}</div>
                    <div className="text-xs">Per {pass.days_valid} days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

// --- Add/Edit Pass Dialogs ---

function AddPassDialog({
  passTypes,
  onSave,
}: {
  passTypes: { id: number; name: string; description: string }[];
  onSave: (data: any, close: () => void) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    days: "",
    description: "",
    pass_type_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle pass type change and auto-fill days
  const handlePassTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setForm((f) => ({
      ...f,
      pass_type_id: selectedId,
    }));

    // Find the selected pass type object
    const selectedPassType = passTypes.find((pt) => String(pt.id) === selectedId);
    if (selectedPassType) {
      // Extract number of days from description (e.g. "Valid for 1 day")
      const match = selectedPassType.description.match(/(\d+)/);
      const daysValue = match ? match[1] : "";
      setForm((f) => ({
        ...f,
        days: daysValue,
      }));
    } else {
      setForm((f) => ({ ...f, days: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(
      {
        name: form.name,
        price: Number(form.price),
        days_valid: Number(form.days),
        description: form.description,
        pass_type_id: Number(form.pass_type_id),
      },
      () => {
        setOpen(false);
        setForm({ name: "", price: "", days: "", description: "", pass_type_id: "" });
      }
    );
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PlusCircle /> New Pass
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pass-name">Name</Label>
            <Input
              id="pass-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="pass-type">Pass Type</Label>
            <select
              id="pass-type"
              className="w-full rounded border p-2"
              required
              value={form.pass_type_id}
              onChange={handlePassTypeChange}
              disabled={isSubmitting}
            >
              <option value="">Select type</option>
              {passTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name} ({pt.description})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pass-days">Number of days</Label>
            <Input
              id="pass-days"
              type="number"
              min={1}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
              // Optional: make readonly to prevent changes if desired
              // readOnly
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="pass-price">Price (₹)</Label>
            <Input
              id="pass-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="pass-description">Description (optional)</Label>
            <Input
              id="pass-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2" /> : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function EditPassDialog({ passObj, passTypes, onSave }:
  { passObj: CafePass, passTypes: PassType[], onSave: (id: number, data: any, close: () => void) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: passObj.name, price: String(passObj.price), days_valid: String(passObj.days_valid),
    description: passObj.description ?? "", pass_type_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      name: passObj.name,
      price: String(passObj.price),
      days_valid: String(passObj.days_valid),
      description: passObj.description ?? "",
      pass_type_id: passTypes.find(pt => pt.name === passObj.pass_type)?.id?.toString() || ""
    });
    // eslint-disable-next-line
  }, [passObj]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(passObj.id, { ...form, price: Number(form.price), days_valid: Number(form.days_valid), pass_type_id: Number(form.pass_type_id) }, () => setOpen(false));
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4 text-emerald-600" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Pass Type</Label>
            <select
              className="w-full rounded border p-2"
              required
              value={form.pass_type_id}
              onChange={e => setForm(f => ({ ...f, pass_type_id: e.target.value }))}
            >
              <option value="">Select type</option>
              {passTypes.filter(pt => !pt.is_global).map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div><Label>Price (₹)</Label>
            <Input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
          </div>
          <div><Label>Validity (days)</Label>
            <Input type="number" min="1" value={form.days_valid} onChange={e => setForm(f => ({ ...f, days_valid: e.target.value }))} required />
          </div>
          <div><Label>Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader /> : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
