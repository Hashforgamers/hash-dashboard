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
import { Plus, Trash2, Edit3 } from "lucide-react"
import Image from "next/image"
import { jwtDecode } from "jwt-decode";
import clsx from "clsx"

/* ------------------------------------------------------------------ */
/* -----------------------  TYPE DEFINITIONS  ----------------------- */
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

/* ----------  Forms ---------- */

interface CategoryForm {
  name: string
  description: string
}

interface MenuItemForm {
  name: string
  description: string
  price: string                // keep as string for input binding
  imageFile?: File | null
  is_active: boolean
}

/* ------------------------------------------------------------------ */
/* ----------------------------  CONFIG  ---------------------------- */
/* ------------------------------------------------------------------ */

// UPDATED: Changed port from 5056 to 5054 based on your Docker container
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5054/api"

/* ------------------------------------------------------------------ */
/* -------------------------  COMPONENT  ---------------------------- */
/* ------------------------------------------------------------------ */

export default function ManageExtraServices() {
  /* -----------------  STATE  ----------------- */
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

  /* -----------------  HELPERS  ----------------- */

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

  /* -----------------  CRUD CALLS  ----------------- */

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

  /* -----------------  IMAGE HANDLER  ----------------- */

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('Image selected:', file?.name)
    setMenuForm((prev) => ({ ...prev, imageFile: file }))
  }

  /* -----------------  EFFECTS  ----------------- */

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

  /* -----------------  UI  ----------------- */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background p-6 space-y-6"
    >
      {/* ----------  HEADER  ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Extra Services</h1>
          <p className="text-muted-foreground">
            Create categories and add menu items
          </p>
          {vendorId && (
            <p className="text-xs text-muted-foreground mt-1">
            
            </p>
          )}
        </div>

        <Button 
          onClick={() => setShowCategoryDlg(true)}
          disabled={loading || !vendorId}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </motion.div>

      {/* ----------  ERROR STATE  ---------- */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-medium">Error loading categories:</p>
          <p className="text-destructive text-sm mt-1">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchCategories}
            disabled={!vendorId}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* ----------  LOADING STATE WHEN NO VENDOR ID  ---------- */}
      {!vendorId && !error && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-2">Loading authentication...</p>
        </div>
      )}

      {/* ----------  CATEGORY LIST  ---------- */}
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
              className="mt-4 bg-emerald-600 hover:bg-emerald-700" 
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
                <Card className="theme-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold">
                          {cat.name}
                        </CardTitle>
                        {cat.description && (
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteCategory(cat.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* --------  menu grid  -------- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {cat.items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.04 * idx }}
                        >
                          <Card
                            className={clsx(
                              "overflow-hidden hover:shadow-lg transition-shadow",
                              "bg-card border"
                            )}
                          >
                            <CardContent className="p-0">
                              <div className="aspect-video relative">
                                <Image
                                  alt={item.name}
                                  src={item.image ?? "/placeholder.svg"}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="w-8 h-8 bg-white/80 hover:bg-white"
                                    onClick={() => deleteMenuItem(cat.id, item.id)}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              <div className="p-4 space-y-1">
                                <h3 className="font-semibold">{item.name}</h3>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-primary">₹{item.price}</p>
                                  <span className={clsx(
                                    "px-2 py-1 rounded-full text-xs",
                                    item.is_active 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-gray-100 text-gray-600"
                                  )}>
                                    {item.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* --------  add menu item  -------- */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 py-2 bg-transparent"
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
                        <Plus className="w-4 h-4 mr-2" />
                        Add Menu Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* ============================================================ */}
      {/* ====================  CATEGORY DIALOG  ===================== */}
      {/* ============================================================ */}

      <Dialog open={showCategoryDlg} onOpenChange={setShowCategoryDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>
              Enter a name and description for your new category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g. Food, Drinks, Snacks"
                disabled={categoryLoading}
              />
            </div>

            <div>
              <Label htmlFor="cat-desc">Description</Label>
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCategoryDlg(false)}
              disabled={categoryLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={createCategory}
              disabled={categoryLoading || !categoryForm.name.trim()}
            >
              {categoryLoading ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* ====================  MENU ITEM DIALOG  ==================== */}
      {/* ============================================================ */}

      <Dialog open={showMenuDlg} onOpenChange={setShowMenuDlg}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Menu Item</DialogTitle>
            <DialogDescription>
              Add a new item to your category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, name: e.target.value })
                }
                placeholder="e.g. Burger, Coffee"
                disabled={menuLoading}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={menuForm.description}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, description: e.target.value })
                }
                placeholder="Optional description"
                disabled={menuLoading}
                rows={3}
              />
            </div>

            <div>
              <Label>Price (₹) *</Label>
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
              />
            </div>

            <div>
              <Label>Image (optional)</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleImageSelect}
                disabled={menuLoading}
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
            >
              Cancel
            </Button>
            <Button 
              onClick={createMenuItem}
              disabled={menuLoading || !menuForm.name.trim() || !menuForm.price.trim()}
            >
              {menuLoading ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
