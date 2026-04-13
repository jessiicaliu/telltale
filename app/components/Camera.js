"use client"

export default function Camera({ videoRef, canvasRef, simulatorRef, showSimulator, showDots, onToggleDots }) {
  const videoSize = showSimulator ? "w-full h-[360px]" : "w-[640px] h-[480px]"

  return (
    <div className={`flex gap-4 w-full ${showSimulator ? "flex-row" : "flex-col items-center"}`}>

      {showSimulator && (
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] flex-1"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)" }}>
          <video
            ref={simulatorRef}
            src="/interview-simulator.mp4"
            autoPlay loop playsInline
            className="w-full h-[360px] object-cover block"
          />
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs text-white/30"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Interviewer
          </div>
        </div>
      )}

      <div className={`relative rounded-2xl overflow-hidden border border-white/[0.08] ${showSimulator ? "flex-1" : ""}`}
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02), 0 24px 64px rgba(0,0,0,0.6)" }}>
        <video ref={videoRef} autoPlay playsInline className={`object-cover block ${videoSize}`} />
        <canvas ref={canvasRef} className={`absolute top-0 left-0 ${videoSize}`} />
        <button
          onClick={onToggleDots}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
          Dots
          <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${showDots ? "bg-emerald-500" : "bg-white/15"}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${showDots ? "left-[14px]" : "left-0.5"}`} />
          </div>
        </button>
      </div>

    </div>
  )
}
