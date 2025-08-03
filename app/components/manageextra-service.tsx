"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { Plus, Trash2, Edit3, UtensilsCrossed, Coffee, X, Upload } from "lucide-react"
import Image from "next/image"
import clsx from "clsx"

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  isActive: boolean
}

interface ServiceCategory {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  items: MenuItem[]
}

interface CategoryFormData {
  name: string
  description: string
  icon: string
}

interface MenuItemFormData {
  name: string
  description: string
  price: string
  image: string
  isActive: boolean
}

export function ManageExtraServices() {
  const [categories, setCategories] = useState<ServiceCategory[]>([
    {
      id: "food",
      name: "Food",
      description: "Food for gamers",
      icon: <UtensilsCrossed className="w-5 h-5 text-emerald-500" />,
      items: [
        {
          id: "small-fries",
          name: "Fries",
          description: "Small Fries",
          price: 100,
          image: "https://images.unsplash.com/photo-1576107232684-1279f390b1c8?w=400&h=300&fit=crop&crop=center",
          isActive: true,
        },
        {
          id: "mid-fries",
          name: "Fries",
          description: "Mid Fries",
          price: 200,
          image: "https://images.unsplash.com/photo-1576107232684-1279f390b1c8?w=400&h=300&fit=crop&crop=center",
          isActive: true,
        },
        {
          id: "large-fries",
          name: "Fries",
          description: "Large",
          price: 250,
          image: "https://images.unsplash.com/photo-1576107232684-1279f390b1c8?w=400&h=300&fit=crop&crop=center",
          isActive: true,
        },
        {
          id: "burger",
          name: "Burger",
          description: "Classic Burger",
          price: 100,
          image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center",
          isActive: true,
        },
      ],
    },
    {
      id: "drinks",
      name: "Drinks",
      description: "Refreshing beverages",
      icon: <Coffee className="w-5 h-5 text-blue-500" />,
      items: [
        {
          id: "water",
          name: "Water",
          description: "Pure drinking water",
          price: 50,
          image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop&crop=center",
          isActive: true,
        },
      ],
    },
  ])

  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showMenuItemForm, setShowMenuItemForm] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
    description: "",
    icon: "food"
  })
  
  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormData>({
    name: "",
    description: "",
    price: "",
    image: "",
    isActive: true
  })

  // Form handlers
  const handleAddCategory = () => {
    setShowCategoryForm(true)
    setCategoryForm({ name: "", description: "", icon: "food" })
  }

  const handleAddMenuItem = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setShowMenuItemForm(true)
    setMenuItemForm({ name: "", description: "", price: "", image: "", isActive: true })
  }

  const submitCategoryForm = () => {
    const newCategory: ServiceCategory = {
      id: categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
      name: categoryForm.name,
      description: categoryForm.description,
      icon: categoryForm.icon === "food" 
        ? <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
        : <Coffee className="w-5 h-5 text-blue-500" />,
      items: []
    }
    
    setCategories([...categories, newCategory])
    setShowCategoryForm(false)
    setCategoryForm({ name: "", description: "", icon: "food" })
  }

  const submitMenuItemForm = () => {
    const newMenuItem: MenuItem = {
      id: `${selectedCategoryId}-${menuItemForm.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: menuItemForm.name,
      description: menuItemForm.description,
      price: parseInt(menuItemForm.price),
      image: menuItemForm.image || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&crop=center",
      isActive: menuItemForm.isActive
    }

    setCategories(categories.map(category => 
      category.id === selectedCategoryId 
        ? { ...category, items: [...category.items, newMenuItem] }
        : category
    ))
    
    setShowMenuItemForm(false)
    setMenuItemForm({ name: "", description: "", price: "", image: "", isActive: true })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setMenuItemForm({ ...menuItemForm, image: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Manage Extra Services</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Manage your additional services and menu items</p>
        </div>
        <Button 
          onClick={handleAddCategory}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </motion.div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="theme-card bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {category.icon}
                    <div>
                      <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-white">
                        {category.name}
                      </CardTitle>
                      {category.description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {category.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * itemIndex }}
                    >
                      <Card
                        className={clsx(
                          "overflow-hidden transition-all duration-200 hover:shadow-lg",
                          "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
                        )}
                      >
                        <CardContent className="p-0">
                          <div className="aspect-video relative">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button variant="secondary" size="icon" className="w-8 h-8 bg-white/80 hover:bg-white">
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="w-8 h-8 bg-white/80 hover:bg-white text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{item.name}</h3>
                            {item.description && (
                              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <p className="text-emerald-600 font-bold flex items-center">₹{item.price}</p>
                              <div
                                className={clsx(
                                  "px-2 py-1 rounded-full text-xs font-medium",
                                  item.isActive
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                                )}
                              >
                                {item.isActive ? "Active" : "Inactive"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Add Menu Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => handleAddMenuItem(category.id)}
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 py-2 bg-transparent"
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

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for your menu items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-name" className="text-right">
                Name
              </Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Food, Drinks"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-description" className="text-right">
                Description
              </Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category-icon" className="text-right">
                Type
              </Label>
              <select
                id="category-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="food">Food</option>
                <option value="drink">Drinks</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitCategoryForm}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Item Form Dialog */}
      <Dialog open={showMenuItemForm} onOpenChange={setShowMenuItemForm}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Add a new item to your menu category.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-name" className="text-right">
                Name
              </Label>
              <Input
                id="item-name"
                value={menuItemForm.name}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Burger, Coffee"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="item-description"
                value={menuItemForm.description}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-price" className="text-right">
                Price (₹)
              </Label>
              <Input
                id="item-price"
                type="number"
                value={menuItemForm.price}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, price: e.target.value })}
                className="col-span-3"
                placeholder="100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-image" className="text-right">
                Image
              </Label>
              <div className="col-span-3">
                <Input
                  id="item-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mb-2"
                />
                <Input
                  placeholder="Or paste image URL"
                  value={menuItemForm.image}
                  onChange={(e) => setMenuItemForm({ ...menuItemForm, image: e.target.value })}
                />
                {menuItemForm.image && (
                  <div className="mt-2 w-full h-32 relative">
                    <Image
                      src={menuItemForm.image}
                      alt="Preview"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={menuItemForm.isActive}
                    onChange={(e) => setMenuItemForm({ ...menuItemForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMenuItemForm(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitMenuItemForm}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
