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
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Loader2, UtensilsCrossed, Coffee,
  LayoutGrid, Table as TableIcon, IndianRupee
} from 'lucide-react'
import Image from "next/image"
import { jwtDecode } from "jwt-decode"
import clsx from "clsx"
import { DASHBOARD_URL } from "@/src/config/env"

/* ------------------------------------------------------------------ */
/*                         TYPE DEFINITIONS                            */
/* ------------------------------------------------------------------ */
interface ExtraServiceMenu {
  id: number
  name: string
  description: string
  price: number
  image?: string | null
  is_active: boolean
}

interface ExtraServiceCategory {
  id: number
  name: string
  description: string
  items: ExtraServiceMenu[]
}

interface CategoryForm {
  name: string
  description: string
}

interface MenuItemForm {
  name: string
  description: string
  price: string
  imageFile?: File | null
  is_active: boolean
}

/* ------------------------------------------------------------------ */
/*                              CONFIG                                 */
/* ------------------------------------------------------------------ */
const API_BASE = `${DASHBOARD_URL}/api`

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  if (name.includes('food') || name.includes('snack')) {
    return <UtensilsCrossed className="icon-lg text-orange-400" />
  }
  if (name.includes('drink') || name.includes('beverage')) {
    return <Coffee className="icon-lg text-blue-400" />
  }
  return <UtensilsCrossed className="icon-lg text-primary" />
}

