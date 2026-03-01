"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MainNav } from "../components/main-nav"
import Image from "next/image"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div className="premium-shell flex min-h-dvh overflow-hidden text-foreground">
      <header className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center space-x-2">
          <Image
            src={theme === "dark" ? "/whitehashlogo.png" : "/blackhashlogo.png"}
            alt="Hash Logo"
            width={36}
            height={36}
            className="shrink-0"
          />
          <span className="premium-heading text-base font-semibold">Hash Gaming</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="md:hidden"
        >
          {isNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden pt-[58px] md:pt-0">
        <aside
          className={`
            group fixed left-0 top-0 z-30 h-full w-[86vw] max-w-72 border-r border-border/70 bg-background/85 p-4 backdrop-blur-md transition-transform duration-300 ease-out
            md:relative md:w-72 md:max-w-none md:translate-x-0
            xl:w-[76px] xl:hover:w-72
            ${isNavOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="mb-6 hidden items-end space-x-2 overflow-hidden md:flex">
            <Image
              src="/whitehashlogo.png"
              alt="Hash Logo - Dark Mode"
              width={36}
              height={36}
              className="shrink-0 hidden dark:block"
            />
            <Image
              src="/blackhashlogo.png"
              alt="Hash Logo - Light Mode"
              width={36}
              height={36}
              className="shrink-0 dark:hidden"
            />
            <span className="premium-heading ml-1 hidden whitespace-nowrap text-sm font-semibold text-foreground md:block xl:hidden xl:group-hover:block">
              Hash Gaming
            </span>
          </div>

          <MainNav className="flex-col items-start space-y-2" onItemClick={() => setIsNavOpen(false)} />
        </aside>

        {isNavOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/55 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsNavOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto px-2 pb-2 pt-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4 md:pt-4">
          {children}
        </main>
      </div>
    </div>
  )
}
