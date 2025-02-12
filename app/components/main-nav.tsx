import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Receipt, Gamepad2, CalendarCheck, User } from "lucide-react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { ButtonDestructive } from "./log-out"
export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <nav
      className={cn("flex flex-col space-y-2 transition-all duration-300 ease-in-out", className)}
      {...props}
    >
      {[
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/transaction", icon: Receipt, label: "Transaction Report" },
        { href: "/gaming", icon: Gamepad2, label: "Manage Gaming Console" },
        { href: "/booking", icon: CalendarCheck, label: "Manage Booking" },
        { href: "/account", icon: User, label: "My Account" },
      ].map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
            pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="hidden group-hover:inline-block">{label}</span>
        </Link>
      ))}

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={cn(
          "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          <Sun
            className={cn(
              "absolute transition-transform duration-300",
              theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
            )}
          />
          <Moon
            className={cn(
              "absolute transition-transform duration-300",
              theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )}
          />
        </div>
        <span className="hidden group-hover:inline-block">Toggle Theme</span>
      </button>
      
      <ButtonDestructive/>
    </nav>
  )
}
