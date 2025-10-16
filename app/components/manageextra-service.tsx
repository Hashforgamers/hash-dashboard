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
/* ----------------------------    CONFIG    ---------------------------- */
/* ------------------------------------------------------------------ */
const API_BASE = `${DASHBOARD_URL}/api`;


const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('food') || name.includes('snack')) {
    return <UtensilsCrossed className="icon-lg text-orange-400" />;
  }
  if (name.includes('drink') || name.includes('beverage')) {
    return <Coffee className="icon-lg text-blue-400" />;
  }
  return <UtensilsCrossed className="icon-lg text-primary" />;
};


/* ------------------------------------------------------------------ */
/* -------------------------    COMPONENT    ---------------------------- */
/* ------------------------------------------------------------------ */
export default function ManageExtraServices() {
  // Prevent hydration mismatch with isClient state
  const [isClient, setIsClient] = useState(false)
  
  // State initialization with safe defaults
  const [categories, setCategories] = useState<ExtraServiceCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<number | null>(null)


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
      
      const data = await res.json()
      console.log('Raw API response:', data)
      
      // Check if API call was successful
      if (!data || !data.success) {
        throw new Error(data?.message || 'API request failed')
      }
      
      // Extract categories from the response object
      const categoriesData = data.categories
      
      if (!Array.isArray(categoriesData)) {
        console.error('Categories is not an array:', typeof categoriesData, categoriesData)
        throw new Error('Invalid categories data format')
      }
      
      // Transform API response to match component's expected format
      const validatedCategories: ExtraServiceCategory[] = categoriesData.map((cat: any, index: number) => {
        if (!cat || typeof cat !== 'object') {
          console.warn(`Invalid category at index ${index}:`, cat)
          return null
        }
        
        // Transform menus to items with correct image handling
        const transformedItems: ExtraServiceMenu[] = Array.isArray(cat.menus) 
          ? cat.menus.map((menu: any) => {
              if (!menu || typeof menu !== 'object') {
                console.warn('Invalid menu item:', menu)
                return null
              }
              
              // Get the first image URL if images array exists
              let imageUrl: string | null = null
              if (Array.isArray(menu.images) && menu.images.length > 0) {
                const firstImage = menu.images[0]
                imageUrl = firstImage?.image_url || null
              }
              
              return {
                id: menu.id || 0,
                name: menu.name || 'Untitled Item',
                description: menu.description || '',
                price: menu.price || 0,
                image: imageUrl, // Single image URL (first from images array)
                is_active: menu.is_active !== false // Default to true if not specified
              }
            }).filter(Boolean) // Remove null entries
          : []
        
        // Create validated category
        const validatedCategory: ExtraServiceCategory = {
          id: cat.id || index + 1,
          name: cat.name || `Category ${index + 1}`,
          description: cat.description || '',
          items: transformedItems // Use 'items' as expected by the component
        }
        
        return validatedCategory
      }).filter(Boolean) as ExtraServiceCategory[]
      
      console.log('Categories transformed and validated:', validatedCategories)
      setCategories(validatedCategories)
      
    } catch (err) {
      console.error('Error fetching categories:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
      setError(errorMessage)
      // Always ensure categories is an array, even on error
      setCategories([])
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
  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])


  // Only access localStorage after client-side mounting
  useEffect(() => {
    if (!isClient) return
    
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        setError('No authentication token found')
        return
      }
      
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      
      if (!decoded_token?.sub?.id) {
        throw new Error('Invalid token structure')
      }
      
      console.log('Decoded token:', decoded_token)
      setVendorId(decoded_token.sub.id);
      console.log('Vendor ID set to:', decoded_token.sub.id)
      
    } catch (error) {
      console.error('Error decoding token:', error)
      setError('Invalid authentication token')
    }
  }, [isClient]);


  // Fetch categories when vendorId is available and client is mounted
  useEffect(() => {
    if (vendorId && isClient) {
      console.log('VendorId available, fetching categories...')
      fetchCategories().catch(err => {
        console.error('Unhandled error in fetchCategories:', err)
        setError('Unexpected error occurred while fetching data')
      })
    }
  }, [vendorId, isClient])


  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    // Return the same loading structure that would appear on client
    return (
      <div className="page-container section-spacing">
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">
              Manage Extra Services
            </h1>
            <p className="page-subtitle">
              Create categories and add menu items
            </p>
          </div>
          <Button disabled className="btn-primary">
            <Plus className="icon-md mr-2" />
            <span>New Category</span>
          </Button>
        </div>
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
          <p className="body-text-muted mt-2">Loading...</p>
        </div>
      </div>
    )
  }


  /* -----------------    UI    ----------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container section-spacing"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="page-header"
      >
        <div className="page-title-section">
          <h1 className="page-title">
            Manage Extra Services
          </h1>
          <p className="page-subtitle">
            Create categories and add menu items
          </p>
        </div>
        <Button
          onClick={() => setShowCategoryDlg(true)}
          disabled={loading || !vendorId}
          className="btn-primary"
        >
          <Plus className="icon-md mr-2" />
          <span>New Category</span>
        </Button>
      </motion.div>


      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4 text-destructive">
          <p className="body-text font-medium">Error:</p>
          <p className="body-text-muted mt-1 break-words">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs sm:text-sm"
            onClick={() => {
              setError(null)
              if (vendorId) fetchCategories()
            }}
            disabled={!vendorId}
          >
            Try Again
          </Button>
        </div>
      )}


      {/* Loading State */}
      {!vendorId && !error && (
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
          <p className="body-text-muted mt-2">Loading authentication...</p>
        </div>
      )}


      {/* Category List */}
      {vendorId && (
        loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
            <p className="body-text-muted mt-2">Loading categories...</p>
          </div>
        ) : !Array.isArray(categories) || categories.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="body-text-muted">
              {!Array.isArray(categories) ? 'Invalid data format' : 'No categories found.'}
            </p>
            {Array.isArray(categories) && (
              <Button
                className="mt-4 btn-primary"
                onClick={() => setShowCategoryDlg(true)}
              >
                Create Your First Category
              </Button>
            )}
          </div>
        ) : (
          <div className="section-spacing">
            {categories.map((cat, i) => {
              // Additional safety validation for each category
              if (!cat || typeof cat !== 'object' || !cat.id) {
                console.warn('Skipping invalid category:', cat)
                return null
              }
              
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Card className="content-card shadow-lg">
                    <CardHeader className="content-card-padding pb-3 sm:pb-4">
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="icon-container bg-muted/20 shrink-0">
                            {getCategoryIcon(cat.name || 'category')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="card-title truncate">
                              {cat.name || 'Untitled Category'}
                            </CardTitle>
                            {cat.description && (
                              <p className="card-subtitle mt-1 line-clamp-2">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCategory(cat.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg w-8 h-8 sm:w-10 sm:h-10 shrink-0"
                        >
                          <Trash2 className="icon-lg" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="content-card-padding pt-0">
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-compact">
                        {/* Safe mapping with comprehensive validation */}
                        {Array.isArray(cat.items) && cat.items.map((item, idx) => {
                          // Validate each item before rendering
                          if (!item || typeof item !== 'object' || !item.id) {
                            console.warn('Skipping invalid menu item:', item)
                            return null
                          }
                          
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.04 * idx }}
                              className="w-full max-w-[280px] mx-auto"
                            >
                              <Card className="content-card overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-muted/30 w-full">
                                <CardContent className="p-0">
                                  <div className="aspect-video relative">
                                    <Image
                                      alt={item.name || 'Menu item'}
                                      src={item.image ?? "/placeholder.svg?height=140&width=220&query=food item"}
                                      fill
                                      className="object-cover rounded-t-lg"
                                    />
                                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="w-6 h-6 sm:w-7 sm:h-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive-foreground rounded-lg"
                                        onClick={() => deleteMenuItem(cat.id, item.id)}
                                      >
                                        <Trash2 className="icon-sm" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="p-tight space-y-1 sm:space-y-2">
                                    <h3 className="body-text font-semibold truncate">
                                      {item.name || 'Untitled Item'}
                                    </h3>
                                    {item.description && (
                                      <p className="body-text-small line-clamp-2">
                                        {item.description}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between pt-1">
                                      <p className="price-small">
                                        ₹{item.price || 0}
                                      </p>
                                      <span className={clsx(
                                        "px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0",
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
                          )
                        })}
                        
                        {/* Add Menu Card */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.04 * (Array.isArray(cat.items) ? cat.items.length : 0) }}
                          className="w-full max-w-[280px] mx-auto"
                        >
                          <Card className="content-card overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-muted/30 border-2 border-dashed border-muted-foreground/50 hover:border-primary/70 cursor-pointer w-full">
                            <CardContent 
                              className="p-0 h-full flex items-center justify-center min-h-[120px] sm:min-h-[140px]"
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
                              <div className="aspect-video w-full flex flex-col items-center justify-center text-muted-foreground p-2 sm:p-4">
                                <div className="text-center">
                                  <Plus className="icon-xl mx-auto mb-1 sm:mb-2" />
                                  <span className="body-text font-medium">Add Menu</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )
      )}


      {/* Category Dialog */}
      <Dialog open={showCategoryDlg} onOpenChange={setShowCategoryDlg}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="section-title">New Category</DialogTitle>
            <DialogDescription className="body-text-muted">
              Enter a name and description for your new category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto">
            <div>
              <Label htmlFor="cat-name" className="form-label">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g. Food, Drinks, Snacks"
                disabled={categoryLoading}
                className="input-field"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="form-label">Description</Label>
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
                className="input-field"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCategoryDlg(false)}
              disabled={categoryLoading}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={createCategory}
              disabled={categoryLoading || !categoryForm.name.trim()}
              className="btn-primary w-full sm:w-auto"
            >
              {categoryLoading ? (
                <>
                  <Loader2 className="icon-md mr-2 animate-spin" /> 
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Menu Item Dialog */}
      <Dialog open={showMenuDlg} onOpenChange={setShowMenuDlg}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="section-title">New Menu Item</DialogTitle>
            <DialogDescription className="body-text-muted">
              Add a new item to your category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto max-h-[60vh]">
            <div>
              <Label className="form-label">Name *</Label>
              <Input
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, name: e.target.value })
                }
                placeholder="e.g. Burger, Coffee"
                disabled={menuLoading}
                className="input-field"
              />
            </div>
            <div>
              <Label className="form-label">Description</Label>
              <Textarea
                value={menuForm.description}
                onChange={(e) =>
                  setMenuForm({ ...menuForm, description: e.target.value })
                }
                placeholder="Optional description"
                disabled={menuLoading}
                rows={3}
                className="textarea-field"
              />
            </div>
            <div>
              <Label className="form-label">Price (₹) *</Label>
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
                className="input-field"
              />
            </div>
            <div>
              <Label className="form-label">Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={menuLoading}
                className="input-field file:text-primary"
              />
              {menuForm.imageFile && (
                <p className="body-text-small mt-1 break-all">
                  📸 {menuForm.imageFile.name} ({(menuForm.imageFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowMenuDlg(false)}
              disabled={menuLoading}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={createMenuItem}
              disabled={menuLoading || !menuForm.name.trim() || !menuForm.price.trim()}
              className="btn-primary w-full sm:w-auto"
            >
              {menuLoading ? (
                <>
                  <Loader2 className="icon-md mr-2 animate-spin" /> 
                  Creating...
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
