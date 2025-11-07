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
  return <Loader2 className="icon-md animate-spin text-blue-500" />;
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
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title flex items-center gap-2">
            <BadgeCheck className="icon-lg text-blue-500" /> 
            <span className="truncate">Manage Cafe Passes</span>
          </h1>
          <p className="page-subtitle mt-1">
            Create and manage cafe membership passes
          </p>
        </div>
        <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
      </header>

      {/* Content area */}
      {loading ? (
        <div className="flex justify-center items-center py-12 sm:py-16">
          <div className="text-center">
            <Loader />
            <p className="body-text-muted mt-2">Loading passes...</p>
          </div>
        </div>
      ) : (
        <div className="w-full">
          {passes.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 sm:p-12 text-center">
              <BadgeCheck className="icon-xl text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="section-title mb-2">No passes found</h3>
              <p className="body-text-muted mb-4">
                Add your first pass to get started
              </p>
              <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-compact">
              {passes.map(pass => (
                <Card key={pass.id} className="content-card shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-start justify-between content-card-padding-compact border-b border-border">
                    <div className="min-w-0 flex-1 pr-2">
                      <h2 className="card-title truncate">{pass.name}</h2>
                      <div className="body-text-small flex items-center gap-2 mt-1">
                        <BadgeCheck className="icon-sm text-blue-500 shrink-0" />
                        <span className="truncate">{pass.pass_type}</span>
                        <span className="shrink-0">• Valid {pass.days_valid} days</span>
                      </div>
                      {pass.description && (
                        <div className="mt-1 sm:mt-2 body-text-small line-clamp-2">
                          {pass.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <EditPassDialog passTypes={passTypes} passObj={pass} onSave={handleEditPass} />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePass(pass.id)}
                        disabled={deletingId === pass.id}
                        aria-label={`Delete pass ${pass.name}`}
                        className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-destructive/10"
                      >
                        {deletingId === pass.id ? (
                          <Loader />
                        ) : (
                          <Trash2 className="icon-md text-destructive" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="content-card-padding">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="price-medium text-primary">₹{pass.price}</div>
                        <div className="body-text-small">
                          Per {pass.days_valid} day{pass.days_valid > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="body-text-small">Valid for</div>
                        <div className="body-text font-semibold">
                          {pass.days_valid} day{pass.days_valid > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
        <Button className="btn-primary whitespace-nowrap">
          <PlusCircle className="icon-md" /> 
          <span className="hidden xs:inline">New Pass</span>
          <span className="xs:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
        <DialogTitle className="section-title">Add New Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label htmlFor="pass-name" className="form-label">Name *</Label>
            <Input
              id="pass-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={isSubmitting}
              className="input-field"
              placeholder="e.g. Daily Pass, Weekly Pass"
            />
          </div>
          <div>
            <Label htmlFor="pass-type" className="form-label">Pass Type *</Label>
            <select
              id="pass-type"
              className="select-field"
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
            <Label htmlFor="pass-days" className="form-label">Number of days *</Label>
            <Input
              id="pass-days"
              type="number"
              min={1}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
              disabled={isSubmitting}
              className="input-field"
              placeholder="e.g. 1, 7, 30"
            />
          </div>
          <div>
            <Label htmlFor="pass-price" className="form-label">Price (₹) *</Label>
            <Input
              id="pass-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              disabled={isSubmitting}
              className="input-field"
              placeholder="e.g. 100, 500"
            />
          </div>
          <div>
            <Label htmlFor="pass-description" className="form-label">Description (optional)</Label>
            <Input
              id="pass-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isSubmitting}
              className="input-field"
              placeholder="Brief description of the pass"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting} className="btn-secondary w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-md mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Pass"
              )}
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
    name: passObj.name, 
    price: String(passObj.price), 
    days_valid: String(passObj.days_valid),
    description: passObj.description ?? "", 
    pass_type_id: ""
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
    await onSave(passObj.id, { 
      ...form, 
      price: Number(form.price), 
      days_valid: Number(form.days_valid), 
      pass_type_id: Number(form.pass_type_id) 
    }, () => setOpen(false));
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent">
          <Pencil className="icon-md text-emerald-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
        <DialogTitle className="section-title">Edit Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label className="form-label">Name *</Label>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="input-field"
            />
          </div>
          <div>
            <Label className="form-label">Pass Type *</Label>
            <select
              className="select-field"
              required
              value={form.pass_type_id}
              onChange={e => setForm(f => ({ ...f, pass_type_id: e.target.value }))}
              disabled={isSubmitting}
            >
              <option value="">Select type</option>
              {passTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="form-label">Price (₹) *</Label>
            <Input 
              type="number" 
              min="1" 
              value={form.price} 
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="input-field"
            />
          </div>
          <div>
            <Label className="form-label">Validity (days) *</Label>
            <Input 
              type="number" 
              min="1" 
              value={form.days_valid} 
              onChange={e => setForm(f => ({ ...f, days_valid: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="input-field"
            />
          </div>
          <div>
            <Label className="form-label">Description (optional)</Label>
            <Input 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              disabled={isSubmitting}
              className="input-field"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting} className="btn-secondary w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-md mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}