// // app/pass/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Card, CardHeader, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Dialog,
//   DialogTrigger,
//   DialogContent,
//   DialogClose,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { BadgeCheck, Pencil, Trash2, PlusCircle, Loader2, Clock, Calendar } from "lucide-react";
// import { DASHBOARD_URL } from "@/src/config/env";

// function Loader() {
//   return <Loader2 className="icon-md animate-spin text-blue-500" />;
// }

// const VENDOR_ID =
//   typeof window !== "undefined"
//     ? localStorage.getItem("selectedCafe")
//     : "1";

// // Updated types to support hour-based passes
// type PassType = {
//   id: number;
//   name: string;
//   description?: string;
// };

// type CafePass = {
//   id: number;
//   name: string;
//   price: number;
//   description?: string;
//   pass_type?: string;
  
//   // Support both pass modes
//   pass_mode: 'date_based' | 'hour_based';
  
//   // BOTH types need days_valid (expiry)
//   days_valid: number;
  
//   // Hour-based specific fields
//   total_hours?: number;
//   hour_calculation_mode?: 'actual_duration' | 'vendor_config';
//   hours_per_slot?: number;
// };

// export default function ManagePassesPage() {
//   const [passes, setPasses] = useState<CafePass[]>([]);
//   const [passTypes, setPassTypes] = useState<PassType[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [deletingId, setDeletingId] = useState<number | null>(null);

//   // 1. ADD THIS NEW STATE
//   const [hasMounted, setHasMounted] = useState(false);


// // --- ADD THESE LOGS HERE ---
//   console.log("DEBUG: Current VENDOR_ID is:", VENDOR_ID);
//   console.log("DEBUG: Current Loading State:", loading);
//   console.log("DEBUG: Passes in State:", passes);
// //----------------------


//   // Get Pass types and Cafe passes (on mount)
//   useEffect(() => {
//     setHasMounted(true);


//     const fetchData = async () => {
//       setLoading(true);
//       try {
//        // console.log("DEBUG: Fetching from URL:", `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);

//        const VENDOR_ID = localStorage.getItem("selectedCafe") || "1";
//         const [typesRes, passesRes] = await Promise.all([
//           axios.get(`${DASHBOARD_URL}/api/pass_types`),
//           axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`)
//         ]);

//         console.log("DEBUG: API Response for Passes:", passesRes.data);

//         setPassTypes(typesRes.data);
        
//         // Handle both response formats
//         const passesData = passesRes.data.passes || passesRes.data;
//         setPasses(passesData);
//       } catch (error) {
//         console.error("Failed to fetch data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // CRUD handlers
//   const handleAddPass = async (
//     data: Omit<CafePass, "id" | "pass_type">,
//     close: () => void
//   ) => {
//     try {
//       // ✅ FIXED: Use correct URL without /create
//       await axios.post(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`, data);
      
//       // Refresh passes list
//       const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
//       const passesData = passesRes.passes || passesRes;
//       setPasses(passesData);
//       close();
//     } catch (error: any) {
//       console.error("Failed to create pass:", error);
//       const errorMsg = error.response?.data?.error || "Failed to create pass";
//       alert(`Error: ${errorMsg}`);
//     }
//   };

//   const handleEditPass = async (
//     id: number,
//     data: Partial<CafePass>,
//     close: () => void
//   ) => {
//     try {
//       await axios.put(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes/${id}`, data);
      
//       // Refresh passes list
//       const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
//       const passesData = passesRes.passes || passesRes;
//       setPasses(passesData);
//       close();
//     } catch (error: any) {
//       console.error("Failed to update pass:", error);
//       const errorMsg = error.response?.data?.error || "Failed to update pass";
//       alert(`Error: ${errorMsg}`);
//     }
//   };

//   const handleDeletePass = async (id: number) => {
//     setDeletingId(id);
//     try {
//       await axios.delete(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes/${id}`);
      
//       // Refresh passes after deactivation
//       const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/passes`);
//       const passesData = passesRes.passes || passesRes;
//       setPasses(passesData);
//     } catch (error: any) {
//       console.error("Failed to delete pass:", error);
//       const errorMsg = error.response?.data?.error || "Failed to delete pass";
//       alert(`Error: ${errorMsg}`);
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   // Separate passes by mode
//   const datePasses = passes.filter(p => p.pass_mode === 'date_based');
//   const hourPasses = passes.filter(p => p.pass_mode === 'hour_based');

//   return (
//     <div className="page-container">
//       {/* Header */}
//       <header className="page-header">
//         <div className="page-title-section">
//           <h1 className="page-title flex items-center gap-2">
//             <BadgeCheck className="icon-lg text-blue-500" /> 
//             <span className="truncate">Manage Cafe Passes</span>
//           </h1>
//           <p className="page-subtitle mt-1">
//             Create date-based and hour-based membership passes
//           </p>
//         </div>
//         <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
//       </header>

