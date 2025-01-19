"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const transactions = [
  {
    id: "1",
    slotDate: "2023-06-01",
    slotTime: "10:00 AM",
    userName: "John Doe",
    amount: 50,
    modeOfPayment: "Credit Card",
    bookingType: "hash",
    settlementStatus: "done",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },

  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },

  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  
]

export function TransactionTable() {
  return (
    <div className="border rounded-md">
      <div className="max-h-[1000px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead style={{ fontWeight: "bold" }}>Slot Date</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>Slot Time</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>User Name</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>Amount</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>Mode of Payment</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>Booking Type</TableHead>
              <TableHead style={{ fontWeight: "bold" }}>Settlement Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.slotDate}</TableCell>
                <TableCell>{transaction.slotTime}</TableCell>
                <TableCell>{transaction.userName}</TableCell>
                <TableCell>${transaction.amount}</TableCell>
                <TableCell>{transaction.modeOfPayment}</TableCell>
                <TableCell>{transaction.bookingType}</TableCell>
                <TableCell>{transaction.settlementStatus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

