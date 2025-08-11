"use client"
import React, { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"
import { Plus, Trash2, Edit3, Loader2, UtensilsCrossed, Coffee } from 'lucide-react'
import Image from "next/image"
import { jwtDecode } from "jwt-decode";
import clsx from "clsx";
import { DASHBOARD_URL } from "@/src/config/env";

/* ------------------------------------------------------------------ */
/* -----------------------    TYPE DEFINITIONS    ----------------------- */
/* ------------------------------------------------------------------ */
interface ExtraServiceMenu {
  id: number
  name: string
  description: string
  price: number
  image?: string | null    // Cloudinary URL (primary image) – optional
  is_active: boolean
}

interface ExtraServiceCategory {
  id: number
  name: string
  description: string
  items: ExtraServiceMenu[]
}

/* ----------    Forms ---------- */
interface CategoryForm {
  name: string
  description: string
}

interface MenuItemForm {
  name: string
  description: string
  price: string          // keep as string for input binding
  imageFile?: File | null
  is_active: boolean
}

/* ------------------------------------------------------------------ */
/* ----------------------------    CONFIG    ---------------------------- */
/* ------------------------------------------------------------------ */
const API_BASE = `${DASHBOARD_URL}/api`;

// <CHANGE> Added category icons mapping for visual distinction
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('food') || name.includes('snack')) {
    return <UtensilsCrossed className="w-5 h-5 text-orange-400" />;
  }
  if (name.includes('drink') || name.includes('beverage')) {
    return <Coffee className="w-5 h-5 text-blue-400" />;
  }
  return <UtensilsCrossed className="w-5 h-5 text-primary" />;
};

