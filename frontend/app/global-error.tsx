"use client"
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html><body>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#030712"}}>
        <div style={{textAlign:"center"}}>
          <p style={{color:"#f87171",marginBottom:"8px"}}>Error: {error.message}</p>
          <button onClick={reset} style={{padding:"8px 16px",background:"#2563eb",color:"white",borderRadius:"8px",border:"none",cursor:"pointer"}}>
            Coba Lagi
          </button>
        </div>
      </div>
    </body></html>
  )
}