//       {/* Content area */}
//       {loading ? (
//         <div className="flex justify-center items-center py-12 sm:py-16">
//           <div className="text-center">
//             <Loader />
//             <p className="body-text-muted mt-2">Loading passes...</p>
//           </div>
//         </div>
//       ) : (
//         <div className="w-full space-y-8">
//           {passes.length === 0 ? (
//             <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 sm:p-12 text-center">
//               <BadgeCheck className="icon-xl text-muted-foreground/50 mx-auto mb-4" />
//               <h3 className="section-title mb-2">No passes found</h3>
//               <p className="body-text-muted mb-4">
//                 Add your first pass to get started
//               </p>
//               <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
//             </div>
//           ) : (
//             <>
//               {/* Hour-Based Passes Section */}
//               {hourPasses.length > 0 && (
//                 <div>
//                   <div className="flex items-center gap-2 mb-4">
//                     <Clock className="icon-lg text-blue-500" />
//                     <h2 className="text-xl font-semibold">Hour-Based Passes</h2>
//                     <span className="text-sm text-muted-foreground">({hourPasses.length})</span>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-compact">
//                     {hourPasses.map(pass => (
//                       <PassCard 
//                         key={pass.id} 
//                         pass={pass} 
//                         passTypes={passTypes}
//                         onEdit={handleEditPass}
//                         onDelete={handleDeletePass}
//                         deletingId={deletingId}
//                       />
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Date-Based Passes Section */}
//               {datePasses.length > 0 && (
//                 <div>
//                   <div className="flex items-center gap-2 mb-4">
//                     <Calendar className="icon-lg text-emerald-500" />
//                     <h2 className="text-xl font-semibold">Date-Based Passes</h2>
//                     <span className="text-sm text-muted-foreground">({datePasses.length})</span>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-compact">
//                     {datePasses.map(pass => (
//                       <PassCard 
//                         key={pass.id} 
//                         pass={pass} 
//                         passTypes={passTypes}
//                         onEdit={handleEditPass}
//                         onDelete={handleDeletePass}
//                         deletingId={deletingId}
//                       />
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // --- Pass Card Component ---
// function PassCard({ 
//   pass, 
//   passTypes,
//   onEdit, 
//   onDelete, 
//   deletingId 
// }: { 
//   pass: CafePass; 
//   passTypes: PassType[];
//   onEdit: (id: number, data: any, close: () => void) => Promise<void>;
//   onDelete: (id: number) => Promise<void>;
//   deletingId: number | null;
// }) {
//   const isHourBased = pass.pass_mode === 'hour_based';
  
//   return (
//     <Card className="content-card shadow-lg hover:shadow-xl transition-shadow duration-300">
//       <CardHeader className="flex flex-row items-start justify-between content-card-padding-compact border-b border-border">
//         <div className="min-w-0 flex-1 pr-2">
//           <h2 className="card-title truncate">{pass.name}</h2>
//           <div className="body-text-small flex items-center gap-2 mt-1">
//             {isHourBased ? (
//               <>
//                 <Clock className="icon-sm text-blue-500 shrink-0" />
//                 <span className="truncate">Hour-Based</span>
//                 <span className="shrink-0">• {pass.total_hours}hrs</span>
//               </>
//             ) : (
//               <>
//                 <Calendar className="icon-sm text-emerald-500 shrink-0" />
//                 <span className="truncate">{pass.pass_type || 'Date-Based'}</span>
//                 <span className="shrink-0">• {pass.days_valid} days</span>
//               </>
//             )}
//           </div>
//           {/* ✅ FIXED: Show expiry for hour-based passes */}
//           {isHourBased && (
//             <div className="mt-1 text-xs text-muted-foreground">
//               Valid for {pass.days_valid} days
//             </div>
//           )}
//           {pass.description && (
//             <div className="mt-1 sm:mt-2 body-text-small line-clamp-2">
//               {pass.description}
//             </div>
//           )}
//         </div>
//         <div className="flex gap-1 shrink-0">
//           <EditPassDialog passTypes={passTypes} passObj={pass} onSave={onEdit} />
//           <Button
//             size="icon"
//             variant="ghost"
//             onClick={() => onDelete(pass.id)}
//             disabled={deletingId === pass.id}
//             aria-label={`Delete pass ${pass.name}`}
//             className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-destructive/10"
//           >
//             {deletingId === pass.id ? (
//               <Loader />
//             ) : (
//               <Trash2 className="icon-md text-destructive" />
//             )}
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent className="content-card-padding">
//         <div className="flex items-center justify-between">
//           <div>
//             <div className="price-medium text-primary">₹{pass.price}</div>
//             <div className="body-text-small">
//               {isHourBased ? `${pass.total_hours}hrs in ${pass.days_valid}d` : `${pass.days_valid} days`}
//             </div>
//           </div>
//           <div className="text-right">
//             {isHourBased ? (
//               <>
//                 <div className="body-text-small">Total Hours</div>
//                 <div className="body-text font-semibold">{pass.total_hours}hrs</div>
//                 <div className="text-xs text-muted-foreground mt-1">
//                   {pass.hour_calculation_mode === 'actual_duration' ? 'Actual Time' : 'Per Slot'}
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className="body-text-small">Valid for</div>
//                 <div className="body-text font-semibold">
//                   {pass.days_valid} day{pass.days_valid > 1 ? 's' : ''}
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// // --- Add Pass Dialog ---
// function AddPassDialog({
//   passTypes,
//   onSave,
// }: {
//   passTypes: PassType[];
//   onSave: (data: any, close: () => void) => Promise<void>;
// }) {
//   const [open, setOpen] = useState(false);
//   const [passMode, setPassMode] = useState<'date_based' | 'hour_based'>('date_based');
//   const [form, setForm] = useState({
//     name: "",
//     price: "",
//     description: "",
//     pass_type_id: "",
//     days_valid: "",  // ✅ Required for BOTH types
//     total_hours: "",
//     hour_calculation_mode: "actual_duration",
//     hours_per_slot: "",
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
    
//     // ✅ FIXED: days_valid required for both types
//     const baseData = {
//       name: form.name,
//       price: Number(form.price),
//       days_valid: Number(form.days_valid),  // Always include
//       description: form.description || undefined,
//       pass_mode: passMode,
//       pass_type_id: form.pass_type_id ? Number(form.pass_type_id) : undefined,
//     };
    