/* ------------------------------------------------------------------ */
/* -------------------------    COMPONENT    ---------------------------- */
/* ------------------------------------------------------------------ */
export default function ManageExtraServices() {
  /* -----------------    STATE    ----------------- */
  const [categories, setCategories] = useState<ExtraServiceCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Category form */
  const [showCategoryDlg, setShowCategoryDlg] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ name: "", description: "" })
  const [categoryLoading, setCategoryLoading] = useState(false)

  /* Menu item form */
  const [showMenuDlg, setShowMenuDlg] = useState(false)
  const [menuForm, setMenuForm] = useState<MenuItemForm>({
    name: "",
    description: "",
    price: "",
    imageFile: undefined,
    is_active: true,
  })
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)

  /* -----------------    HELPERS    ----------------- */
  const fetchCategories = async () => {
    if (!vendorId) {
      console.log('VendorId not available, skipping fetch')
      return
    }
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching categories from:', `${API_BASE}/vendor/${vendorId}/extra-services`)
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data: ExtraServiceCategory[] = await res.json()
      console.log('Categories fetched:', data)
      setCategories(data)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  /* -----------------    CRUD CALLS    ----------------- */
  const createCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Category name is required')
      return
    }
    if (!vendorId) {
      alert('Vendor ID not found')
      return
    }
    try {
      setCategoryLoading(true)
      const payload = { name: categoryForm.name.trim(), description: categoryForm.description.trim() }
      console.log('Creating category:', payload)
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      console.log('Category created:', result)
      setShowCategoryDlg(false)
      setCategoryForm({ name: "", description: "" })
      await fetchCategories()
    } catch (err) {
      console.error('Error creating category:', err)
      alert(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setCategoryLoading(false)
    }
  }

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category and all its menu items?')) {
      return
    }
    if (!vendorId) return
    try {
      console.log('Deleting category:', categoryId)
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services/category/${categoryId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      console.log('Category deleted successfully')
      await fetchCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  const createMenuItem = async () => {
    if (!menuForm.name.trim() || !menuForm.price.trim()) {
      alert('Name and price are required')
      return
    }
    if (activeCategoryId == null || !vendorId) return
    try {
      setMenuLoading(true)
      const form = new FormData()
      form.append("name", menuForm.name.trim())
      form.append("price", menuForm.price.trim())
      form.append("description", menuForm.description.trim())
      if (menuForm.imageFile) {
        form.append("image", menuForm.imageFile)
        console.log('Including image file:', menuForm.imageFile.name)
      }
      console.log('Creating menu item for category:', activeCategoryId)
      const res = await fetch(
        `${API_BASE}/vendor/${vendorId}/extra-services/category/${activeCategoryId}/menu`,
        { method: "POST", body: form }
      )
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      console.log('Menu item created:', result)
      setShowMenuDlg(false)
      setMenuForm({
        name: "",
        description: "",
        price: "",
        imageFile: undefined,
        is_active: true,
      })
      await fetchCategories()
    } catch (err) {
      console.error('Error creating menu item:', err)
      alert(err instanceof Error ? err.message : 'Failed to create menu item')
    } finally {
      setMenuLoading(false)
    }
  }

  const deleteMenuItem = async (categoryId: number, menuId: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return
    }
    if (!vendorId) return
    try {
      console.log('Deleting menu item:', menuId, 'from category:', categoryId)
      const res = await fetch(
        `${API_BASE}/vendor/${vendorId}/extra-services/category/${categoryId}/menu/${menuId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      console.log('Menu item deleted successfully')
      await fetchCategories()
    } catch (err) {
      console.error('Error deleting menu item:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete menu item')
    }
  }

  /* -----------------    IMAGE HANDLER    ----------------- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('Image selected:', file?.name)
    setMenuForm((prev) => ({ ...prev, imageFile: file }))
  }

  /* -----------------    EFFECTS    ----------------- */
  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        console.log('Decoded token:', decoded_token)
        setVendorId(decoded_token.sub.id);
        console.log('Vendor ID set to:', decoded_token.sub.id)
      } catch (error) {
        console.error('Error decoding token:', error)
        setError('Invalid authentication token')
      }
    } else {
      setError('No authentication token found')
    }
  }, []);

  // Fetch categories when vendorId is available
  useEffect(() => {
    if (vendorId) {
      console.log('VendorId available, fetching categories...')
      fetchCategories()
    }
  }, [vendorId]) // This will trigger when vendorId changes

  /* -----------------    UI    ----------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-6"
    >
      {/* ----------    HEADER    ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Manage Extra Services</h1>
          <p className="text-muted-foreground">
            Create categories and add menu items
          </p>
        </div>
        <Button
          onClick={() => setShowCategoryDlg(true)}
          disabled={loading || !vendorId}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </motion.div>

      {/* ----------    ERROR STATE    ---------- */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p className="font-medium">Error loading categories:</p>
          <p className="text-sm mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={fetchCategories}
            disabled={!vendorId}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* ----------    LOADING STATE WHEN NO VENDOR ID    ---------- */}
      {!vendorId && !error && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-2">Loading authentication...</p>
        </div>
      )}

      {/* ----------    CATEGORY LIST    ---------- */}
      {vendorId && (
        loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-2">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No categories found.</p>
            <Button
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              onClick={() => setShowCategoryDlg(true)}
            >
              Create Your First Category
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card className="bg-card border border-border rounded-lg shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted/20 rounded-lg">
                          {getCategoryIcon(cat.name)}
                        </div>
                        <div>
                          <CardTitle className="text-xl font-semibold text-foreground">
                            {cat.name}
                          </CardTitle>
                          {cat.description && (
                            <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteCategory(cat.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* --------    menu grid with slightly smaller cards    -------- */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {/* Existing menu items - SLIGHTLY SMALLER */}
                      {cat.items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.04 * idx }}
                          className="w-[220px]" // Slightly smaller width (was larger before)
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-muted/30 border border-border rounded-lg">
                            <CardContent className="p-0">
                              {/* Image section - slightly smaller */}
                              <div className="aspect-video relative">
                                <Image
                                  alt={item.name}
                                  src={item.image ?? "/placeholder.svg?height=140&width=220&query=food item"}
                                  fill
                                  className="object-cover rounded-t-lg"
                                />
                                <div className="absolute top-2 right-2">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="w-7 h-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive-foreground rounded-lg"
                                    onClick={() => deleteMenuItem(cat.id, item.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Content section - slightly smaller padding */}
                              <div className="p-3 space-y-2">
                                <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                  <p className="font-bold text-foreground text-base">₹{item.price}</p>
                                  <span className={clsx(
                                    "px-1.5 py-0.5 rounded-full text-xs font-medium",
                                    item.is_active
                                      ? "bg-green-500/20 text-green-400"
                                      : "bg-muted/20 text-muted-foreground"
                                  )}>
                                    {item.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      
                      {/* Add Menu Card - EXACT SAME SIZE as item cards */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.04 * cat.items.length }}
                        className="w-[220px]" // Same width as item cards
                      >
                        <Card className="overflow-hidden h-[220px] hover:shadow-lg transition-shadow duration-300 bg-muted/30 border-2 border-dashed border-muted-foreground/50 hover:border-primary/70 cursor-pointer rounded-lg">
                          <CardContent 
                            className="p-0 h-full flex items-center justify-center"
                            onClick={() => {
                              setActiveCategoryId(cat.id)
                              setMenuForm({
                                name: "",
                                description: "",
                                price: "",
                                imageFile: undefined,
                                is_active: true,
                              })
                              setShowMenuDlg(true)
                            }}
                          >
                            {/* Match the aspect ratio of item cards exactly */}
                            <div className="aspect-video w-full flex flex-col items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <Plus className="w-10 h-10 mx-auto mb-2" />
                                <span className="text-sm font-medium">Add Menu</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* ============================================================ */}
      {/* ====================    CATEGORY DIALOG    ===================== */}
      {/* ============================================================ */}
      <Dialog open={showCategoryDlg} onOpenChange={setShowCategoryDlg}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Category</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a name and description for your new category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cat-name" className="text-foreground">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g. Food, Drinks, Snacks"
                disabled={categoryLoading}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-foreground">Description</Label>
              <Input
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Optional description"
                disabled={categoryLoading}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryDlg(false)}
              disabled={categoryLoading}
              className="border-border text-foreground hover:bg-muted hover:text-foreground rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={createCategory}
              disabled={categoryLoading || !categoryForm.name.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              {categoryLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* ====================    MENU ITEM DIALOG    ==================== */}
      {/* ============================================================ */}
      <Dialog open={showMenuDlg} onOpenChange={setShowMenuDlg}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Menu Item</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new item to your category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-foreground">Name *</Label>
              <Input
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, name: e.target.value })
                }
                placeholder="e.g. Burger, Coffee"
                disabled={menuLoading}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg"
              />
            </div>
            <div>
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={menuForm.description}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, description: e.target.value })
                }
                placeholder="Optional description"
                disabled={menuLoading}
                rows={3}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg"
              />
            </div>
            <div>
              <Label className="text-foreground">Price (₹) *</Label>
              <Input
                type="number"
                value={menuForm.price}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, price: e.target.value })
                }
                placeholder="0"
                min="0"
                step="0.01"
                disabled={menuLoading}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground rounded-lg"
              />
            </div>
            <div>
              <Label className="text-foreground">Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={menuLoading}
                className="bg-input border-input text-foreground file:text-primary rounded-lg"
              />
              {menuForm.imageFile && (
                <p className="text-sm mt-1 text-muted-foreground">
                  📸 {menuForm.imageFile.name} ({(menuForm.imageFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMenuDlg(false)}
              disabled={menuLoading}
              className="border-border text-foreground hover:bg-muted hover:text-foreground rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={createMenuItem}
              disabled={menuLoading || !menuForm.name.trim() || !menuForm.price.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              {menuLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                'Create Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
