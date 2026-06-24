import React, { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw } from "lucide-react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  const startCamera = async (deviceId = null, currentFacing = null) => {
    // Clear error immediately so the video element is mounted in DOM
    setError("");

    // Stop any existing stream tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: { ideal: currentFacing || facingMode } }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn("Video play failed:", e));
      }
      
      // Enumerate devices once we have permission
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === "videoinput");
        setDevices(videoDevices);
      } catch (e) {
        console.warn("Could not list video devices:", e);
      }
      
      // Track active device ID
      const activeTrack = mediaStream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          setActiveDeviceId(settings.deviceId);
        }
      }
      setError("");
    } catch (err) {
      console.error("Camera capture initialization error:", err);
      setError("Camera access denied or unavailable. Please check permissions.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const switchCamera = () => {
    if (devices.length < 2) {
      // Toggle facingMode if we can't find multiple devices (or on some mobile browsers)
      const nextFacing = facingMode === "environment" ? "user" : "environment";
      setFacingMode(nextFacing);
      startCamera(null, nextFacing);
      return;
    }

    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    setActiveDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      
      // Stop stream before closing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }, "image/jpeg", 0.95);
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-bg-secondary border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-950/40 bg-black/40 gap-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider text-sm uppercase shrink-0">
            <Camera className="h-5 w-5" />
            Scanner Camera
          </div>
          
          {/* Camera Selection Dropdown */}
          {devices.length > 0 && (
            <div className="flex-1 flex justify-center max-w-[420px] mx-auto">
              <select
                value={activeDeviceId}
                onChange={(e) => {
                  const devId = e.target.value;
                  setActiveDeviceId(devId);
                  startCamera(devId);
                }}
                className="camera-select w-full border-2 text-sm font-extrabold rounded-2xl px-5 py-3 focus:outline-none focus:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer text-center uppercase tracking-widest outline-none"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId} className="bg-slate-950 text-slate-200 font-sans normal-case text-xs">
                    📷 {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-white transition-colors shrink-0">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-red-400 p-6 text-center text-sm font-mono flex flex-col items-center gap-3">
              <X className="h-10 w-10 text-red-500" />
              {error}
              <button 
                onClick={() => startCamera(activeDeviceId || null)}
                className="mt-2 px-4 py-2 border border-red-500/30 text-red-300 rounded hover:bg-red-500/10 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-contain"
            />
          )}
          
          {/* Viewfinder Overlay */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500/50 rounded-3xl">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/60 flex justify-center items-center gap-6 border-t border-emerald-950/40">
          {/* Switch Camera Button */}
          {(devices.length > 1 || /Android|iPhone|iPad/i.test(navigator.userAgent)) && (
            <button
              onClick={switchCamera}
              className="px-4 py-2 border border-emerald-500/20 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Flip Camera
            </button>
          )}

          {/* Shutter Capture Button */}
          <button 
            onClick={handleCapture}
            disabled={!!error || !stream}
            className="btn-emerald text-sm py-3 px-6 flex items-center gap-2 rounded-xl active:scale-95 transition-transform"
          >
            <Camera className="h-5 w-5" />
            TAKE PICTURE
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
