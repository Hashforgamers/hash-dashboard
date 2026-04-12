"use client"

import { useMemo } from "react"
import { httpJson, type HttpJsonOptions } from "@/lib/http-client"

type ApiOpts = Omit<HttpJsonOptions, "method" | "body">

export function useApiClient() {
  return useMemo(
    () => ({
      get: <T = unknown>(url: string, options?: ApiOpts) =>
        httpJson<T>(url, { ...(options || {}), method: "GET" }),

      post: <T = unknown, B = unknown>(url: string, body?: B, options?: ApiOpts) =>
        httpJson<T>(url, {
          ...(options || {}),
          method: "POST",
          body: body === undefined ? undefined : (body as BodyInit),
        }),

      put: <T = unknown, B = unknown>(url: string, body?: B, options?: ApiOpts) =>
        httpJson<T>(url, {
          ...(options || {}),
          method: "PUT",
          body: body === undefined ? undefined : (body as BodyInit),
        }),

      patch: <T = unknown, B = unknown>(url: string, body?: B, options?: ApiOpts) =>
        httpJson<T>(url, {
          ...(options || {}),
          method: "PATCH",
          body: body === undefined ? undefined : (body as BodyInit),
        }),

      del: <T = unknown, B = unknown>(url: string, body?: B, options?: ApiOpts) =>
        httpJson<T>(url, {
          ...(options || {}),
          method: "DELETE",
          body: body === undefined ? undefined : (body as BodyInit),
        }),
    }),
    []
  )
}
