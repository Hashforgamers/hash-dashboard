"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function TableDragScroll() {
  const pathname = usePathname()

  useEffect(() => {
    const wrappers = Array.from(document.querySelectorAll<HTMLElement>(".dashboard-table-wrap"))
    const cleanups: Array<() => void> = []

    wrappers.forEach((wrap) => {
      let isDown = false
      let startX = 0
      let scrollLeft = 0

      const onMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return
        isDown = true
        wrap.dataset.dragging = "true"
        startX = event.pageX - wrap.offsetLeft
        scrollLeft = wrap.scrollLeft
      }

      const onMouseLeave = () => {
        isDown = false
        delete wrap.dataset.dragging
      }

      const onMouseUp = () => {
        isDown = false
        delete wrap.dataset.dragging
      }

      const onMouseMove = (event: MouseEvent) => {
        if (!isDown) return
        event.preventDefault()
        const x = event.pageX - wrap.offsetLeft
        const walk = (x - startX) * 1.2
        wrap.scrollLeft = scrollLeft - walk
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
