import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const pointerDownRef = React.useRef(false)
  const draggingRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const DRAG_THRESHOLD_PX = 6

  const shouldIgnoreDrag = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(
      target.closest(
        "button, a, input, textarea, select, option, label, [role='button'], [data-no-drag]"
      )
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return
    if (event.button !== 0) return
    if (shouldIgnoreDrag(event.target)) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    if (wrapper.scrollWidth <= wrapper.clientWidth) return
    pointerDownRef.current = true
    draggingRef.current = false
    setIsDragging(false)
    startXRef.current = event.clientX
    scrollLeftRef.current = wrapper.scrollLeft
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const delta = event.clientX - startXRef.current
    if (!draggingRef.current && Math.abs(delta) < DRAG_THRESHOLD_PX) {
      return
    }
    if (!draggingRef.current) {
      draggingRef.current = true
      setIsDragging(true)
      wrapper.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    wrapper.scrollLeft = scrollLeftRef.current - delta
  }

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return
    const wasDragging = draggingRef.current
    pointerDownRef.current = false
    draggingRef.current = false
    setIsDragging(false)
    const wrapper = wrapperRef.current
    if (wrapper) {
      if (wrapper.hasPointerCapture(event.pointerId)) {
        wrapper.releasePointerCapture(event.pointerId)
      }
      if (wasDragging) {
        const suppressClick = (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
        }
        wrapper.addEventListener("click", suppressClick, true)
        setTimeout(() => wrapper.removeEventListener("click", suppressClick, true), 0)
      }
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="dashboard-table-wrap relative w-full overflow-x-auto overflow-y-auto"
      data-native-drag="true"
      data-dragging={isDragging ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerLeave={stopDragging}
    >
      <table
        ref={ref}
        className={cn("dashboard-table caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
})
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
