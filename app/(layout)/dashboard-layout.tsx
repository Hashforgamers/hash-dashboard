"use client"

import { useState } from "react"
import { Moon, Sun, Hash , Menu, X  } from 'lucide-react'
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MainNav } from "../components/main-nav"
import Image from "next/image"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)
  

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground flex-col">
      {/* <header className="flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-10"> */}

       {/* ADDED: Mobile header with hamburger menu */}
      <header className="flex items-center justify-between p-4 bg-card border-b border-border md:hidden">
        <div className="flex items-center space-x-2">
          {/* Mobile logo */}
          <Image
            src={theme === 'dark' ? "/whitehashlogo.png" : "/blackhashlogo.png"}
            alt="Hash Logo"
            width={40}
            height={40}
            className="shrink-0"
          />
          <span className="font-bold text-lg">Hash Gaming</span>
        </div>

         {/* ADDED: Hamburger menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="md:hidden"
        >
          {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>
        
    
      <div className="flex flex-1 overflow-hidden ">   
          {/* FIXED: Navigation sidebar with proper mobile/desktop behavior */}
               
               <aside className={`
                  fixed md:relative z-30 md:z-auto
                  w-64 md:w-[60px] md:hover:w-64 group
                  bg-background border-r border-border p-4 
                  transition-all duration-300 ease-in-out overflow-hidden
                  h-full md:h-auto
                   ${isNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                 `}>
          
          {/* Desktop logo (hidden on mobile since it's in header) */}
          <div className="hidden md:flex items-end space-x-2 mb-6 overflow-hidden">
            {/* Dark mode logo (white logo) */}
            <Image
              src="/whitehashlogo.png"
              alt="Hash Logo - Dark Mode"
              width={40}
              height={40}
              className="shrink-0 hidden dark:block"
            />
            {/* Light mode logo (black logo) */}
            <Image
              src="/blackhashlogo.png"
              alt="Hash Logo - Light Mode"
              width={100}
              height={100}
              className="shrink-0 dark:hidden"
            />
          </div>
          
          <MainNav className="flex-col items-start space-y-2" 
          onItemClick={() => setIsNavOpen(false)} />
        </aside>

        {/* ADDED: Mobile overlay to close menu when clicking outside */}
        {isNavOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden" 
            onClick={() => setIsNavOpen(false)}
          />
        )}

        {/* FIXED: Main content area with proper spacing */}
         <main className="flex-1 overflow-y-auto p-4">
          {children}  
         </main>
      </div>
    </div>
  )
}