/* ------------------------------------------------------------------ */
/*                           COMPONENT                                 */
/* ------------------------------------------------------------------ */
export default function ManageExtraServices() {
  const [isClient, setIsClient] = useState(false)
  const [categories, setCategories] = useState<ExtraServiceCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<number | null>(null)

  // ✅ View mode per category: { [categoryId]: 'grid' | 'table' }
  const [viewModes, setViewModes] = useState<Record<number, 'grid' | 'table'>>({})

  // ✅ Per-item delete loading
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  /* Category form */
  const [showCategoryDlg, setShowCategoryDlg] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ name: "", description: "" })
  const [categoryLoading, setCategoryLoading] = useState(false)

  /* Menu item form */
  const [showMenuDlg, setShowMenuDlg] = useState(false)
  const [menuForm, setMenuForm] = useState<MenuItemForm>({
    name: "", description: "", price: "", imageFile: undefined, is_active: true,
  })
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [menuLoading, setMenuLoading] = useState(false)

  /* ---------------------------------------------------------------
     HELPERS
  --------------------------------------------------------------- */
  const getViewMode = (catId: number): 'grid' | 'table' =>
    viewModes[catId] ?? 'grid'

  const setViewMode = (catId: number, mode: 'grid' | 'table') =>
    setViewModes(prev => ({ ...prev, [catId]: mode }))

  const fetchCategories = async () => {
    if (!vendorId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services`)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (!data?.success) throw new Error(data?.message || 'API request failed')
      const categoriesData = data.categories
      if (!Array.isArray(categoriesData)) throw new Error('Invalid categories data format')

      const validatedCategories: ExtraServiceCategory[] = categoriesData.map((cat: any, index: number) => {
        if (!cat || typeof cat !== 'object') return null
        const transformedItems: ExtraServiceMenu[] = Array.isArray(cat.menus)
          ? cat.menus.map((menu: any) => {
              if (!menu || typeof menu !== 'object') return null
              let imageUrl: string | null = null
              if (Array.isArray(menu.images) && menu.images.length > 0) {
                imageUrl = menu.images[0]?.image_url || null
              }
              return {
                id: menu.id || 0,
                name: menu.name || 'Untitled Item',
                description: menu.description || '',
                price: menu.price || 0,
                image: imageUrl,
                is_active: menu.is_active !== false,
              }
            }).filter(Boolean)
          : []
        return {
          id: cat.id || index + 1,
          name: cat.name || `Category ${index + 1}`,
          description: cat.description || '',
          items: transformedItems,
        }
      }).filter(Boolean) as ExtraServiceCategory[]

      setCategories(validatedCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------------------------
     CRUD
  --------------------------------------------------------------- */
  const createCategory = async () => {
    if (!categoryForm.name.trim() || !vendorId) return
    try {
      setCategoryLoading(true)
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryForm.name.trim(), description: categoryForm.description.trim() }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setShowCategoryDlg(false)
      setCategoryForm({ name: "", description: "" })
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setCategoryLoading(false)
    }
  }

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Delete this category and all its items?') || !vendorId) return
    setDeletingCategoryId(categoryId)
    try {
      const res = await fetch(`${API_BASE}/vendor/${vendorId}/extra-services/category/${categoryId}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const createMenuItem = async () => {
    if (!menuForm.name.trim() || !menuForm.price.trim() || activeCategoryId == null || !vendorId) return
    try {
      setMenuLoading(true)
      const form = new FormData()
      form.append("name", menuForm.name.trim())
      form.append("price", menuForm.price.trim())
      form.append("description", menuForm.description.trim())
      if (menuForm.imageFile) form.append("image", menuForm.imageFile)
      const res = await fetch(
        `${API_BASE}/vendor/${vendorId}/extra-services/category/${activeCategoryId}/menu`,
        { method: "POST", body: form }
      )
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      setShowMenuDlg(false)
      setMenuForm({ name: "", description: "", price: "", imageFile: undefined, is_active: true })
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create menu item')
    } finally {
      setMenuLoading(false)
    }
  }

  const deleteMenuItem = async (categoryId: number, menuId: number) => {
    if (!confirm('Delete this menu item?') || !vendorId) return
    setDeletingItemId(menuId)
    try {
      const res = await fetch(
        `${API_BASE}/vendor/${vendorId}/extra-services/category/${categoryId}/menu/${menuId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete menu item')
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setMenuForm(prev => ({ ...prev, imageFile: file }))
  }

  /* ---------------------------------------------------------------
     EFFECTS
  --------------------------------------------------------------- */
  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (!isClient) return
    try {
      const token = localStorage.getItem("jwtToken")
      if (!token) { setError('No authentication token found'); return }
      const decoded = jwtDecode<{ sub: { id: number } }>(token)
      if (!decoded?.sub?.id) throw new Error('Invalid token structure')
      setVendorId(decoded.sub.id)
    } catch (error) {
      setError('Invalid authentication token')
    }
  }, [isClient])

  useEffect(() => {
    if (vendorId && isClient) fetchCategories()
  }, [vendorId, isClient])

  /* ---------------------------------------------------------------
     SSR GUARD
  --------------------------------------------------------------- */
  if (!isClient) {
    return (
      <div className="page-container section-spacing">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Manage Extra Services</h1>
            <p className="page-subtitle">Create categories and add menu items</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------
     RENDER
  --------------------------------------------------------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container section-spacing"
    >
      {/* ✅ Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="page-header"
      >
        <div className="page-title-section">
          <div className="flex items-center gap-3 mb-1">
            <div className="icon-blue p-2 rounded-lg">
              <UtensilsCrossed className="icon-lg text-blue-400" />
            </div>
            <h1 className="page-title">Extra Services</h1>
          </div>
          <p className="page-subtitle">Create categories and add menu items for your cafe</p>
        </div>
        <button
          onClick={() => setShowCategoryDlg(true)}
          disabled={loading || !vendorId}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="icon-md" />
          New Category
        </button>
      </motion.div>

      {/* ✅ Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p className="body-text font-medium">Error: {error}</p>
          <button
            className="btn-secondary mt-2 text-destructive border-destructive"
            onClick={() => { setError(null); if (vendorId) fetchCategories() }}
            disabled={!vendorId}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ✅ Auth Loading */}
      {!vendorId && !error && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="body-text-muted">Loading authentication...</p>
        </div>
      )}

      {/* ✅ Main Content */}
      {vendorId && (
        loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="body-text-muted">Loading categories...</p>
          </div>
        ) : !Array.isArray(categories) || categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-lg">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30" />
            <h3 className="section-title text-muted-foreground/60">No categories yet</h3>
            <p className="body-text-muted">Create your first category to get started</p>
            <button className="btn-primary mt-2" onClick={() => setShowCategoryDlg(true)}>
              <Plus className="icon-md" />
              Create First Category
            </button>
          </div>
        ) : (
          <div className="section-spacing">
            {categories.map((cat, i) => {
              if (!cat?.id) return null
              const mode = getViewMode(cat.id)
              const isDeletingCat = deletingCategoryId === cat.id

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Card className="content-card shadow-sm">
                    {/* ✅ Category Header with view toggle */}
                    <CardHeader className="content-card-padding pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Icon + Name */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="icon-container bg-muted/20 shrink-0">
                            {getCategoryIcon(cat.name)}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="card-title truncate">{cat.name}</CardTitle>
                            {cat.description && (
                              <p className="card-subtitle mt-0.5 line-clamp-1">{cat.description}</p>
                            )}
                          </div>
                          {/* Item count badge */}
                          <span className="shrink-0 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
                            {cat.items.length} items
                          </span>
                        </div>

                        {/* Right: View Toggle + Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* ✅ View Mode Toggle */}
                          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                            <button
                              onClick={() => setViewMode(cat.id, 'grid')}
                              className={`p-1.5 rounded-md transition-all ${
                                mode === 'grid'
                                  ? 'bg-background shadow-sm text-blue-400'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Grid View"
                            >
                              <LayoutGrid className="icon-md" />
                            </button>
                            <button
                              onClick={() => setViewMode(cat.id, 'table')}
                              className={`p-1.5 rounded-md transition-all ${
                                mode === 'table'
                                  ? 'bg-background shadow-sm text-blue-400'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Table View"
                            >
                              <TableIcon className="icon-md" />
                            </button>
                          </div>

                          {/* Add Item Button */}
                          <button
                            onClick={() => {
                              setActiveCategoryId(cat.id)
                              setMenuForm({ name: "", description: "", price: "", imageFile: undefined, is_active: true })
                              setShowMenuDlg(true)
                            }}
                            className="btn-primary py-1.5"
                          >
                            <Plus className="icon-md" />
                            <span className="hidden sm:inline">Add Item</span>
                          </button>

                          {/* Delete Category */}
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            disabled={isDeletingCat}
                            className="btn-icon hover:bg-destructive/10 disabled:opacity-50"
                            title="Delete Category"
                          >
                            {isDeletingCat
                              ? <Loader2 className="icon-md text-destructive animate-spin" />
                              : <Trash2 className="icon-md text-destructive" />
                            }
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="content-card-padding pt-0">
                      <AnimatePresence mode="wait">

                        {/* ✅ GRID VIEW */}
                        {mode === 'grid' && (
                          <motion.div
                            key="grid"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                          >
                            {Array.isArray(cat.items) && cat.items.map((item, idx) => {
                              if (!item?.id) return null
                              const isDeleting = deletingItemId === item.id
                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.04 * idx }}
                                >
                                  <Card className="content-card overflow-hidden hover:shadow-lg transition-all duration-200 bg-muted/20">
                                    <CardContent className="p-0">
                                      {/* Image */}
                                      <div className="aspect-video relative">
                                        <Image
                                          alt={item.name}
                                          src={item.image ?? "/placeholder.svg?height=140&width=220"}
                                          fill
                                          className="object-cover rounded-t-lg"
                                        />
                                        {/* Delete button overlay */}
                                        <button
                                          onClick={() => deleteMenuItem(cat.id, item.id)}
                                          disabled={isDeleting}
                                          className="absolute top-1.5 right-1.5 p-1 bg-background/80 hover:bg-background rounded-lg transition-all disabled:opacity-50"
                                          title="Delete item"
                                        >
                                          {isDeleting
                                            ? <Loader2 className="w-3 h-3 text-destructive animate-spin" />
                                            : <Trash2 className="w-3 h-3 text-destructive" />
                                          }
                                        </button>
                                      </div>

                                      {/* Info */}
                                      <div className="p-2 space-y-1">
                                        <p className="body-text font-semibold truncate text-xs sm:text-sm">
                                          {item.name}
                                        </p>
                                        {item.description && (
                                          <p className="body-text-muted text-xs line-clamp-1">
                                            {item.description}
                                          </p>
                                        )}
                                        <div className="flex items-center justify-between pt-0.5">
                                          <div className="flex items-center gap-0.5 text-blue-400 font-bold text-xs">
                                            <IndianRupee className="w-3 h-3" />
                                            <span>{item.price}</span>
                                          </div>
                                          <span className={clsx(
                                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                                            item.is_active
                                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                              : "bg-muted/20 text-muted-foreground"
                                          )}>
                                            {item.is_active ? "Active" : "Off"}
                                          </span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              )
                            })}

                            {/* ✅ Add item card */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.04 * (cat.items?.length ?? 0) }}
                            >
                              <Card
                                onClick={() => {
                                  setActiveCategoryId(cat.id)
                                  setMenuForm({ name: "", description: "", price: "", imageFile: undefined, is_active: true })
                                  setShowMenuDlg(true)
                                }}
                                className="content-card overflow-hidden border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-md bg-muted/10"
                              >
                                <CardContent className="p-0 flex items-center justify-center min-h-[100px]">
                                  <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors p-4">
                                    <Plus className="icon-xl" />
                                    <span className="text-xs font-medium">Add Item</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </motion.div>
                        )}

                        {/* ✅ TABLE VIEW */}
                        {mode === 'table' && (
                          <motion.div
                            key="table"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="table-container"
                          >
                            {cat.items.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                <UtensilsCrossed className="w-8 h-8 opacity-30" />
                                <p className="body-text-muted">No items yet</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead className="table-header">
                                    <tr>
                                      {["Item", "Description", "Price", "Status", "Action"].map(h => (
                                        <th key={h} className="table-cell table-header-text">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cat.items.map((item) => {
                                      if (!item?.id) return null
                                      const isDeleting = deletingItemId === item.id
                                      return (
                                        <tr key={item.id} className="table-row">
                                          {/* Item name + image */}
                                          <td className="table-cell">
                                            <div className="flex items-center gap-3">
                                              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border">
                                                <Image
                                                  alt={item.name}
                                                  src={item.image ?? "/placeholder.svg?height=40&width=40"}
                                                  fill
                                                  className="object-cover"
                                                />
                                              </div>
                                              <p className="body-text font-semibold">{item.name}</p>
                                            </div>
                                          </td>

                                          {/* Description */}
                                          <td className="table-cell">
                                            <p className="body-text-muted line-clamp-2 max-w-[200px]">
                                              {item.description || '—'}
                                            </p>
                                          </td>

                                          {/* Price */}
                                          <td className="table-cell">
                                            <div className="flex items-center gap-0.5 text-blue-400 font-bold">
                                              <IndianRupee className="icon-md" />
                                              <span>{item.price}</span>
                                            </div>
                                          </td>

                                          {/* Status */}
                                          <td className="table-cell">
                                            <span className={clsx(
                                              "px-2 py-0.5 rounded-full text-xs font-bold border",
                                              item.is_active
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-muted/20 text-muted-foreground border-border"
                                            )}>
                                              {item.is_active ? "Active" : "Inactive"}
                                            </span>
                                          </td>

                                          {/* Action */}
                                          <td className="table-cell">
                                            <button
                                              onClick={() => deleteMenuItem(cat.id, item.id)}
                                              disabled={isDeleting}
                                              className="btn-icon hover:bg-destructive/10 disabled:opacity-50"
                                              title="Delete"
                                            >
                                              {isDeleting
                                                ? <Loader2 className="icon-md text-destructive animate-spin" />
                                                : <Trash2 className="icon-md text-destructive" />
                                              }
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </motion.div>
                        )}

                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )
      )}

      {/* ✅ Category Dialog */}
      <Dialog open={showCategoryDlg} onOpenChange={setShowCategoryDlg}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] bg-card border border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="section-title">New Category</DialogTitle>
            <DialogDescription className="body-text-muted">
              Enter a name and description for your new category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="table-header-text">Name *</label>
              <Input
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Food, Drinks, Snacks"
                disabled={categoryLoading}
                className="bg-muted/20 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Description</label>
              <Input
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description"
                disabled={categoryLoading}
                className="bg-muted/20 border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowCategoryDlg(false)} disabled={categoryLoading} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={createCategory}
              disabled={categoryLoading || !categoryForm.name.trim()}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {categoryLoading ? <><Loader2 className="icon-md animate-spin" /> Creating...</> : 'Create Category'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Menu Item Dialog */}
      <Dialog open={showMenuDlg} onOpenChange={setShowMenuDlg}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] bg-card border border-border shadow-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="section-title">New Menu Item</DialogTitle>
            <DialogDescription className="body-text-muted">
              Add a new item to your category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="table-header-text">Name *</label>
              <Input
                value={menuForm.name}
                onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="e.g. Burger, Coffee"
                disabled={menuLoading}
                className="bg-muted/20 border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Description</label>
              <Textarea
                value={menuForm.description}
                onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                placeholder="Optional description"
                disabled={menuLoading}
                rows={3}
                className="bg-muted/20 border-border resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Price (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
                <Input
                  type="number"
                  value={menuForm.price}
                  onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  disabled={menuLoading}
                  className="pl-9 bg-muted/20 border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="table-header-text">Image (optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={menuLoading}
                className="bg-muted/20 border-border file:text-primary file:bg-transparent file:border-0 file:font-medium"
              />
              {menuForm.imageFile && (
                <p className="body-text-muted text-xs mt-1">
                  📸 {menuForm.imageFile.name} ({(menuForm.imageFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowMenuDlg(false)} disabled={menuLoading} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={createMenuItem}
              disabled={menuLoading || !menuForm.name.trim() || !menuForm.price.trim()}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {menuLoading ? <><Loader2 className="icon-md animate-spin" /> Creating...</> : 'Create Item'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
