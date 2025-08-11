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
    <div className="min-h-screen bg-background text-foreground">
      {/* Full-width container like dashboard */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Responsive header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
              <BadgeCheck className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" /> 
              <span className="truncate">Manage Cafe Passes</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">Loading passes...</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {passes.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 sm:p-12 text-center">
                <BadgeCheck className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-medium text-foreground mb-2">No passes found</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Add your first pass to get started
                </p>
                <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {passes.map(pass => (
                  <Card key={pass.id} className="bg-card border border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-start justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
                      <div className="min-w-0 flex-1 pr-2">
                        <h2 className="font-semibold text-base sm:text-lg text-foreground truncate">{pass.name}</h2>
                        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <BadgeCheck className="inline h-3 w-3 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
                          <span className="truncate">{pass.pass_type}</span>
                          <span className="shrink-0">• Valid {pass.days_valid} days</span>
                        </div>
                        {pass.description && (
                          <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2">
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
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-primary text-xl sm:text-2xl">₹{pass.price}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Per {pass.days_valid} day{pass.days_valid > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm text-muted-foreground">Valid for</div>
                          <div className="font-semibold text-sm sm:text-base text-foreground">
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
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base whitespace-nowrap">
          <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4" /> 
          <span className="hidden xs:inline">New Pass</span>
          <span className="xs:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
        <DialogTitle className="text-foreground text-lg sm:text-xl">Add New Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label htmlFor="pass-name" className="text-foreground text-sm">Name *</Label>
            <Input
              id="pass-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
              placeholder="e.g. Daily Pass, Weekly Pass"
            />
          </div>
          <div>
            <Label htmlFor="pass-type" className="text-foreground text-sm">Pass Type *</Label>
            <select
              id="pass-type"
              className="w-full rounded-lg border border-input bg-input text-foreground p-2 text-sm"
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
            <Label htmlFor="pass-days" className="text-foreground text-sm">Number of days *</Label>
            <Input
              id="pass-days"
              type="number"
              min={1}
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
              placeholder="e.g. 1, 7, 30"
            />
          </div>
          <div>
            <Label htmlFor="pass-price" className="text-foreground text-sm">Price (₹) *</Label>
            <Input
              id="pass-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
              placeholder="e.g. 100, 500"
            />
          </div>
          <div>
            <Label htmlFor="pass-description" className="text-foreground text-sm">Description (optional)</Label>
            <Input
              id="pass-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
              placeholder="Brief description of the pass"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
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
          <Pencil className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
        <DialogTitle className="text-foreground text-lg sm:text-xl">Edit Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <Label className="text-foreground text-sm">Name *</Label>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
            />
          </div>
          <div>
            <Label className="text-foreground text-sm">Pass Type *</Label>
            <select
              className="w-full rounded-lg border border-input bg-input text-foreground p-2 text-sm"
              required
              value={form.pass_type_id}
              onChange={e => setForm(f => ({ ...f, pass_type_id: e.target.value }))}
              disabled={isSubmitting}
            >
              <option value="">Select type</option>
              {passTypes.filter(pt => !pt.is_global).map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-foreground text-sm">Price (₹) *</Label>
            <Input 
              type="number" 
              min="1" 
              value={form.price} 
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
            />
          </div>
          <div>
            <Label className="text-foreground text-sm">Validity (days) *</Label>
            <Input 
              type="number" 
              min="1" 
              value={form.days_valid} 
              onChange={e => setForm(f => ({ ...f, days_valid: e.target.value }))} 
              required 
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
            />
          </div>
          <div>
            <Label className="text-foreground text-sm">Description (optional)</Label>
            <Input 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              disabled={isSubmitting}
              className="bg-input border-input text-foreground text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
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
