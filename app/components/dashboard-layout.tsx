"use client"

import { useState } from "react"
import { Moon, Sun, Hash } from 'lucide-react'
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MainNav } from "./main-nav"
import Image from "next/image"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)
  

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground flex-col">
      {/* <header className="flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-10"> */}
        
      {/* </header> */}
      <div className="flex flex-1 overflow-hidden ">
        <aside className={`w-[60px] group hover:w-64 bg-card border-r border-border p-4 items-centertransition-all duration-300 ease-in-out ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-hidden`}>
        <div className="flex items-end space-x-2 mb-6 overflow-hidden">
          {/* Dark mode logo (white logo) */}
          <Image
            src="/whitehashlogo.png"
            alt="Hash Logo - Dark Mode"
            width={100}
            height={100}
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
          <MainNav className="flex-col items-start space-y-2" />
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:ml-[60px] transition-all duration-300 ease-in-out group-hover:md:ml-64">
          {children}
        </main>
      </div>
    </div>
  )
}

