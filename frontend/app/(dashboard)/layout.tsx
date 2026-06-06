import Sidebar from "@/components/Sidebar"
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8">
        {children}
      </main>
    </div>
  )
}
