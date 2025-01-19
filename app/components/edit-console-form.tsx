"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Building2, Cpu, CpuIcon as Gpu, MemoryStickIcon as Memory, HardDrive, Activity, Plus } from 'lucide-react'

interface EditConsoleFormProps {
  console: any
  onClose: () => void
}

export function EditConsoleForm({ console, onClose }: EditConsoleFormProps) {
  const [brand, setBrand] = useState(console.brand)
  const [cpu, setCpu] = useState(console.processor)
  const [gpu, setGpu] = useState(console.gpu)
  const [ram, setRam] = useState(console.ram)
  const [storage, setStorage] = useState(console.storage)
  const [status, setStatus] = useState(console.status)

  const [newBrand, setNewBrand] = useState("")
  const [newCpu, setNewCpu] = useState("")
  const [newGpu, setNewGpu] = useState("")
  const [newRam, setNewRam] = useState("")
  const [newStorage, setNewStorage] = useState("")
  const [newStatus, setNewStatus] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission logic here
    console.log("Form submitted", { brand, cpu, gpu, ram, storage, status })
    onClose()
  }

  const renderSelect = (
    label: string, 
    icon: React.ReactNode, 
    value: string, 
    setValue: (value: string) => void,
    options: string[],
    newValue: string,
    setNewValue: (value: string) => void
  ) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase()} className="flex items-center">
        {icon}
        {label}
      </Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={label.toLowerCase()}>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
          <SelectItem value="new">
            <span className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add New {label}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      {value === "new" && (
        <Input 
          placeholder={`Enter new ${label}`} 
          value={newValue} 
          onChange={(e) => setNewValue(e.target.value)}
        />
      )}
    </div>
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Console</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderSelect("Brand", <Building2 className="w-4 h-4 mr-2" />, brand, setBrand, 
            ["Custom Build", "Sony", "Microsoft", "Nintendo", "Meta"], newBrand, setNewBrand)}
          {renderSelect("CPU", <Cpu className="w-4 h-4 mr-2" />, cpu, setCpu, 
            ["Intel i9-11900K", "AMD Ryzen 9 5950X", "AMD Zen 2", "Qualcomm Snapdragon XR2"], newCpu, setNewCpu)}
          {renderSelect("GPU", <Gpu className="w-4 h-4 mr-2" />, gpu, setGpu, 
            ["NVIDIA RTX 3080", "NVIDIA RTX 3090", "AMD RDNA 2", "Adreno 650"], newGpu, setNewGpu)}
          {renderSelect("RAM", <Memory className="w-4 h-4 mr-2" />, ram, setRam, 
            ["32GB DDR4", "64GB DDR4", "16GB GDDR6", "6GB"], newRam, setNewRam)}
          {renderSelect("Storage", <HardDrive className="w-4 h-4 mr-2" />, storage, setStorage, 
            ["1TB NVMe SSD", "2TB NVMe SSD", "825GB SSD", "256GB"], newStorage, setNewStorage)}
          {renderSelect("Status", <Activity className="w-4 h-4 mr-2" />, status, setStatus, 
            ["Available", "In Use", "Under Maintenance"], newStatus, setNewStatus)}
          <DialogFooter>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

