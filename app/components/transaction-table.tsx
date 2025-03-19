"use client";

import { useMemo, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

interface Transaction {
  id: number;
  userName: string;
  amount: number;
  modeOfPayment: string;
  bookingType: string;
  settlementStatus: string;
  slotDate: string;
  slotTime: string;
}

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [expirationTime, setExpirationTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("jwtToken");
      setToken(storedToken);

      if (storedToken) {
        try {
          const decoded = jwtDecode<{ sub: { id: number }; iat: number; exp: number }>(storedToken);
          console.log("Decoded JWT:", decoded);

          setVendorId(decoded?.sub?.id || null);
          setIssuedAt(decoded?.iat || null);
          setExpirationTime(decoded?.exp || null);
        } catch (error) {
          console.error("Invalid JWT Token:", error);
        }
      }
    }
  }, []);

  async function fetchData() {
    if (!vendorId) {
      console.error("Vendor ID is missing!");
      return;
    }

    const fromDate = issuedAt ? convertEpochToYYYYMMDD(issuedAt) : "";
    const toDate = expirationTime ? convertEpochToYYYYMMDD(expirationTime) : "";

    const apiUrl = `https://hfg-dashboard.onrender.com/api/transactionReport/${vendorId}/${fromDate}/${toDate}`;
    console.log("Fetching data from:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched Data:", data);
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  useEffect(() => {
    if (vendorId) {
      fetchData();
    }
  }, [vendorId]);

  function convertEpochToYYYYMMDD(epoch: number | null) {
    if (!epoch) return "";
    const date = new Date(epoch * 1000);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  }

  return <div>Transaction Table Component</div>;
}
