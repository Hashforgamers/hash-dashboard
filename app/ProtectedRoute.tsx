// "use client";

// import { useAuth } from "./AuthProvider";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// export default function ProtectedRoute({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { isAuthenticated } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!isAuthenticated) {
//       router.push("/login");
//     }
//   }, [isAuthenticated, router]);

//   return isAuthenticated ? children : null;
// }