//     const payload = passMode === 'hour_based'
//       ? {
//           ...baseData,
//           total_hours: Number(form.total_hours),
//           hour_calculation_mode: form.hour_calculation_mode,
//           hours_per_slot: form.hour_calculation_mode === 'vendor_config' 
//             ? Number(form.hours_per_slot) 
//             : undefined,
//         }
//       : baseData;
    
//     await onSave(payload, () => {
//       setOpen(false);
//       setForm({
//         name: "",
//         price: "",
//         description: "",
//         pass_type_id: "",
//         days_valid: "",
//         total_hours: "",
//         hour_calculation_mode: "actual_duration",
//         hours_per_slot: "",
//       });
//       setPassMode('date_based');
//     });
//     setIsSubmitting(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button className="btn-primary whitespace-nowrap">
//           <PlusCircle className="icon-md" /> 
//           <span className="hidden xs:inline">New Pass</span>
//           <span className="xs:hidden">New</span>
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[550px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
//         <DialogTitle className="section-title">Add New Pass</DialogTitle>
//         <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh] px-1">
          
//           {/* Pass Mode Selector */}
//           <div className="flex gap-2 p-1 bg-muted rounded-lg">
//             <button
//               type="button"
//               onClick={() => setPassMode('date_based')}
//               className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
//                 passMode === 'date_based'
//                   ? 'bg-primary text-primary-foreground shadow-sm'
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               <Calendar className="icon-sm inline mr-1" />
//               Date-Based
//             </button>
//             <button
//               type="button"
//               onClick={() => setPassMode('hour_based')}
//               className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
//                 passMode === 'hour_based'
//                   ? 'bg-primary text-primary-foreground shadow-sm'
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               <Clock className="icon-sm inline mr-1" />
//               Hour-Based
//             </button>
//           </div>

//           {/* Common Fields */}
//           <div>
//             <Label htmlFor="pass-name" className="form-label">Pass Name *</Label>
//             <Input
//               id="pass-name"
//               value={form.name}
//               onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
//               required
//               disabled={isSubmitting}
//               className="input-field"
//               placeholder={passMode === 'date_based' ? 'e.g., Monthly Pass' : 'e.g., 10 Hour Pack'}
//             />
//           </div>

//           <div>
//             <Label htmlFor="pass-price" className="form-label">Price (₹) *</Label>
//             <Input
//               id="pass-price"
//               type="number"
//               min={0}
//               step={0.01}
//               value={form.price}
//               onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
//               required
//               disabled={isSubmitting}
//               className="input-field"
//               placeholder="e.g., 500"
//             />
//           </div>

//           {/* ✅ FIXED: Always show days_valid for BOTH types */}
//           <div>
//             <Label htmlFor="pass-days" className="form-label">
//               {passMode === 'date_based' ? 'Validity Period (days) *' : 'Expiry Period (days) *'}
//             </Label>
//             <Input
//               id="pass-days"
//               type="number"
//               min={1}
//               value={form.days_valid}
//               onChange={(e) => setForm((f) => ({ ...f, days_valid: e.target.value }))}
//               required
//               disabled={isSubmitting}
//               className="input-field"
//               placeholder={passMode === 'date_based' ? 'e.g., 30' : 'e.g., 90'}
//             />
//             <p className="text-xs text-muted-foreground mt-1">
//               {passMode === 'date_based' 
//                 ? 'Unlimited play for this many days' 
//                 : 'Hours must be used within this period'}
//             </p>
//           </div>

//           <div>
//             <Label htmlFor="pass-type" className="form-label">Pass Type</Label>
//             <select
//               id="pass-type"
//               className="select-field"
//               value={form.pass_type_id}
//               onChange={(e) => setForm((f) => ({ ...f, pass_type_id: e.target.value }))}
//               disabled={isSubmitting}
//             >
//               <option value="">Select type (optional)</option>
//               {passTypes.map((pt) => (
//                 <option key={pt.id} value={pt.id}>
//                   {pt.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Hour-Based Specific Fields */}
//           {passMode === 'hour_based' && (
//             <>
//               <div>
//                 <Label htmlFor="total-hours" className="form-label">Total Hours *</Label>
//                 <Input
//                   id="total-hours"
//                   type="number"
//                   min={0.5}
//                   step={0.5}
//                   value={form.total_hours}
//                   onChange={(e) => setForm((f) => ({ ...f, total_hours: e.target.value }))}
//                   required
//                   disabled={isSubmitting}
//                   className="input-field"
//                   placeholder="e.g., 10"
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="calc-mode" className="form-label">Hour Calculation Mode *</Label>
//                 <select
//                   id="calc-mode"
//                   className="select-field"
//                   value={form.hour_calculation_mode}
//                   onChange={(e) => setForm((f) => ({ ...f, hour_calculation_mode: e.target.value }))}
//                   disabled={isSubmitting}
//                 >
//                   <option value="actual_duration">Actual Duration (slot time)</option>
//                   <option value="vendor_config">Fixed Hours Per Slot</option>
//                 </select>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   {form.hour_calculation_mode === 'actual_duration'
//                     ? 'Hours deducted based on slot duration (e.g., 1.5hr slot = 1.5hrs)'
//                     : 'Fixed hours per slot regardless of duration'}
//                 </p>
//               </div>

//               {form.hour_calculation_mode === 'vendor_config' && (
//                 <div>
//                   <Label htmlFor="hours-per-slot" className="form-label">Hours Per Slot *</Label>
//                   <Input
//                     id="hours-per-slot"
//                     type="number"
//                     min={0.5}
//                     step={0.5}
//                     value={form.hours_per_slot}
//                     onChange={(e) => setForm((f) => ({ ...f, hours_per_slot: e.target.value }))}
//                     required
//                     disabled={isSubmitting}
//                     className="input-field"
//                     placeholder="e.g., 1"
//                   />
//                   <p className="text-xs text-muted-foreground mt-1">
//                     Each booking will deduct this many hours
//                   </p>
//                 </div>
//               )}
//             </>
//           )}

//           <div>
//             <Label htmlFor="pass-description" className="form-label">Description</Label>
//             <Input
//               id="pass-description"
//               value={form.description}
//               onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
//               disabled={isSubmitting}
//               className="input-field"
//               placeholder="Brief description"
//             />
//           </div>

//           <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
//             <DialogClose asChild>
//               <Button variant="outline" disabled={isSubmitting} className="btn-secondary w-full sm:w-auto">
//                 Cancel
//               </Button>
//             </DialogClose>
//             <Button 
//               type="submit" 
//               disabled={isSubmitting}
//               className="btn-primary w-full sm:w-auto"
//             >
//               {isSubmitting ? (
//                 <>
//                   <Loader2 className="icon-md mr-2 animate-spin" />
//                   Creating...
//                 </>
//               ) : (
//                 "Create Pass"
//               )}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

// // --- Edit Pass Dialog ---
// function EditPassDialog({ 
//   passObj, 
//   passTypes, 
//   onSave 
// }: {
//   passObj: CafePass;
//   passTypes: PassType[];
//   onSave: (id: number, data: any, close: () => void) => Promise<void>;
// }) {
//   const [open, setOpen] = useState(false);
//   const [form, setForm] = useState({
//     name: passObj.name,
//     price: String(passObj.price),
//     description: passObj.description ?? "",
//     pass_type_id: "",
//     days_valid: String(passObj.days_valid || ""),
//     total_hours: String(passObj.total_hours || ""),
//     hour_calculation_mode: passObj.hour_calculation_mode || "actual_duration",
//     hours_per_slot: String(passObj.hours_per_slot || ""),
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     setForm({
//       name: passObj.name,
//       price: String(passObj.price),
//       description: passObj.description ?? "",
//       pass_type_id: passTypes.find(pt => pt.name === passObj.pass_type)?.id?.toString() || "",
//       days_valid: String(passObj.days_valid || ""),
//       total_hours: String(passObj.total_hours || ""),
//       hour_calculation_mode: passObj.hour_calculation_mode || "actual_duration",
//       hours_per_slot: String(passObj.hours_per_slot || ""),
//     });
//   }, [passObj, passTypes]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     const payload: any = {
//       name: form.name,
//       price: Number(form.price),
//       days_valid: Number(form.days_valid),  // ✅ Always include
//       description: form.description || undefined,
//       pass_type_id: form.pass_type_id ? Number(form.pass_type_id) : undefined,
//     };

//     if (passObj.pass_mode === 'hour_based') {
//       payload.total_hours = Number(form.total_hours);
//       payload.hour_calculation_mode = form.hour_calculation_mode;
//       if (form.hour_calculation_mode === 'vendor_config') {
//         payload.hours_per_slot = Number(form.hours_per_slot);
//       }
//     }

//     await onSave(passObj.id, payload, () => setOpen(false));
//     setIsSubmitting(false);
//   };

//   const isHourBased = passObj.pass_mode === 'hour_based';

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent">
//           <Pencil className="icon-md text-emerald-600" />
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
//         <DialogTitle className="section-title">
//           Edit {isHourBased ? 'Hour-Based' : 'Date-Based'} Pass
//         </DialogTitle>
//         <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh] px-1">
//           <div>
//             <Label className="form-label">Name *</Label>
//             <Input 
//               value={form.name} 
//               onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
//               required 
//               disabled={isSubmitting}
//               className="input-field"
//             />
//           </div>

//           <div>
//             <Label className="form-label">Price (₹) *</Label>
//             <Input 
//               type="number" 
//               min="0" 
//               step="0.01"
//               value={form.price} 
//               onChange={e => setForm(f => ({ ...f, price: e.target.value }))} 
//               required 
//               disabled={isSubmitting}
//               className="input-field"
//             />
//           </div>

//           {/* ✅ FIXED: Always show days_valid */}
//           <div>
//             <Label className="form-label">
//               {isHourBased ? 'Expiry Period (days) *' : 'Validity Period (days) *'}
//             </Label>
//             <Input 
//               type="number" 
//               min="1" 
//               value={form.days_valid} 
//               onChange={e => setForm(f => ({ ...f, days_valid: e.target.value }))} 
//               required 
//               disabled={isSubmitting}
//               className="input-field"
//             />
//             <p className="text-xs text-muted-foreground mt-1">
//               {isHourBased 
//                 ? 'Hours must be used within this period' 
//                 : 'Unlimited play for this period'}
//             </p>
//           </div>

//           <div>
//             <Label className="form-label">Pass Type</Label>
//             <select
//               className="select-field"
//               value={form.pass_type_id}
//               onChange={e => setForm(f => ({ ...f, pass_type_id: e.target.value }))}
//               disabled={isSubmitting}
//             >
//               <option value="">Select type (optional)</option>
//               {passTypes.map(pt => (
//                 <option key={pt.id} value={pt.id}>{pt.name}</option>
//               ))}
//             </select>
//           </div>

//           {isHourBased && (
//             <>
//               <div>
//                 <Label className="form-label">Total Hours *</Label>
//                 <Input 
//                   type="number" 
//                   min="0.5" 
//                   step="0.5"
//                   value={form.total_hours} 
//                   onChange={e => setForm(f => ({ ...f, total_hours: e.target.value }))} 
//                   required 
//                   disabled={isSubmitting}
//                   className="input-field"
//                 />
//               </div>

//               <div>
//                 <Label className="form-label">Hour Calculation Mode *</Label>
//                 <select
//                   className="select-field"
//                   value={form.hour_calculation_mode}
//                   onChange={e => setForm(f => ({ ...f, hour_calculation_mode: e.target.value }))}
//                   disabled={isSubmitting}
//                 >
//                   <option value="actual_duration">Actual Duration</option>
//                   <option value="vendor_config">Fixed Hours Per Slot</option>
//                 </select>
//               </div>

//               {form.hour_calculation_mode === 'vendor_config' && (
//                 <div>
//                   <Label className="form-label">Hours Per Slot *</Label>
//                   <Input 
//                     type="number" 
//                     min="0.5" 
//                     step="0.5"
//                     value={form.hours_per_slot} 
//                     onChange={e => setForm(f => ({ ...f, hours_per_slot: e.target.value }))} 
//                     required 
//                     disabled={isSubmitting}
//                     className="input-field"
//                   />
//                 </div>
//               )}
//             </>
//           )}

//           <div>
//             <Label className="form-label">Description</Label>
//             <Input 
//               value={form.description} 
//               onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
//               disabled={isSubmitting}
//               className="input-field"
//             />
//           </div>

//           <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
//             <DialogClose asChild>
//               <Button variant="outline" disabled={isSubmitting} className="btn-secondary w-full sm:w-auto">
//                 Cancel
//               </Button>
//             </DialogClose>
//             <Button 
//               type="submit" 
//               disabled={isSubmitting}
//               className="btn-primary w-full sm:w-auto"
//             >
//               {isSubmitting ? (
//                 <>
//                   <Loader2 className="icon-md mr-2 animate-spin" />
//                   Saving...
//                 </>
//               ) : (
//                 "Save Changes"
//               )}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }



///      -------------------                                 ------------------

// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Card, CardHeader, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Dialog,
//   DialogTrigger,
//   DialogContent,
//   DialogClose,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { BadgeCheck, Pencil, Trash2, PlusCircle, Loader2, Clock, Calendar } from "lucide-react";
// import { DASHBOARD_URL } from "@/src/config/env";

// // --- Components ---

// function Loader() {
//   return <Loader2 className="icon-md animate-spin text-blue-500" />;
// }

// // --- Types ---

// type PassType = {
//   id: number;
//   name: string;
//   description?: string;
// };

// type CafePass = {
//   id: number;
//   name: string;
//   price: number;
//   description?: string;
//   pass_type?: string;
//   pass_mode: 'date_based' | 'hour_based';
//   days_valid: number;
//   total_hours?: number;
//   hour_calculation_mode?: 'actual_duration' | 'vendor_config';
//   hours_per_slot?: number;
// };

// // --- Main Page Component ---

// export default function ManagePassesPage() {
//   const [passes, setPasses] = useState<CafePass[]>([]);
//   const [passTypes, setPassTypes] = useState<PassType[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [deletingId, setDeletingId] = useState<number | null>(null);
  
//   // State to handle Hydration and Vendor ID
//   const [hasMounted, setHasMounted] = useState(false);
//   const [activeVendorId, setActiveVendorId] = useState<string>("1");

//   useEffect(() => {
//     // 1. Mark as mounted to prevent Hydration Error #418
//     setHasMounted(true);
    
//     // 2. Get the correct Vendor ID from LocalStorage
//     const savedId = localStorage.getItem("selectedCafe") || "1";
//     setActiveVendorId(savedId);
  
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         const [typesRes, passesRes] = await Promise.all([
//           axios.get(`${DASHBOARD_URL}/api/pass_types`),
//           axios.get(`${DASHBOARD_URL}/api/vendor/${savedId}/passes`)
//         ]);
        
//         setPassTypes(typesRes.data);
//         const passesData = passesRes.data.passes || passesRes.data;
//         setPasses(passesData);
//       } catch (error) {
//         console.error("Failed to fetch data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // Hydration Guard: Don't render complex UI until browser is ready
//   if (!hasMounted) {
//     return (
//       <div className="flex justify-center items-center min-h-[400px]">
//         <Loader />
//       </div>
//     );
//   }

//   // --- Handlers ---

//   const refreshPasses = async () => {
//     try {
//       const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`);
//       const passesData = passesRes.passes || passesRes;
//       setPasses(passesData);
//     } catch (error) {
//       console.error("Failed to refresh:", error);
//     }
//   };

//   const handleAddPass = async (data: any, close: () => void) => {
//     try {
//       await axios.post(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`, data);
//       await refreshPasses();
//       close();
//     } catch (error: any) {
//       alert(`Error: ${error.response?.data?.error || "Failed to create pass"}`);
//     }
//   };

//   const handleEditPass = async (id: number, data: any, close: () => void) => {
//     try {
//       await axios.put(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`, data);
//       await refreshPasses();
//       close();
//     } catch (error: any) {
//       alert(`Error: ${error.response?.data?.error || "Failed to update pass"}`);
//     }
//   };

//   const handleDeletePass = async (id: number) => {
//     if (!confirm("Are you sure you want to delete this pass?")) return;
//     setDeletingId(id);
//     try {
//       await axios.delete(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`);
//       await refreshPasses();
//     } catch (error: any) {
//       alert(`Error: ${error.response?.data?.error || "Failed to delete pass"}`);
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const datePasses = passes.filter(p => p.pass_mode === 'date_based');
//   const hourPasses = passes.filter(p => p.pass_mode === 'hour_based');

//   return (
//     <div className="page-container">
//       <header className="page-header">
//         <div className="page-title-section">
//           <h1 className="page-title flex items-center gap-2">
//             <BadgeCheck className="icon-lg text-blue-500" /> 
//             <span className="truncate">Manage Cafe Passes</span>
//           </h1>
//           <p className="page-subtitle mt-1">
//             Create date-based and hour-based membership passes
//           </p>
//         </div>
//         <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
//       </header>

//       {loading ? (
//         <div className="flex justify-center items-center py-16">
//           <div className="text-center">
//             <Loader />
//             <p className="body-text-muted mt-2">Loading passes...</p>
//           </div>
//         </div>
//       ) : (
//         <div className="w-full space-y-8">
//           {passes.length === 0 ? (
//             <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
//               <BadgeCheck className="icon-xl text-muted-foreground/50 mx-auto mb-4" />
//               <h3 className="section-title mb-2">No passes found</h3>
//               <p className="body-text-muted mb-4">Add your first pass to get started</p>
//               <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
//             </div>
//           ) : (
//             <>
//               {hourPasses.length > 0 && (
//                 <div>
//                   <div className="flex items-center gap-2 mb-4">
//                     <Clock className="icon-lg text-blue-500" />
//                     <h2 className="text-xl font-semibold">Hour-Based Passes</h2>
//                     <span className="text-sm text-muted-foreground">({hourPasses.length})</span>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-compact">
//                     {hourPasses.map(pass => (
//                       <PassCard key={pass.id} pass={pass} passTypes={passTypes} onEdit={handleEditPass} onDelete={handleDeletePass} deletingId={deletingId} />
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {datePasses.length > 0 && (
//                 <div>
//                   <div className="flex items-center gap-2 mb-4">
//                     <Calendar className="icon-lg text-emerald-500" />
//                     <h2 className="text-xl font-semibold">Date-Based Passes</h2>
//                     <span className="text-sm text-muted-foreground">({datePasses.length})</span>
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-compact">
//                     {datePasses.map(pass => (
//                       <PassCard key={pass.id} pass={pass} passTypes={passTypes} onEdit={handleEditPass} onDelete={handleDeletePass} deletingId={deletingId} />
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // --- Sub-Components (PassCard, AddDialog, EditDialog) ---
// // Note: Keep these exactly as you had them, ensuring they use the props passed from the main component.

// function PassCard({ pass, passTypes, onEdit, onDelete, deletingId }: any) {
//   const isHourBased = pass.pass_mode === 'hour_based';
//   return (
//     <Card className="content-card shadow-lg hover:shadow-xl transition-shadow duration-300">
//       <CardHeader className="flex flex-row items-start justify-between content-card-padding-compact border-b border-border">
//         <div className="min-w-0 flex-1 pr-2">
//           <h2 className="card-title truncate">{pass.name}</h2>
//           <div className="body-text-small flex items-center gap-2 mt-1">
//             {isHourBased ? (
//               <><Clock className="icon-sm text-blue-500 shrink-0" /><span>Hour-Based</span><span>• {pass.total_hours}hrs</span></>
//             ) : (
//               <><Calendar className="icon-sm text-emerald-500 shrink-0" /><span>{pass.pass_type || 'Date-Based'}</span><span>• {pass.days_valid} days</span></>
//             )}
//           </div>
//           {isHourBased && <div className="mt-1 text-xs text-muted-foreground">Valid for {pass.days_valid} days</div>}
//         </div>
//         <div className="flex gap-1 shrink-0">
//           <EditPassDialog passTypes={passTypes} passObj={pass} onSave={onEdit} />
//           <Button size="icon" variant="ghost" onClick={() => onDelete(pass.id)} disabled={deletingId === pass.id} className="w-8 h-8 hover:bg-destructive/10">
//             {deletingId === pass.id ? <Loader /> : <Trash2 className="icon-md text-destructive" />}
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent className="content-card-padding">
//         <div className="flex items-center justify-between">
//           <div>
//             <div className="price-medium text-primary">₹{pass.price}</div>
//             <div className="body-text-small">{isHourBased ? `${pass.total_hours}hrs / ${pass.days_valid}d` : `${pass.days_valid} days`}</div>
//           </div>
//           <div className="text-right">
//              <div className="body-text-small">{isHourBased ? 'Total Hours' : 'Valid for'}</div>
//              <div className="body-text font-semibold">{isHourBased ? `${pass.total_hours}hrs` : `${pass.days_valid} days`}</div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// function AddPassDialog({ passTypes, onSave }: any) {
//   const [open, setOpen] = useState(false);
//   const [passMode, setPassMode] = useState<'date_based' | 'hour_based'>('date_based');
//   const [form, setForm] = useState({
//     name: "", price: "", description: "", pass_type_id: "", days_valid: "", total_hours: "", hour_calculation_mode: "actual_duration", hours_per_slot: "",
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleSubmit = async (e: any) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     const payload = {
//       ...form,
//       price: Number(form.price),
//       days_valid: Number(form.days_valid),
//       pass_mode: passMode,
//       total_hours: passMode === 'hour_based' ? Number(form.total_hours) : undefined,
//       pass_type_id: form.pass_type_id ? Number(form.pass_type_id) : undefined,
//     };
//     await onSave(payload, () => {
//       setOpen(false);
//       setForm({ name: "", price: "", description: "", pass_type_id: "", days_valid: "", total_hours: "", hour_calculation_mode: "actual_duration", hours_per_slot: "" });
//     });
//     setIsSubmitting(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button className="btn-primary"><PlusCircle className="icon-md mr-2" /> New Pass</Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[550px] bg-card border border-border rounded-lg">
//         <DialogTitle className="section-title">Add New Pass</DialogTitle>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="flex gap-2 p-1 bg-muted rounded-lg">
//             <button type="button" onClick={() => setPassMode('date_based')} className={`flex-1 py-2 rounded-md ${passMode === 'date_based' ? 'bg-primary text-white' : ''}`}>Date-Based</button>
//             <button type="button" onClick={() => setPassMode('hour_based')} className={`flex-1 py-2 rounded-md ${passMode === 'hour_based' ? 'bg-primary text-white' : ''}`}>Hour-Based</button>
//           </div>
//           <Input placeholder="Pass Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
//           <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
//           <Input type="number" placeholder="Validity Days" value={form.days_valid} onChange={e => setForm({...form, days_valid: e.target.value})} required />
//           {passMode === 'hour_based' && (
//             <Input type="number" placeholder="Total Hours" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} required />
//           )}
//           <Button type="submit" disabled={isSubmitting} className="w-full">
//             {isSubmitting ? <Loader /> : "Create Pass"}
//           </Button>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

// function EditPassDialog({ passObj, passTypes, onSave }: any) {
//   const [open, setOpen] = useState(false);
//   const [form, setForm] = useState({
//     name: passObj.name, price: String(passObj.price), description: passObj.description || "", days_valid: String(passObj.days_valid), total_hours: String(passObj.total_hours || ""),
//   });

//   const handleSubmit = async (e: any) => {
//     e.preventDefault();
//     await onSave(passObj.id, { ...form, price: Number(form.price), days_valid: Number(form.days_valid) }, () => setOpen(false));
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button variant="ghost" size="icon"><Pencil className="icon-md text-emerald-600" /></Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[500px] bg-card border border-border">
//         <DialogTitle>Edit Pass</DialogTitle>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
//           <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
//           <Input type="number" value={form.days_valid} onChange={e => setForm({...form, days_valid: e.target.value})} />
//           <Button type="submit" className="w-full">Save Changes</Button>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

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
import { 
  BadgeCheck, 
  Pencil, 
  Trash2, 
  PlusCircle, 
  Loader2, 
  Clock, 
  Calendar, 
  LayoutGrid, 
  Table as TableIcon 
} from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";

// --- Components ---

function Loader() {
  return <Loader2 className="icon-md animate-spin text-blue-500" />;
}

// --- Types ---

type PassType = {
  id: number;
  name: string;
  description?: string;
};

type CafePass = {
  id: number;
  name: string;
  price: number;
  description?: string;
  pass_type?: string;
  pass_mode: 'date_based' | 'hour_based';
  days_valid: number;
  total_hours?: number;
  hour_calculation_mode?: 'actual_duration' | 'vendor_config';
  hours_per_slot?: number;
};

// --- Main Page Component ---

export default function ManagePassesPage() {
  const [passes, setPasses] = useState<CafePass[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // View Toggle State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [hasMounted, setHasMounted] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string>("1");

  useEffect(() => {
    setHasMounted(true);
    const savedId = localStorage.getItem("selectedCafe") || "1";
    setActiveVendorId(savedId);
  
    const fetchData = async () => {
      setLoading(true);
      try {
        const [typesRes, passesRes] = await Promise.all([
          axios.get(`${DASHBOARD_URL}/api/pass_types`),
          axios.get(`${DASHBOARD_URL}/api/vendor/${savedId}/passes`)
        ]);
        
        setPassTypes(typesRes.data);
        const passesData = passesRes.data.passes || passesRes.data;
        setPasses(passesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  const refreshPasses = async () => {
    try {
      const { data: passesRes } = await axios.get(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`);
      const passesData = passesRes.passes || passesRes;
      setPasses(passesData);
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
  };

  const handleAddPass = async (data: any, close: () => void) => {
    try {
      await axios.post(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes`, data);
      await refreshPasses();
      close();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to create pass"}`);
    }
  };

  const handleEditPass = async (id: number, data: any, close: () => void) => {
    try {
      await axios.put(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`, data);
      await refreshPasses();
      close();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to update pass"}`);
    }
  };

  const handleDeletePass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pass?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`${DASHBOARD_URL}/api/vendor/${activeVendorId}/passes/${id}`);
      await refreshPasses();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || "Failed to delete pass"}`);
    } finally {
      setDeletingId(null);
    }
  };

  const datePasses = passes.filter(p => p.pass_mode === 'date_based');
  const hourPasses = passes.filter(p => p.pass_mode === 'hour_based');

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-title-section">
          <h1 className="page-title flex items-center gap-2">
            <BadgeCheck className="icon-lg text-blue-500" /> 
            <span className="truncate">Manage Cafe Passes</span>
          </h1>
          <p className="page-subtitle mt-1">
            Create date-based and hour-based membership passes
          </p>
        </div>
        <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
      </header>

      {/* View Toggle Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="tab-container">
          <button 
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'tab-active' : 'tab-inactive'}
          >
            <LayoutGrid className="icon-sm mr-1" /> Grid
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'tab-active' : 'tab-inactive'}
          >
            <TableIcon className="icon-sm mr-1" /> Table
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader />
        </div>
      ) : (
        <div className="w-full">
          {passes.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <BadgeCheck className="icon-xl text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="section-title mb-2">No passes found</h3>
              <AddPassDialog passTypes={passTypes} onSave={handleAddPass} />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-8">
              {hourPasses.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="text-blue-500" /> Hour-Based Passes
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {hourPasses.map(pass => (
                      <PassCard key={pass.id} pass={pass} passTypes={passTypes} onEdit={handleEditPass} onDelete={handleDeletePass} deletingId={deletingId} />
                    ))}
                  </div>
                </div>
              )}
              {datePasses.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="text-emerald-500" /> Date-Based Passes
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {datePasses.map(pass => (
                      <PassCard key={pass.id} pass={pass} passTypes={passTypes} onEdit={handleEditPass} onDelete={handleDeletePass} deletingId={deletingId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <PassesTable passes={passes} passTypes={passTypes} onEdit={handleEditPass} onDelete={handleDeletePass} deletingId={deletingId} />
          )}
        </div>
      )}
    </div>
  );
}

// --- Table View Component ---

function PassesTable({ passes, passTypes, onEdit, onDelete, deletingId }: any) {
  return (
    <div className="table-container bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-left">
        <thead className="table-header">
          <tr>
            <th className="table-cell table-header-text">Pass Name</th>
            <th className="table-cell table-header-text">Mode</th>
            <th className="table-cell table-header-text">Price</th>
            <th className="table-cell table-header-text">Validity</th>
            <th className="table-cell table-header-text text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((pass: any) => (
            <tr key={pass.id} className="table-row">
              <td className="table-cell font-medium">{pass.name}</td>
              <td className="table-cell">
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${pass.pass_mode === 'hour_based' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {pass.pass_mode.replace('_', ' ')}
                </span>
              </td>
              <td className="table-cell text-primary font-bold">₹{pass.price}</td>
              <td className="table-cell body-text-muted">
                {pass.pass_mode === 'hour_based' ? `${pass.total_hours}h in ${pass.days_valid}d` : `${pass.days_valid} days`}
              </td>
              <td className="table-cell text-right">
                <div className="flex justify-end gap-1">
                  <EditPassDialog passTypes={passTypes} passObj={pass} onSave={onEdit} />
                  <Button variant="ghost" size="icon" onClick={() => onDelete(pass.id)} disabled={deletingId === pass.id} className="hover:bg-destructive/10">
                    {deletingId === pass.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Sub-Components (Grid Card, Dialogs) ---

function PassCard({ pass, passTypes, onEdit, onDelete, deletingId }: any) {
  const isHourBased = pass.pass_mode === 'hour_based';
  return (
    <Card className="content-card shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between p-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <h2 className="card-title truncate">{pass.name}</h2>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {isHourBased ? <Clock className="w-3 h-3 text-blue-500" /> : <Calendar className="w-3 h-3 text-emerald-500" />}
            {isHourBased ? `Hour-Based • ${pass.total_hours}hrs` : `${pass.pass_type || 'Date-Based'} • ${pass.days_valid}d`}
          </div>
        </div>
        <div className="flex gap-1">
          <EditPassDialog passTypes={passTypes} passObj={pass} onSave={onEdit} />
          <Button size="icon" variant="ghost" onClick={() => onDelete(pass.id)} disabled={deletingId === pass.id} className="w-8 h-8 hover:bg-destructive/10">
            {deletingId === pass.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4 text-destructive" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-primary">₹{pass.price}</div>
            <div className="text-xs text-muted-foreground">Price</div>
          </div>
          <div className="text-right">
             <div className="text-sm font-semibold">{isHourBased ? `${pass.total_hours} hrs` : `${pass.days_valid} days`}</div>
             <div className="text-xs text-muted-foreground">{isHourBased ? 'Total Limit' : 'Valid For'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPassDialog({ passTypes, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [passMode, setPassMode] = useState<'date_based' | 'hour_based'>('date_based');
  const [form, setForm] = useState({ name: "", price: "", description: "", pass_type_id: "", days_valid: "", total_hours: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = { ...form, price: Number(form.price), days_valid: Number(form.days_valid), pass_mode: passMode, total_hours: passMode === 'hour_based' ? Number(form.total_hours) : undefined };
    await onSave(payload, () => {
      setOpen(false);
      setForm({ name: "", price: "", description: "", pass_type_id: "", days_valid: "", total_hours: "" });
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary"><PlusCircle className="icon-md mr-2" /> New Pass</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-card border border-border">
        <DialogTitle className="section-title">Add New Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button type="button" onClick={() => setPassMode('date_based')} className={`flex-1 py-2 rounded-md ${passMode === 'date_based' ? 'bg-primary text-white' : ''}`}>Date-Based</button>
            <button type="button" onClick={() => setPassMode('hour_based')} className={`flex-1 py-2 rounded-md ${passMode === 'hour_based' ? 'bg-primary text-white' : ''}`}>Hour-Based</button>
          </div>
          <div className="space-y-2">
            <Label>Pass Name</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Validity (Days)</Label>
              <Input type="number" value={form.days_valid} onChange={e => setForm({...form, days_valid: e.target.value})} required />
            </div>
          </div>
          {passMode === 'hour_based' && (
            <div className="space-y-2">
              <Label>Total Hours</Label>
              <Input type="number" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} required />
            </div>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Pass"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPassDialog({ passObj, passTypes, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: passObj.name, price: String(passObj.price), description: passObj.description || "", days_valid: String(passObj.days_valid), total_hours: String(passObj.total_hours || ""),
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await onSave(passObj.id, { ...form, price: Number(form.price), days_valid: Number(form.days_valid) }, () => setOpen(false));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-accent"><Pencil className="w-4 h-4 text-emerald-600" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border border-border">
        <DialogTitle>Edit Pass</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
          <Input type="number" placeholder="Days" value={form.days_valid} onChange={e => setForm({...form, days_valid: e.target.value})} />
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
