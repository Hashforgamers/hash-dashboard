"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function TableDragScroll() {
  const pathname = usePathname()

  useEffect(() => {
    const DRAG_THRESHOLD_PX = 6
    const interactiveSelector = [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "label",
      "[role='button']",
      "[data-no-table-drag]",
      ".no-table-drag",
    ].join(",")

    const wrappers = Array.from(document.querySelectorAll<HTMLElement>(".dashboard-table-wrap"))
    const cleanups: Array<() => void> = []

    wrappers.forEach((wrap) => {
      let isPointerDown = false
      let isDragging = false
      let startX = 0
      let scrollLeft = 0

      const onMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return
        if ((event.target as HTMLElement)?.closest(interactiveSelector)) return
        isPointerDown = true
        isDragging = false
        startX = event.pageX - wrap.offsetLeft
        scrollLeft = wrap.scrollLeft
      }

      const stopDragging = () => {
        isPointerDown = false
        if (isDragging) {
          // Prevent accidental row-click toggles after drag scrolling.
          const suppressClick = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
          }
          wrap.addEventListener("click", suppressClick, true)
          setTimeout(() => wrap.removeEventListener("click", suppressClick, true), 0)
        }
        isDragging = false
        delete wrap.dataset.dragging
      }

      const onMouseLeave = () => stopDragging()
      const onMouseUp = () => stopDragging()

      const onMouseMove = (event: MouseEvent) => {
        if (!isPointerDown) return
        const x = event.pageX - wrap.offsetLeft
        const walk = x - startX
        if (!isDragging && Math.abs(walk) < DRAG_THRESHOLD_PX) return
        if (!isDragging) {
          isDragging = true
          wrap.dataset.dragging = "true"
        }
        event.preventDefault()
        const acceleratedWalk = walk * 1.2
        wrap.scrollLeft = scrollLeft - acceleratedWalk
      }

      wrap.addEventListener("mousedown", onMouseDown)
      wrap.addEventListener("mouseleave", onMouseLeave)
      wrap.addEventListener("mouseup", onMouseUp)
      wrap.addEventListener("mousemove", onMouseMove)

      cleanups.push(() => {
        wrap.removeEventListener("mousedown", onMouseDown)
        wrap.removeEventListener("mouseleave", onMouseLeave)
        wrap.removeEventListener("mouseup", onMouseUp)
        wrap.removeEventListener("mousemove", onMouseMove)
      })
    })

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [pathname])

  return null
}
