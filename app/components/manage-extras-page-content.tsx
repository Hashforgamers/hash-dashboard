"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Pencil, Trash2, PlusCircle, Utensils, Pizza, Loader2 } from "lucide-react";
import { DASHBOARD_URL } from "@/src/config/env";

// UTIL LOADER ICON
function Loader() {
  return <Loader2 className="animate-spin h-4 w-4 text-emerald-500" />;
}

const VENDOR_ID = (() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("selectedCafe");
  }
  return "1";
})();

type Category = {
  id: number;
  name: string;
  description?: string;
  menus: MenuItem[];
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  description?: string;
};

export default function ManageExtrasPageContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);

  // Fetch categories and menus
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/categories`
      );
      setCategories(res.data);
    } catch (err) {
      // Can optionally set a global error here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line
  }, []);

  // --- CRUD handlers (No toast; submit disables buttons and shows spinner) ---

  const handleAddCategory = async (
    data: { name: string; description?: string },
    close: () => void
  ) => {
    try {
      await axios.post(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category`,
        data
      );
      fetchCategories();
      close();
    } catch (error) {}
  };

  const handleEditCategory = async (
    id: number,
    data: { name: string; description?: string },
    close: () => void
  ) => {
    try {
      await axios.put(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category/${id}`,
        data
      );
      fetchCategories();
      close();
    } catch (error) {}
  };

  const handleDeleteCategory = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this category? All associated menus will also be deleted."
      )
    )
      return;
    setDeletingCategoryId(id);
    try {
      await axios.delete(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category/${id}`
      );
      fetchCategories();
    } catch (error) {} 
    finally {
      setDeletingCategoryId(null);
    }
  };

  const handleAddMenu = async (
    categoryId: number,
    data: { name: string; price: number; description?: string },
    close: () => void
  ) => {
    try {
      await axios.post(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category/${categoryId}/menu`,
        data
      );
      fetchCategories();
      close();
    } catch (error) {}
  };

  const handleEditMenu = async (
    categoryId: number,
    menuId: number,
    data: { name: string; price: number; description?: string },
    close: () => void
  ) => {
    try {
      await axios.put(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category/${categoryId}/menu/${menuId}`,
        data
      );
      fetchCategories();
      close();
    } catch (error) {}
  };

  const handleDeleteMenu = async (categoryId: number, menuId: number) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    setDeletingMenuId(menuId);
    try {
      await axios.delete(
        `${DASHBOARD_URL}/api/vendor/${VENDOR_ID}/extras/category/${categoryId}/menu/${menuId}`
      );
      fetchCategories();
    } catch (error) {} 
    finally { setDeletingMenuId(null); }
  };

  return (
    <main className="max-w-6xl mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Utensils className="text-emerald-600 w-8 h-8" />
          Manage Extra Services
        </h1>
        <AddCategoryDialog onSave={handleAddCategory} />
      </header>

      {loading ? (
        <div className="flex w-full justify-center py-16">
          <Loader />
        </div>
      ) : categories.length === 0 ? (
        <div className="p-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-center">
          No categories found. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-white dark:bg-gray-900 shadow-md border">
              <CardHeader className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Pizza className="w-6 h-6 text-orange-500" />
                  <div>
                    <h2 className="font-semibold text-lg">{category.name}</h2>
                    {category.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{category.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <EditCategoryDialog category={category} onSave={handleEditCategory} />
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 hover:text-rose-600"
                    aria-label={`Delete category ${category.name}`}
                    type="button"
                    disabled={deletingCategoryId === category.id}
                  >
                    {deletingCategoryId === category.id ? <Loader /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <div className="flex justify-end mb-2">
                  <AddMenuDialog categoryId={category.id} onSave={handleAddMenu} />
                </div>
                {category.menus.length === 0 ? (
                  <div className="italic text-gray-400 text-sm text-center py-6">No menu items in this category.</div>
                ) : (
                  <ul className="space-y-1">
                    {category.menus.map((menu) => (
                      <li
                        key={menu.id}
                        className="flex justify-between items-center p-2 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                      >
                        <div>
                          <span className="font-medium">{menu.name}</span>
                          {menu.description && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {menu.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            ₹{menu.price}
                          </span>
                          <EditMenuDialog
                            categoryId={category.id}
                            menu={menu}
                            onSave={handleEditMenu}
                          />
                          <button
                            onClick={() => handleDeleteMenu(category.id, menu.id)}
                            className="p-2 hover:text-rose-600"
                            aria-label={`Delete menu ${menu.name}`}
                            type="button"
                            disabled={deletingMenuId === menu.id}
                          >
                            {deletingMenuId === menu.id ? <Loader /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

// --- Enhanced Dialog components for loading UX ---

function AddCategoryDialog({
  onSave,
}: {
  onSave: (data: { name: string; description?: string }, close: () => void) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    await onSave(form, () => {
      setOpen(false);
      setForm({ name: "", description: "" });
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 px-4">
          <PlusCircle />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add New Category</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Category Name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="category-desc">Description (optional)</Label>
            <Input
              id="category-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader /> : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({
  category,
  onSave,
}: {
  category: Category;
  onSave: (id: number, data: { name: string; description?: string }, close: () => void) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: category.name,
    description: category.description || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({ name: category.name, description: category.description || "" });
  }, [category]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    await onSave(category.id, form, () => setOpen(false));
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit category ${category.name}`}>
          <Pencil className="w-4 h-4 text-emerald-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit Category</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-category-name">Name</Label>
            <Input
              id="edit-category-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Category Name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="edit-category-desc">Description (optional)</Label>
            <Input
              id="edit-category-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader /> : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMenuDialog({
  categoryId,
  onSave,
}: {
  categoryId: number;
  onSave: (categoryId: number, data: { name: string; price: number; description?: string }, close: () => void) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const priceNum = parseFloat(form.price);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !priceNum || priceNum <= 0) return;
    setIsSubmitting(true);
    await onSave(categoryId, { name: form.name.trim(), price: priceNum, description: form.description.trim() }, () => {
      setOpen(false);
      setForm({ name: "", price: "", description: "" });
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 px-3">
          <PlusCircle />
          Add Menu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Menu Item</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="menu-name">Name</Label>
            <Input
              id="menu-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Menu Item Name"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="menu-price">Price (₹)</Label>
            <Input
              id="menu-price"
              type="number"
              min={1}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="Price"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="menu-desc">Description (optional)</Label>
            <Input
              id="menu-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader /> : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function EditMenuDialog({
  categoryId,
  menu,
  onSave,
}: {
  categoryId: number;
  menu: MenuItem;
  onSave: (categoryId: number, menuId: number, data: { name: string; price: number; description?: string }, close: () => void) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: menu.name,
    price: String(menu.price),
    description: menu.description || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const priceNum = parseFloat(form.price);

  useEffect(() => {
    setForm({ name: menu.name, price: String(menu.price), description: menu.description || "" });
  }, [menu]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !priceNum || priceNum <= 0) return;
    setIsSubmitting(true);
    await onSave(categoryId, menu.id, { name: form.name.trim(), price: priceNum, description: form.description.trim() }, () => setOpen(false));
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit menu item ${menu.name}`}>
          <Pencil className="w-4 h-4 text-emerald-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit Menu Item</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-menu-name">Name</Label>
            <Input
              id="edit-menu-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="edit-menu-price">Price (₹)</Label>
            <Input
              id="edit-menu-price"
              type="number"
              min={1}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="edit-menu-desc">Description (optional)</Label>
            <Input
              id="edit-menu-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader /> : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
