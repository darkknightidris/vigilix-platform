"use client"
import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { createClient } from "@/lib/supabase/client"

const columns = [
  { id: "open", label: "Open", color: "border-red-500", bg: "bg-red-500" },
  { id: "in_progress", label: "In Progress", color: "border-yellow-500", bg: "bg-yellow-500" },
  { id: "fixed", label: "Fixed", color: "border-green-500", bg: "bg-green-500" },
  { id: "closed", label: "Closed", color: "border-gray-500", bg: "bg-gray-500" },
]

const severityColors: Record<string,string> = {
  critical:"bg-red-600",high:"bg-orange-500",medium:"bg-yellow-500",low:"bg-blue-500",info:"bg-gray-500"
}

function VulnCard({ vuln, provided, snapshot }: any) {
  return (
    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
      className={`p-3 bg-gray-800 rounded-lg border border-gray-700 cursor-grab active:cursor-grabbing transition ${
        snapshot.isDragging ? "shadow-lg shadow-black/50 rotate-1" : ""
      }`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold text-white uppercase shrink-0 ${severityColors[vuln.severity] || "bg-gray-600"}`}>
          {vuln.severity?.slice(0,4)}
        </span>
        <p className="text-white text-xs font-medium leading-relaxed">{vuln.title}</p>
      </div>
      {vuln.cvss_score && <p className="text-gray-500 text-xs mt-1.5">CVSS {vuln.cvss_score}</p>}
      {vuln.due_date && (
        <p className={`text-xs mt-1 ${new Date(vuln.due_date) < new Date() ? "text-red-400" : "text-gray-500"}`}>
          📅 {new Date(vuln.due_date).toLocaleDateString("id-ID")}
        </p>
      )}
      {vuln.assigned_to && <p className="text-gray-500 text-xs mt-1">👤 Assigned</p>}
    </div>
  )
}

export default function KanbanBoard({ initialVulns, projectId }: { initialVulns: any[], projectId: string }) {
  const [vulns, setVulns] = useState(initialVulns)
  const [expanded, setExpanded] = useState<string>("open")
  const supabase = createClient()

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result
    if (!destination) return
    const newStatus = destination.droppableId
    setVulns(prev => prev.map(v => v.id === draggableId ? { ...v, status: newStatus } : v))
    await supabase.from("vulnerabilities").update({ status: newStatus }).eq("id", draggableId)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Desktop: 4 kolom */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {columns.map(col => {
          const items = vulns.filter(v => v.status === col.id)
          return (
            <div key={col.id} className={`bg-gray-900 rounded-xl border-t-2 ${col.color} p-4 min-h-64`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold text-sm">{col.label}</h3>
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`space-y-2 min-h-8 rounded-lg transition ${snapshot.isDraggingOver ? "bg-gray-800/50" : ""}`}>
                    {items.map((vuln, index) => (
                      <Draggable key={vuln.id} draggableId={vuln.id} index={index}>
                        {(provided, snapshot) => <VulnCard vuln={vuln} provided={provided} snapshot={snapshot} />}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>

      {/* Mobile: accordion list vertikal */}
      <div className="md:hidden space-y-3">
        {columns.map(col => {
          const items = vulns.filter(v => v.status === col.id)
          const isOpen = expanded === col.id
          return (
            <div key={col.id} className={`bg-gray-900 rounded-xl border-l-4 ${col.color} overflow-hidden`}>
              <button
                onClick={() => setExpanded(isOpen ? "" : col.id)}
                className="w-full flex justify-between items-center px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${col.bg}`} />
                  <h3 className="text-white font-semibold text-sm">{col.label}</h3>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`px-4 pb-4 space-y-2 min-h-8 transition ${snapshot.isDraggingOver ? "bg-gray-800/50" : ""}`}>
                      {items.length === 0 && (
                        <p className="text-gray-600 text-xs text-center py-4">Tidak ada temuan</p>
                      )}
                      {items.map((vuln, index) => (
                        <Draggable key={vuln.id} draggableId={vuln.id} index={index}>
                          {(provided, snapshot) => <VulnCard vuln={vuln} provided={provided} snapshot={snapshot} />}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
