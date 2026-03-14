"use client"
import React, { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Loader2, UtensilsCrossed, Coffee,
  LayoutGrid, Table as TableIcon, IndianRupee, Sparkles, FolderPlus
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
    viewModes[catId] ?? 'table'

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

  const totalCategories = categories.length
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const activeItems = categories.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.is_active).length,
    0
  )
  const avgPrice =
    totalItems > 0
      ? Math.round(
          categories.reduce(
            (sum, cat) => sum + cat.items.reduce((rowSum, item) => rowSum + Number(item.price || 0), 0),
            0
          ) / totalItems
        )
      : 0
  const primaryButtonClass =
    "ui-action-primary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
  const secondaryButtonClass =
    "ui-action-secondary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
  const destructiveIconButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-300 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"

  /* ---------------------------------------------------------------
     SSR GUARD
  --------------------------------------------------------------- */
  if (!isClient) {
    return (
      <div className="w-full space-y-4 px-1 pb-2 sm:px-2">
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
      className="dashboard-module dashboard-typography flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden px-1 pb-2 sm:px-2"
    >
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="gaming-panel shrink-0 rounded-xl p-3 sm:p-4"
      >
        <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
          <div className="gaming-kpi-card min-w-[155px] flex-1 rounded-xl p-3 sm:min-w-[170px] sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Categories</p>
          <p className="mt-1 text-xl font-semibold text-cyan-300 sm:text-2xl">{totalCategories}</p>
        </div>
          <div className="gaming-kpi-card min-w-[155px] flex-1 rounded-xl p-3 sm:min-w-[170px] sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Menu Items</p>
          <p className="mt-1 text-xl font-semibold text-sky-300 sm:text-2xl">{totalItems}</p>
        </div>
          <div className="gaming-kpi-card min-w-[155px] flex-1 rounded-xl p-3 sm:min-w-[170px] sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-1 text-xl font-semibold text-emerald-300 sm:text-2xl">{activeItems}</p>
        </div>
          <div className="gaming-kpi-card min-w-[155px] flex-1 rounded-xl p-3 sm:min-w-[170px] sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Avg Price</p>
          <p className="mt-1 flex items-center text-xl font-semibold text-amber-300 sm:text-2xl">
            <IndianRupee className="mr-1 h-4 w-4 sm:h-5 sm:w-5" />
            {avgPrice}
          </p>
          </div>
          <div className="min-w-[190px] flex-1 sm:min-w-[210px]">
            <button
              onClick={() => setShowCategoryDlg(true)}
              disabled={loading || !vendorId}
              className={`${primaryButtonClass} h-full min-h-[88px] w-full`}
            >
              <Plus className="icon-md" />
              New Category
            </button>
          </div>
        </div>
      </motion.div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {/* ✅ Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            <p className="body-text font-medium">Error: {error}</p>
            <button
              className={`${secondaryButtonClass} mt-2 border-destructive text-destructive`}
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
            <div className="gaming-panel flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-400/20 py-16">
              <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30" />
              <h3 className="section-title text-muted-foreground/60">No categories yet</h3>
              <p className="body-text-muted">Create your first category to get started</p>
              <button className={`${primaryButtonClass} mt-2`} onClick={() => setShowCategoryDlg(true)}>
                <Plus className="icon-md" />
                Create First Category
              </button>
            </div>
          ) : (
            <div className="section-spacing pb-2">
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
                  <Card className="gaming-panel overflow-hidden rounded-xl border-cyan-400/20 shadow-sm">
                    {/* ✅ Category Header with view toggle */}
                    <CardHeader className="content-card-padding border-b border-cyan-500/15 pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Icon + Name */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 dark:border-cyan-400/30 dark:bg-cyan-500/10">
                            {getCategoryIcon(cat.name)}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-base font-bold tracking-wide text-slate-900 dark:text-cyan-100">
                              {cat.name}
                            </CardTitle>
                            {cat.description && (
                              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{cat.description}</p>
                            )}
                          </div>
                          {/* Item count badge */}
                          <span className="shrink-0 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-xs font-bold text-slate-900 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                            {cat.items.length} items
                          </span>
                        </div>

                        {/* Right: View Toggle + Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* ✅ View Mode Toggle */}
                          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white/90 p-1 dark:border-cyan-400/20 dark:bg-slate-900/60">
                            <button
                              onClick={() => setViewMode(cat.id, 'grid')}
                              className={`p-1.5 rounded-md transition-all ${
                                mode === 'grid'
                                  ? 'bg-slate-200 shadow-sm text-slate-900 dark:bg-slate-800 dark:text-cyan-300'
                                  : 'text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-cyan-200'
                              }`}
                              title="Grid View"
                            >
                              <LayoutGrid className="icon-md" />
                            </button>
                            <button
                              onClick={() => setViewMode(cat.id, 'table')}
                              className={`p-1.5 rounded-md transition-all ${
                                mode === 'table'
                                  ? 'bg-slate-200 shadow-sm text-slate-900 dark:bg-slate-800 dark:text-cyan-300'
                                  : 'text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-cyan-200'
                              }`}
                              title="Table View"
                            >
                              <TableIcon className="icon-md" />
                            </button>
                          </div>

                          {/* Delete Category */}
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            disabled={isDeletingCat}
                            className={destructiveIconButtonClass}
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

                    <CardContent className="content-card-padding pt-3">
                      <AnimatePresence mode="wait">

                        {/* ✅ GRID VIEW */}
                        {mode === 'grid' && (
                          <motion.div
                            key="grid"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
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
                                  <Card className="dashboard-module-card overflow-hidden rounded-lg border border-cyan-400/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10">
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
                                            className="absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-md border border-rose-400/30 bg-slate-950/80 p-1 text-rose-300 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Delete item"
                                          >
                                          {isDeleting
                                            ? <Loader2 className="w-3 h-3 text-destructive animate-spin" />
                                            : <Trash2 className="w-3 h-3 text-destructive" />
                                          }
                                        </button>
                                      </div>

                                      {/* Info */}
                                      <div className="space-y-1 p-2.5">
                                        <p className="body-text font-semibold truncate text-xs sm:text-sm">
                                          {item.name}
                                        </p>
                                        {item.description && (
                                          <p className="body-text-muted text-xs line-clamp-1">
                                            {item.description}
                                          </p>
                                        )}
                                        <div className="flex items-center justify-between pt-0.5">
                                          <div className="flex items-center gap-0.5 text-blue-400 font-bold text-sm">
                                            <IndianRupee className="w-3 h-3" />
                                            <span>{item.price}</span>
                                          </div>
                                          <span className={clsx(
                                            "px-2 py-0.5 rounded-full text-xs font-bold",
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
                                className="cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-cyan-300 bg-white/90 transition-all duration-200 hover:border-cyan-400 hover:shadow-md dark:border-cyan-400/25 dark:bg-slate-900/40 dark:hover:border-cyan-300/50"
                              >
                                <CardContent className="p-0 flex items-center justify-center min-h-[100px]">
                                  <div className="flex flex-col items-center gap-1 p-4 text-slate-500 transition-colors hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground">
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
                            className="table-container dashboard-module-surface overflow-hidden rounded-lg border border-cyan-500/25"
                          >
                            {cat.items.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                <UtensilsCrossed className="w-8 h-8 opacity-30" />
                                <p className="body-text-muted">No items yet</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead className="dashboard-module-table-head">
                                    <tr>
                                      {["Item", "Description", "Price", "Status", "Action"].map(h => (
                                        <th key={h} className="table-cell text-xs font-bold uppercase tracking-wider text-white dark:text-cyan-100/80">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cat.items.map((item) => {
                                      if (!item?.id) return null
                                      const isDeleting = deletingItemId === item.id
                                      return (
                                        <tr key={item.id} className="table-row border-b border-cyan-500/10 last:border-0">
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
                                            <div className="flex items-center gap-0.5 font-bold text-sky-700 dark:text-blue-400">
                                              <IndianRupee className="icon-md" />
                                              <span>{item.price}</span>
                                            </div>
                                          </td>

                                          {/* Status */}
                                          <td className="table-cell">
                                            <span className={clsx(
                                              "px-2 py-0.5 rounded-full text-xs font-bold border",
                                              item.is_active
                                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                : "border-border bg-muted/20 text-slate-600 dark:text-muted-foreground"
                                            )}>
                                              {item.is_active ? "Active" : "Inactive"}
                                            </span>
                                          </td>

                                          {/* Action */}
                                          <td className="table-cell">
                                            <button
                                              onClick={() => deleteMenuItem(cat.id, item.id)}
                                              disabled={isDeleting}
                                              className={destructiveIconButtonClass}
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
      </div>

      {/* ✅ Category Dialog */}
      <Dialog open={showCategoryDlg} onOpenChange={setShowCategoryDlg}>
        <DialogContent className="ui-dialog-surface w-[95vw] rounded-xl shadow-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="ui-dialog-title flex items-center gap-2 text-lg font-bold tracking-wide">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10">
                <FolderPlus className="h-4 w-4 text-cyan-300" />
              </span>
              New Category
            </DialogTitle>
            <DialogDescription className="ui-dialog-subtle text-sm">
              Enter a name and description for your new category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Name *</label>
              <Input
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Food, Drinks, Snacks"
                disabled={categoryLoading}
                className="ui-input-surface focus-visible:ring-cyan-400/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Description</label>
              <Input
                value={categoryForm.description}
                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description"
                disabled={categoryLoading}
                className="ui-input-surface focus-visible:ring-cyan-400/60"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowCategoryDlg(false)} disabled={categoryLoading} className={`${secondaryButtonClass} flex-1`}>
              Cancel
            </button>
            <button
              onClick={createCategory}
              disabled={categoryLoading || !categoryForm.name.trim()}
              className={`${primaryButtonClass} flex-1`}
            >
              {categoryLoading ? <><Loader2 className="icon-md animate-spin" /> Creating...</> : 'Create Category'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Menu Item Dialog */}
      <Dialog open={showMenuDlg} onOpenChange={setShowMenuDlg}>
        <DialogContent className="ui-dialog-surface w-[95vw] rounded-xl shadow-2xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="ui-dialog-title flex items-center gap-2 text-lg font-bold tracking-wide">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/35 bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </span>
              New Menu Item
            </DialogTitle>
            <DialogDescription className="ui-dialog-subtle text-sm">
              Add a new item to your category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Name *</label>
              <Input
                value={menuForm.name}
                onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="e.g. Burger, Coffee"
                disabled={menuLoading}
                className="ui-input-surface focus-visible:ring-cyan-400/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Description</label>
              <Textarea
                value={menuForm.description}
                onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                placeholder="Optional description"
                disabled={menuLoading}
                rows={3}
                className="ui-input-surface resize-none focus-visible:ring-cyan-400/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Price (₹) *</label>
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
                  className="ui-input-surface pl-9 focus-visible:ring-cyan-400/60"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-cyan-100/80">Image (optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={menuLoading}
                className="ui-input-surface text-slate-900 file:border-0 file:bg-transparent file:font-medium file:text-sky-700 dark:text-slate-200 dark:file:text-cyan-300"
              />
              {menuForm.imageFile && (
                <p className="body-text-muted text-xs mt-1">
                  📸 {menuForm.imageFile.name} ({(menuForm.imageFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowMenuDlg(false)} disabled={menuLoading} className={`${secondaryButtonClass} flex-1`}>
              Cancel
            </button>
            <button
              onClick={createMenuItem}
              disabled={menuLoading || !menuForm.name.trim() || !menuForm.price.trim()}
              className={`${primaryButtonClass} flex-1`}
            >
              {menuLoading ? <><Loader2 className="icon-md animate-spin" /> Creating...</> : 'Create Item'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
