import React, { useState, useEffect, useRef } from "react";
import CameraCapture from "./components/CameraCapture";
import {
  Camera,
  Sprout,
  Droplet,
  History,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Database,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Microscope
} from "lucide-react";

import ThreeInspector from "./components/ThreeInspector";
import ThreeLeafModel from "./components/ThreeLeafModel";
import { translations } from "./translations";
import { authService, dbService } from "./firebase";

// API Endpoint (point to local FastAPI server)
const API_URL = "http://localhost:8000";

const cropsAvailable = [
  { id: "apple", name: "Apple" },
  { id: "cherry", name: "Cherry" },
  { id: "corn", name: "Corn (Maize)" },
  { id: "grape", name: "Grape" },
  { id: "potato", name: "Potato" },
  { id: "peach", name: "Peach" },
  { id: "pepper", name: "Pepper (Bell)" },
  { id: "strawberry", name: "Strawberry" },
  { id: "tomato", name: "Tomato" }
];

const soilTypes = ["Black", "Clayey", "Loamy", "Red", "Sandy"];
const cropTypes = ["Barley", "Cotton", "Ground Nuts", "Maize", "Millets", "Oil seeds", "Paddy", "Pulses", "Sugarcane", "Tobacco", "Wheat"];

export default function App() {
  const [activeTab, setActiveTab] = useState("landing");
  const [lang, setLang] = useState("en");
  const [modalWarning, setModalWarning] = useState(null);

  // Scanner state
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [view3D, setView3D] = useState(false);
  const [scanError, setScanError] = useState("");

  // Crop Recommendation state
  const [cropInputs, setCropInputs] = useState({ n: 50, p: 50, k: 50, temp: 25, hum: 70, ph: 6.5, rain: 100 });
  const [cropRecommendResult, setCropRecommendResult] = useState(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState("");

  // Fertilizer Recommendation state
  const [fertInputs, setFertInputs] = useState({ n: 40, p: 40, k: 40, temp: 25, hum: 60, moist: 35, soil: "Loamy", crop: "Wheat" });
  const [fertRecommendResult, setFertRecommendResult] = useState(null);
  const [fertLoading, setFertLoading] = useState(false);
  const [fertError, setFertError] = useState("");

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncError, setSyncError] = useState("");

  // Settings state
  const [firebaseConfigText, setFirebaseConfigText] = useState("");
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState(false);

  const t = translations[lang];

  // Settings init
  useEffect(() => {
    const savedConfig = localStorage.getItem("firebase_config");
    if (savedConfig) {
      setFirebaseConfigText(JSON.stringify(JSON.parse(savedConfig), null, 2));
    }
  }, []);

  // Fetch scan history when tab changes
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setSyncError("");
    try {
      const scans = await dbService.getScans("guest");
      setHistoryList(scans);
      const dbErr = dbService.getLastError?.();
      if (dbErr) {
        setSyncError(dbErr.message || "Firebase sync failed.");
      }
    } catch (e) {
      console.error(e);
      setSyncError(e.message || "Failed to load scans.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setScanResult(null);
    setView3D(false);
    setScanError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleImageUpload(file);
  };

  const triggerScan = async (fileOverride = null) => {
    // If fileOverride is a React Event object, ignore it and fall back to imageFile
    const fileToScan = (fileOverride instanceof File || fileOverride instanceof Blob)
      ? fileOverride
      : imageFile;
    if (!fileToScan) return;

    const startTime = Date.now();

    setIsScanning(true);
    setScanError("");
    setScanProgress("Uploading file & initializing models...");

    const formData = new FormData();
    formData.append("file", fileToScan);
    formData.append("crop", selectedCrop);

    // Dynamic scanning status stages
    const steps = [
      "Uploading leaf image data...",
      "Isolating leaf contours using OpenCV...",
      "Analyzing disease spot ratios in HSV space...",
      "Running CNN model classification...",
      "Finalizing diagnostic recommendations..."
    ];

    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setScanProgress(steps[stepIdx]);
        stepIdx++;
      }
    }, 400);

    try {
      const res = await fetch(`${API_URL}/api/predict/disease`, {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        let errMsg = "Inference failed";
        try {
          const errDetail = await res.json();
          if (errDetail && errDetail.detail) {
            errMsg = typeof errDetail.detail === "string"
              ? errDetail.detail
              : JSON.stringify(errDetail.detail);
          } else if (errDetail && errDetail.message) {
            errMsg = errDetail.message;
          } else {
            errMsg = JSON.stringify(errDetail);
          }
        } catch (_) {
          try {
            errMsg = await res.text();
          } catch (_) { }
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      const timeTakenSec = ((Date.now() - startTime) / 1000).toFixed(2) + "s";

      // Delay slightly for premium scanning visual effect
      setScanProgress("Synthesizing 3D scan overlay...");
      await new Promise(r => setTimeout(r, 500));

      setScanResult(data);
      setIsScanning(false);

      setScanProgress("Saving scan to history...");
      try {
        dbService.clearLastError?.();

        // Step 1: Create a tiny thumbnail IMMEDIATELY (never hangs, max 3s timeout)
        const thumbnailUrl = await dbService.createThumbnail(fileToScan);

        // Step 2: Save to localStorage RIGHT NOW with thumbnail (this is the critical path)
        await dbService.saveScan("guest", {
          crop: selectedCrop,
          diseaseName: data.disease_name,
          className: data.class_name,
          confidence: data.confidence,
          isHealthy: data.is_healthy,
          imageUrl: thumbnailUrl, // Use tiny thumbnail, safe for localStorage
          thumbnailUrl: thumbnailUrl,
          spots: data.spots,
          fatalityLevel: data.fatality_level,
          timeTaken: timeTakenSec,
          treatment: data.treatment
        });

        // Step 3: Try Firebase Storage upload as a BONUS (non-blocking)
        // Don't await this — let it happen in the background
        dbService.uploadImage(fileToScan).then(firebaseUrl => {
          if (firebaseUrl) {
            console.log("✅ Firebase Storage upload succeeded:", firebaseUrl);
            // Update the localStorage entry with the real Firebase URL
            try {
              const scans = JSON.parse(localStorage.getItem("crop_scans_history") || "[]");
              if (scans.length > 0 && scans[0].crop === selectedCrop) {
                scans[0].imageUrl = firebaseUrl;
                localStorage.setItem("crop_scans_history", JSON.stringify(scans));
              }
            } catch (e) { /* ignore */ }
          }
        }).catch(err => {
          console.warn("Firebase Storage upload failed (non-blocking):", err);
        });

        const dbErr = dbService.getLastError?.();
        if (dbErr) {
          setSyncError(dbErr.message || "Firestore save failed (localStorage backup succeeded).");
        } else {
          setSyncError("");
        }

        // Refresh the history list
        await fetchHistory();
      } catch (historyErr) {
        console.error("Failed to save scan history:", historyErr);
      }

    } catch (e) {
      clearInterval(progressInterval);
      setScanError(e.message || "Could not connect to backend server. Make sure the FastAPI backend is running.");
      setModalWarning({
        title: "Validation Warning",
        message: e.message || "Please upload or capture a clear photo of a crop leaf."
      });
    } finally {
      setIsScanning(false);
    }
  };

  // ML Crop Recommendation Handler
  const handleCropRecommend = async () => {
    setCropLoading(true);
    setCropError("");
    setCropRecommendResult(null);

    try {
      const res = await fetch(`${API_URL}/api/predict/crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n: parseFloat(cropInputs.n),
          p: parseFloat(cropInputs.p),
          k: parseFloat(cropInputs.k),
          temperature: parseFloat(cropInputs.temp),
          humidity: parseFloat(cropInputs.hum),
          ph: parseFloat(cropInputs.ph),
          rainfall: parseFloat(cropInputs.rain)
        })
      });

      if (!res.ok) {
        const errDetail = await res.json();
        throw new Error(errDetail.detail || "Recommendation failed");
      }

      const data = await res.json();
      setCropRecommendResult(data);
    } catch (e) {
      setCropError(e.message || "Failed to fetch recommendation.");
    } finally {
      setCropLoading(false);
    }
  };

  // ML Fertilizer Recommendation Handler
  const handleFertRecommend = async () => {
    setFertLoading(true);
    setFertError("");
    setFertRecommendResult(null);

    try {
      const res = await fetch(`${API_URL}/api/predict/fertilizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          n: parseFloat(fertInputs.n),
          p: parseFloat(fertInputs.p),
          k: parseFloat(fertInputs.k),
          temperature: parseFloat(fertInputs.temp),
          humidity: parseFloat(fertInputs.hum),
          moisture: parseFloat(fertInputs.moist),
          soil_type: fertInputs.soil,
          crop_type: fertInputs.crop
        })
      });

      if (!res.ok) {
        const errDetail = await res.json();
        throw new Error(errDetail.detail || "Recommendation failed");
      }

      const data = await res.json();
      setFertRecommendResult(data);
    } catch (e) {
      setFertError(e.message || "Failed to fetch recommendation.");
    } finally {
      setFertLoading(false);
    }
  };

  // Save Settings Config Handler
  const handleSaveConfig = () => {
    setConfigError("");
    setConfigSuccess(false);
    try {
      authService.saveFirebaseConfig(firebaseConfigText);
      setConfigSuccess(true);
    } catch (e) {
      setConfigError(e.message);
    }
  };

  const handleClearConfig = () => {
    authService.clearFirebaseConfig();
    setFirebaseConfigText("");
  };

  return (
    <div className="dashboard-layout min-h-screen text-slate-100 bg-transparent">

      {/* Camera Modal */}
      {isCameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            setIsCameraOpen(false);
            handleImageUpload(file);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* ── Colorful animated background ── */}
      <div className="orb-container" aria-hidden="true">
        <div className="orb" />
      </div>
      <div className="leaves-canvas" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="leaf" />
        ))}
      </div>
      <div className="fireflies-container" aria-hidden="true">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="firefly" style={{
            '--left': `${Math.random() * 100}%`,
            '--top': `${Math.random() * 100}%`,
            '--size': `${Math.random() * 4 + 3}px`,
            '--delay': `${Math.random() * 10}s`,
            '--dur': `${Math.random() * 15 + 10}s`,
            '--drift': `${Math.random() * 100 - 50}px`
          }} />
        ))}
      </div>

      {/* ── LANDING PAGE ── */}
      {activeTab === "landing" ? (
        <div className="landing-page">
          <div className="landing-hero">
            <div className="landing-logo-large">
              <Sprout />
            </div>
            <h1 className="landing-title">
              <span className="accent">AgriShield</span><br />
              <span style={{ marginTop: 100, display: 'inline-block' }}>3D Crop Disease Detection</span>
            </h1>
            <p className="landing-subtitle">
              Harness cutting-edge CNN deep learning and interactive 3D visualization to instantly diagnose crop diseases, get treatment recommendations, and protect your harvest.
            </p>
            <div className="landing-features">
              <div className="landing-feature-card">
                <Microscope />
                <h3>AI Disease Scanner</h3>
                <p>Upload or capture a leaf photo for instant CNN-powered diagnosis with 3D lesion mapping</p>
              </div>
              <div className="landing-feature-card">
                <Sprout />
                <h3>Crop & Soil Advisor</h3>
                <p>ML-driven crop recommendations based on your soil NPK levels and climate conditions</p>
              </div>
              <div className="landing-feature-card">
                <Droplet />
                <h3>Fertilizer Engine</h3>
                <p>Precision fertilizer recommendations with deficiency analysis and correction plans</p>
              </div>
            </div>
            <div className="landing-cta">
              <button className="btn-landing-primary" onClick={() => setActiveTab("scan")}>
                Launch Scanner
                <ArrowRight style={{ width: 20, height: 20 }} />
              </button>
              <button className="btn-landing-secondary" onClick={() => setActiveTab("history")}>
                <History style={{ width: 18, height: 18 }} />
                View History
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── TOP NAVIGATION BAR ── */}
          <nav className="top-navbar">
            {/* Logo */}
            <div className="top-navbar-logo" onClick={() => setActiveTab("landing")}>
              <div className="logo-icon">
              <img src="/favicon.svg" alt="AgriShield" style={{ width: 22, height: 22 }} />
              </div>
              <div className="logo-text">
                <h1>AgriShield</h1>
                <span>3D Detect</span>
              </div>
            </div>

            {/* Horizontal Nav Tabs */}
            <div className="top-nav-tabs">
              <button
                onClick={() => setActiveTab("scan")}
                className={`top-nav-tab ${activeTab === "scan" ? "top-nav-tab-active" : ""}`}
              >
                <Camera />
                {t.scanNav}
              </button>
              <button
                onClick={() => setActiveTab("crop")}
                className={`top-nav-tab ${activeTab === "crop" ? "top-nav-tab-active" : ""}`}
              >
                <Sprout />
                {t.recommendNav}
              </button>
              <button
                onClick={() => setActiveTab("fertilizer")}
                className={`top-nav-tab ${activeTab === "fertilizer" ? "top-nav-tab-active" : ""}`}
              >
                <Droplet />
                {t.fertilizerNav}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`top-nav-tab ${activeTab === "history" ? "top-nav-tab-active" : ""}`}
              >
                <History />
                {t.historyNav}
              </button>
            </div>

            {/* Right Area: Status + Language */}
            <div className="top-navbar-right">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                <span className="truncate">
                  {authService.isEnabled() ? t.connected : t.disconnected}
                </span>
                {authService.isEnabled() && (
                  <span className="text-[10px] text-emerald-400/80 font-mono truncate" style={{ marginLeft: 4 }}>
                    {dbService.getConfigDetails?.()?.projectId || ""}
                  </span>
                )}
              </div>

              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-bg-tertiary border border-emerald-950/20 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="es">ES</option>
                <option value="pa">PA</option>
                <option value="te">TE</option>
              </select>
            </div>
          </nav>

          {/* MOBILE HEADER (hidden on desktop, shown on mobile where top-nav-tabs are hidden) */}
          <div className="mobile-bottom-nav md:hidden" style={{ position: 'fixed', bottom: 0 }}>
            <button onClick={() => setActiveTab("scan")} className={`mobile-nav-link ${activeTab === "scan" ? "mobile-nav-link-active" : ""}`}>
              <Camera /><span>{t.scanNav}</span>
            </button>
            <button onClick={() => setActiveTab("crop")} className={`mobile-nav-link ${activeTab === "crop" ? "mobile-nav-link-active" : ""}`}>
              <Sprout /><span>{t.recommendNav}</span>
            </button>
            <button onClick={() => setActiveTab("fertilizer")} className={`mobile-nav-link ${activeTab === "fertilizer" ? "mobile-nav-link-active" : ""}`}>
              <Droplet /><span>{t.fertilizerNav}</span>
            </button>
            <button onClick={() => setActiveTab("history")} className={`mobile-nav-link ${activeTab === "history" ? "mobile-nav-link-active" : ""}`}>
              <History /><span>{t.historyNav}</span>
            </button>
          </div>

          {/* MAIN VIEW CONTENT */}
          <main className="px-10 py-12 overflow-y-auto max-md:px-5 max-md:py-8" style={{ flex: 1 }}>

            {activeTab === "scan" && (
              <div className="fade-in-slide max-w-6xl mx-auto">
                <header className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t.title}</h2>
                  <p className="text-slate-400">{t.subtitle}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Upload / Image preview */}
                  <div className="glass-panel p-6 flex flex-col gap-6">
                    <div>
                      <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">{t.selectCrop}</label>
                      <select
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="w-full glass-input"
                      >
                        {cropsAvailable.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Upload drag & drop zone */}
                    <div className="relative">
                      {imagePreview ? (
                        <div className="scanner-container rounded-xl border border-emerald-500/20 overflow-hidden bg-black/60 shadow-lg">
                          {isScanning && <div className="laser-line"></div>}
                          <img
                            src={imagePreview}
                            alt="Leaf preview"
                            className="w-full h-[320px] object-contain mx-auto block"
                          />

                          {/* Action Overlays */}
                          {!isScanning && (
                            <div className="absolute top-3 right-3 flex gap-2">
                              <button
                                onClick={() => { setImageFile(null); setImagePreview(null); setScanResult(null); setView3D(false); }}
                                className="bg-black/60 hover:bg-black/90 border border-slate-700 p-2 rounded-full transition-colors"
                                title="Remove image"
                              >
                                <RotateCcw className="h-4 w-4 text-slate-300" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 items-stretch">
                          {/* File Upload Button */}
                          <label className="rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[320px] upload-box-dashed group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Upload className="h-11 w-11 text-emerald-500/50 mb-4 group-hover:text-emerald-400 transition-colors duration-300" />
                            <span className="text-base font-semibold text-slate-300 mb-1 text-center group-hover:text-white transition-colors">{t.uploadDragDrop}</span>
                            <span className="text-xs text-slate-500 text-center">{t.supportedFormats}</span>
                          </label>

                          {/* Camera Capture Button */}
                          <button
                            title="Take a photo with your camera"
                            onClick={() => setIsCameraOpen(true)}
                            className="rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 upload-box-dashed gap-5 group"
                          >
                            <Camera
                              className="text-emerald-500/50 group-hover:text-emerald-400 group-hover:scale-110 transform transition-all duration-300"
                              style={{ width: "72px", height: "72px" }}
                            />
                            <span className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wider">
                              Cam
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Scan button */}
                    {imageFile && !scanResult && (
                      <button
                        onClick={triggerScan}
                        disabled={isScanning}
                        className="btn-emerald w-full"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-1" />
                            {scanProgress}
                          </>
                        ) : (
                          <>
                            <Camera className="h-5 w-5 mr-1" />
                            Scan Leaf
                          </>
                        )}
                      </button>
                    )}

                    {scanError && (
                      <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{scanError}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: 3D view or prediction details */}
                  <div className="flex flex-col gap-6">
                    {scanResult ? (
                      <>
                        {/* Diagnostic Summary Header Card */}
                        <div className="glass-panel p-6 border-l-4 border-l-red-500 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block mb-1">
                                {t.scanResult} - {scanResult.crop}
                              </span>
                              <h3 className="text-xl font-extrabold text-white tracking-tight glow-text">
                                {scanResult.disease_name}
                              </h3>
                            </div>

                            {/* Glowing Health Dot Indicator */}
                            <div className="flex items-center gap-2 bg-black/40 border border-emerald-950/20 px-3 py-1.5 rounded-full text-xs font-mono">
                              <span className={scanResult.is_healthy ? "pulse-dot-green" : "pulse-dot-red"}></span>
                              <span className={scanResult.is_healthy ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {scanResult.is_healthy ? t.healthy : t.diseased}
                              </span>
                            </div>
                          </div>

                          {/* Confidence Score Bar */}
                          <div>
                            <div className="flex justify-between text-xs font-mono mb-1.5">
                              <span className="text-slate-400">{t.confidence}</span>
                              <span className="text-emerald-400 font-bold">{Math.round(scanResult.confidence * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-emerald-950/10">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full transition-all duration-500"
                                style={{ width: `${scanResult.confidence * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* 3D toggle */}
                          {!scanResult.is_healthy && (
                            <div className="flex items-center justify-between pt-2 border-t border-emerald-950/10">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                                {t.inspect3D}
                              </span>

                              <div
                                onClick={() => setView3D(prev => !prev)}
                                className="switch-container"
                              >
                                <div className={`switch-track ${view3D ? "switch-track-active" : ""}`}>
                                  <div className={`switch-thumb ${view3D ? "switch-thumb-active" : ""}`} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Detailed Diagnostic Panel */}
                        {view3D && !scanResult.is_healthy ? (
                          <div className="glass-panel p-2">
                            <ThreeInspector imageUrl={imagePreview} spots={scanResult.spots} lang={lang} />
                          </div>
                        ) : (
                          <div className="glass-panel p-6 flex flex-col gap-4 text-xs font-mono divide-y divide-emerald-950/10">
                            {scanResult.is_healthy ? (
                              <div className="flex items-start gap-3 text-slate-300 py-3 leading-relaxed">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold text-white text-sm mb-1">Leaf is Healthy!</div>
                                  Your plant displays optimal green levels. No leaf lesions, chlorosis, or necrotic structures detected. Continue routine care.
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col gap-1 py-3">
                                  <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">{t.cause}</span>
                                  <p className="text-slate-300 leading-relaxed font-sans mt-1 text-sm">{scanResult.treatment.cause}</p>
                                </div>
                                <div className="flex flex-col gap-1 py-3">
                                  <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">{t.symptoms}</span>
                                  <p className="text-slate-300 leading-relaxed font-sans mt-1 text-sm">{scanResult.treatment.symptoms}</p>
                                </div>
                                <div className="flex flex-col gap-1 py-3">
                                  <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">{t.organicTreatment}</span>
                                  <p className="text-slate-300 leading-relaxed font-sans mt-1 text-sm">{scanResult.treatment.organic}</p>
                                </div>
                                <div className="flex flex-col gap-1 py-3">
                                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t.chemicalTreatment}</span>
                                  <p className="text-slate-300 leading-relaxed font-sans mt-1 text-sm">{scanResult.treatment.chemical}</p>
                                </div>
                                <div className="flex flex-col gap-1 py-3">
                                  <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">{t.prevention}</span>
                                  <p className="text-slate-300 leading-relaxed font-sans mt-1 text-sm">{scanResult.treatment.prevention}</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-4 w-full">
                        <ThreeLeafModel />
                        <div className="glass-panel p-6 text-center text-slate-400 bg-bg-secondary/20">
                          <p className="text-sm font-semibold mb-1 text-slate-200">3D Diagnostic Scanner Console</p>
                          <p className="text-xs max-w-xs mx-auto text-slate-500 font-sans">Select a crop type, drag & drop a leaf image, and click scan to initialize deep diagnosis model mapping.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "crop" && (
              <div className="fade-in-slide max-w-5xl mx-auto">
                <header className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t.recommendNav}</h2>
                  <p className="text-slate-400">{t.recommenderHeader}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Sliders Form */}
                  <div className="glass-panel p-6 flex flex-col gap-5">
                    {/* Nitrogen */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.nitrogen}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.n} kg/ha</span>
                      </div>
                      <input
                        type="range" min="0" max="140"
                        value={cropInputs.n}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, n: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Phosphorus */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.phosphorus}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.p} kg/ha</span>
                      </div>
                      <input
                        type="range" min="5" max="145"
                        value={cropInputs.p}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, p: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Potassium */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.potassium}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.k} kg/ha</span>
                      </div>
                      <input
                        type="range" min="5" max="205"
                        value={cropInputs.k}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, k: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* pH */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.soilPh}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.ph}</span>
                      </div>
                      <input
                        type="range" min="3.5" max="10" step="0.1"
                        value={cropInputs.ph}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, ph: parseFloat(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.temperature}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.temp} °C</span>
                      </div>
                      <input
                        type="range" min="10" max="45"
                        value={cropInputs.temp}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, temp: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Humidity */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.humidity}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.hum} %</span>
                      </div>
                      <input
                        type="range" min="15" max="100"
                        value={cropInputs.hum}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, hum: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Rainfall */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.rainfall}</span>
                        <span className="text-emerald-400 font-bold">{cropInputs.rain} mm</span>
                      </div>
                      <input
                        type="range" min="20" max="300"
                        value={cropInputs.rain}
                        onChange={(e) => setCropInputs(prev => ({ ...prev, rain: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <button
                      onClick={handleCropRecommend}
                      disabled={cropLoading}
                      className="btn-emerald w-full mt-3"
                    >
                      {cropLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-1" />
                          Computing optimal crop...
                        </>
                      ) : (
                        <>
                          <Sprout className="h-5 w-5 mr-1" />
                          {t.recommendBtn}
                        </>
                      )}
                    </button>

                    {cropError && (
                      <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{cropError}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Recommendation Results */}
                  <div className="flex flex-col gap-6">
                    {cropRecommendResult ? (
                      <div className="glass-panel p-6 border-l-4 border-l-emerald-500 flex flex-col gap-6">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block mb-1">
                            {t.cropResult}
                          </span>
                          <h3 className="text-3xl font-extrabold text-white tracking-tight glow-text flex items-center gap-2">
                            <Sprout className="h-8 w-8 text-emerald-400" />
                            {cropRecommendResult.recommended_crop}
                          </h3>
                        </div>

                        {/* NPK Comparison Grid */}
                        {cropRecommendResult.ideals && (
                          <div className="border-t border-slate-800/40 pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">NPK Soil vs. Crop Ideal Range</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {/* Nitrogen */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-orange-400 block uppercase tracking-wider mb-1">Nitrogen (N)</span>
                                  <span className="text-xs text-slate-400 block">Current: {cropInputs.n}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Ideal: {cropRecommendResult.ideals.N}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${cropRecommendResult.deficiencies.n > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {cropRecommendResult.deficiencies.n > 0 ? `Deficit: ${cropRecommendResult.deficiencies.n}` : "Optimal"}
                                  </span>
                                </div>
                              </div>

                              {/* Phosphorus */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-yellow-400 block uppercase tracking-wider mb-1">Phosphorus (P)</span>
                                  <span className="text-xs text-slate-400 block">Current: {cropInputs.p}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Ideal: {cropRecommendResult.ideals.P}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${cropRecommendResult.deficiencies.p > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {cropRecommendResult.deficiencies.p > 0 ? `Deficit: ${cropRecommendResult.deficiencies.p}` : "Optimal"}
                                  </span>
                                </div>
                              </div>

                              {/* Potassium */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-pink-400 block uppercase tracking-wider mb-1">Potassium (K)</span>
                                  <span className="text-xs text-slate-400 block">Current: {cropInputs.k}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Ideal: {cropRecommendResult.ideals.K}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${cropRecommendResult.deficiencies.k > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {cropRecommendResult.deficiencies.k > 0 ? `Deficit: ${cropRecommendResult.deficiencies.k}` : "Optimal"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Deficiencies Soil Correction Plan */}
                        {cropRecommendResult.deficiencies && (cropRecommendResult.deficiencies.n > 0 || cropRecommendResult.deficiencies.p > 0 || cropRecommendResult.deficiencies.k > 0) && (
                          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
                            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              Agronomic Soil Correction Plan
                            </h4>
                            <ul className="text-xs text-slate-300 list-disc list-inside flex flex-col gap-1.5 mt-1 font-sans">
                              {cropRecommendResult.deficiencies.n > 0 && (
                                <li>Apply <strong className="text-orange-300">Urea</strong> or <strong className="text-orange-300">Ammonium Sulfate</strong> to supply the required {cropRecommendResult.deficiencies.n} kg/ha of Nitrogen.</li>
                              )}
                              {cropRecommendResult.deficiencies.p > 0 && (
                                <li>Apply <strong className="text-yellow-300">DAP</strong> or <strong className="text-yellow-300">Single Super Phosphate (SSP)</strong> to supply the required {cropRecommendResult.deficiencies.p} kg/ha of Phosphorus.</li>
                              )}
                              {cropRecommendResult.deficiencies.k > 0 && (
                                <li>Apply <strong className="text-pink-300">Muriate of Potash (MOP)</strong> or a high-potash NPK complex to supply the required {cropRecommendResult.deficiencies.k} kg/ha of Potassium.</li>
                              )}
                            </ul>
                          </div>
                        )}

                        <div className="border-t border-slate-800/40 pt-4">
                          <p className="text-slate-300 leading-relaxed text-sm font-sans">
                            {cropRecommendResult.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-8 min-h-[300px] flex flex-col items-center justify-center text-center text-slate-500 bg-bg-secondary/20">
                        <Info className="h-8 w-8 text-emerald-500/20 mb-3" />
                        <p className="text-sm font-semibold mb-1 text-slate-400">Crop Advice Terminal</p>
                        <p className="text-xs max-w-xs text-slate-500">Provide soil indices and climatic values to identify the optimal crop for yield maximization.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* FERTILIZER ADVISOR PANEL */}
            {activeTab === "fertilizer" && (
              <div className="fade-in-slide max-w-5xl mx-auto">
                <header className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t.fertilizerNav}</h2>
                  <p className="text-slate-400">{t.fertHeader}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Form */}
                  <div className="glass-panel p-6 flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Soil Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.soilType}</label>
                        <select
                          value={fertInputs.soil}
                          onChange={(e) => setFertInputs(prev => ({ ...prev, soil: e.target.value }))}
                          className="glass-input text-xs"
                        >
                          {soilTypes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Crop Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.cropType}</label>
                        <select
                          value={fertInputs.crop}
                          onChange={(e) => setFertInputs(prev => ({ ...prev, crop: e.target.value }))}
                          className="glass-input text-xs"
                        >
                          {cropTypes.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* N */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">N (kg/ha)</label>
                        <input
                          type="number"
                          value={fertInputs.n}
                          onChange={(e) => setFertInputs(prev => ({ ...prev, n: parseInt(e.target.value) || 0 }))}
                          className="w-full glass-input text-xs"
                        />
                      </div>
                      {/* P */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">P (kg/ha)</label>
                        <input
                          type="number"
                          value={fertInputs.p}
                          onChange={(e) => setFertInputs(prev => ({ ...prev, p: parseInt(e.target.value) || 0 }))}
                          className="w-full glass-input text-xs"
                        />
                      </div>
                      {/* K */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">K (kg/ha)</label>
                        <input
                          type="number"
                          value={fertInputs.k}
                          onChange={(e) => setFertInputs(prev => ({ ...prev, k: parseInt(e.target.value) || 0 }))}
                          className="w-full glass-input text-xs"
                        />
                      </div>
                    </div>

                    {/* Moisture */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.moisture}</span>
                        <span className="text-emerald-400 font-bold">{fertInputs.moist} %</span>
                      </div>
                      <input
                        type="range" min="10" max="80"
                        value={fertInputs.moist}
                        onChange={(e) => setFertInputs(prev => ({ ...prev, moist: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.temperature}</span>
                        <span className="text-emerald-400 font-bold">{fertInputs.temp} °C</span>
                      </div>
                      <input
                        type="range" min="10" max="45"
                        value={fertInputs.temp}
                        onChange={(e) => setFertInputs(prev => ({ ...prev, temp: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    {/* Humidity */}
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400">{t.humidity}</span>
                        <span className="text-emerald-400 font-bold">{fertInputs.hum} %</span>
                      </div>
                      <input
                        type="range" min="15" max="100"
                        value={fertInputs.hum}
                        onChange={(e) => setFertInputs(prev => ({ ...prev, hum: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>

                    <button
                      onClick={handleFertRecommend}
                      disabled={fertLoading}
                      className="btn-emerald w-full mt-3"
                    >
                      {fertLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-1" />
                          Computing fertilizer requirement...
                        </>
                      ) : (
                        <>
                          <Droplet className="h-5 w-5 mr-1" />
                          {t.recommendBtn}
                        </>
                      )}
                    </button>

                    {fertError && (
                      <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{fertError}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Recommendation Results */}
                  <div className="flex flex-col gap-6">
                    {fertRecommendResult ? (
                      <div className="glass-panel p-6 border-l-4 border-l-emerald-500 flex flex-col gap-6">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block mb-1">
                            {t.fertResult}
                          </span>
                          <h3 className="text-3xl font-extrabold text-white tracking-tight glow-text flex items-center gap-2">
                            <Droplet className="h-8 w-8 text-emerald-400" />
                            {fertRecommendResult.recommended_fertilizer}
                          </h3>
                        </div>

                        {/* NPK Comparison Grid */}
                        {fertRecommendResult.ideals && (
                          <div className="border-t border-slate-800/40 pt-4 flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">NPK Requirements for {fertInputs.crop}</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {/* Nitrogen */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-orange-400 block uppercase tracking-wider mb-1">Nitrogen (N)</span>
                                  <span className="text-xs text-slate-400 block">Soil: {fertInputs.n}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Target: {fertRecommendResult.ideals.N}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${fertRecommendResult.deficiencies.n > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {fertRecommendResult.deficiencies.n > 0 ? `Deficit: ${fertRecommendResult.deficiencies.n}` : "Sufficient"}
                                  </span>
                                </div>
                              </div>

                              {/* Phosphorus */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-yellow-400 block uppercase tracking-wider mb-1">Phosphorus (P)</span>
                                  <span className="text-xs text-slate-400 block">Soil: {fertInputs.p}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Target: {fertRecommendResult.ideals.P}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${fertRecommendResult.deficiencies.p > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {fertRecommendResult.deficiencies.p > 0 ? `Deficit: ${fertRecommendResult.deficiencies.p}` : "Sufficient"}
                                  </span>
                                </div>
                              </div>

                              {/* Potassium */}
                              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] font-bold text-pink-400 block uppercase tracking-wider mb-1">Potassium (K)</span>
                                  <span className="text-xs text-slate-400 block">Soil: {fertInputs.k}</span>
                                  <span className="text-xs text-emerald-400 block font-bold">Target: {fertRecommendResult.ideals.K}</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${fertRecommendResult.deficiencies.k > 0 ? "bg-red-950/40 text-red-400 border border-red-500/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                    {fertRecommendResult.deficiencies.k > 0 ? `Deficit: ${fertRecommendResult.deficiencies.k}` : "Sufficient"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scientific Reanalysis Alert */}
                        {fertRecommendResult.scientific_analysis && (
                          <div className={`rounded-xl p-4 flex flex-col gap-2 border ${fertRecommendResult.is_consistent
                            ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-200"
                            : "bg-red-950/20 border-red-500/25 text-red-200"
                            }`}>
                            <h4 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${fertRecommendResult.is_consistent ? "text-emerald-400" : "text-red-400"
                              }`}>
                              {fertRecommendResult.is_consistent ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              ) : (
                                <ShieldAlert className="h-4 w-4 shrink-0 animate-pulse" />
                              )}
                              Agronomic Model Reanalysis
                            </h4>
                            <p className="text-xs leading-relaxed font-sans whitespace-pre-line mt-1 text-slate-300">
                              {fertRecommendResult.scientific_analysis}
                            </p>
                          </div>
                        )}

                        <div className="border-t border-slate-800/40 pt-4">
                          <p className="text-slate-300 leading-relaxed text-sm font-sans">
                            {fertRecommendResult.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-8 min-h-[300px] flex flex-col items-center justify-center text-center text-slate-500 bg-bg-secondary/20">
                        <Info className="h-8 w-8 text-emerald-500/20 mb-3" />
                        <p className="text-sm font-semibold mb-1 text-slate-400">Fertilizer Advice Terminal</p>
                        <p className="text-xs max-w-xs text-slate-500">Submit NPK concentration, soil hydration level, and target crop to retrieve specific chemical mixture advice.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCAN HISTORY PANEL */}
            {activeTab === "history" && (
              <div className="fade-in-slide max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t.historyHeader}</h2>
                    <p className="text-slate-400">
                      {authService.isEnabled()
                        ? "Synchronized with Firebase Cloud Firestore."
                        : "Storing scans locally in browser cache."}
                    </p>
                  </div>
                  <button
                    onClick={fetchHistory}
                    className="bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </header>

                {syncError && (
                  <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Firebase Synchronization Issue</span>
                      <span>{syncError} (Falling back to local storage). Please verify that Firestore is correctly initialized and read/write security rules are active in your console.</span>
                    </div>
                  </div>
                )}

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[250px] text-slate-500 font-mono text-xs">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                    Retrieving previous diagnosis list...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-slate-500 min-h-[250px] flex flex-col items-center justify-center">
                    <History className="h-10 w-10 text-emerald-500/20 mb-3" />
                    <p className="font-semibold text-sm mb-1 text-slate-400">{t.noHistory}</p>
                    <button
                      onClick={() => setActiveTab("scan")}
                      className="btn-emerald text-xs py-2 px-4 mt-3"
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      {t.diagnoseNew}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {historyList.map((scan) => (
                      <div key={scan.id} className="glass-panel p-5 flex gap-4 items-start relative hover:border-emerald-500/30 transition-all duration-300">
                        <div className="h-16 w-16 bg-black/40 rounded-lg overflow-hidden border border-emerald-950/20 flex-shrink-0 flex items-center justify-center">
                          {scan.imageUrl ? (
                            <img src={scan.imageUrl} alt="Leaf scan thumbnail" className="h-full w-full object-cover" />
                          ) : (
                            <Camera className="h-8 w-8 text-emerald-500/30" />
                          )}
                        </div>

                        <div className="flex-grow overflow-hidden">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest leading-none">
                              {scan.crop}
                            </span>
                            <span className="text-[8px] font-mono text-slate-500">
                              {scan.timestamp ? new Date(scan.timestamp).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <h4 className="text-md font-bold text-white tracking-tight mt-1 truncate">
                            {scan.diseaseName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${scan.isHealthy ? "bg-emerald-500" : "bg-red-500"}`}></span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                                {scan.isHealthy ? t.healthy : t.diseased} ({Math.round(scan.confidence * 100)}%)
                              </span>
                            </div>
                            {scan.fatalityLevel && (
                              <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase leading-none ${scan.fatalityLevel === "High" ? "bg-red-950/40 text-red-400 border border-red-500/20" :
                                scan.fatalityLevel === "Medium" ? "bg-amber-950/40 text-amber-400 border border-amber-500/20" :
                                  "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                {scan.fatalityLevel}
                              </span>
                            )}
                            {scan.timeTaken && (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900/50 text-slate-400 border border-slate-700/30 font-mono leading-none">
                                {scan.timeTaken}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Re-Inspect button */}
                        {!scan.isHealthy && (
                          <button
                            onClick={() => {
                              setSelectedCrop(scan.crop);
                              setImagePreview(scan.imageUrl);
                              setScanResult({
                                crop: scan.crop.toUpperCase(),
                                disease_name: scan.diseaseName,
                                class_name: scan.className,
                                confidence: scan.confidence,
                                is_healthy: scan.isHealthy,
                                spots: scan.spots || [],
                                treatment: scan.treatment || {}
                              });
                              setView3D(true);
                              setActiveTab("scan");
                            }}
                            className="absolute bottom-4 right-4 bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-500/20 rounded px-2.5 py-1 text-[8px] text-emerald-400 font-mono tracking-wider transition-colors"
                          >
                            {t.inspect3D}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Diagnostics Panel */}
                <div className="glass-panel p-6 flex flex-col gap-4 text-xs font-mono border-slate-800/40 mt-6">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-500" />
                    Cloud Connection Diagnostics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-800/40 pt-4">
                    <div>
                      <span className="text-slate-500 block">Firebase Active:</span>
                      <span className={dbService.isEnabled() ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {dbService.isEnabled() ? "YES" : "NO"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Config Source:</span>
                      <span className="text-slate-300 font-bold">
                        {dbService.getConfigDetails?.()?.source || "none"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Project ID (Vite Env):</span>
                      <span className="text-slate-300 font-bold">
                        {import.meta.env.VITE_FIREBASE_PROJECT_ID || "not loaded"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Project ID (Active Config):</span>
                      <span className="text-slate-300 font-bold">
                        {dbService.getConfigDetails?.()?.projectId || "none"}
                      </span>
                    </div>
                  </div>
                  {syncError && (
                    <div className="mt-2 border-t border-red-500/10 pt-3">
                      <span className="text-red-400 font-bold block mb-1">Last Database Sync Error:</span>
                      <span className="text-red-300 block bg-red-950/20 border border-red-500/20 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                        {syncError}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS PANEL */}
            {activeTab === "settings" && (
              <div className="fade-in-slide max-w-2xl mx-auto">
                <header className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t.settingsNav}</h2>
                  <p className="text-slate-400">Configure credentials and view developer information</p>
                </header>

                <div className="flex flex-col gap-6">
                  {/* Firebase config block */}
                  <div className="glass-panel p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Database className="h-5 w-5 text-emerald-500" />
                      {t.firebaseTitle}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      The application uses LocalStorage fallback by default. To connect your diagnoses history to your Firebase Cloud database, paste your Firebase config JSON below.
                    </p>

                    <textarea
                      value={firebaseConfigText}
                      onChange={(e) => setFirebaseConfigText(e.target.value)}
                      placeholder={t.firebasePlaceholder}
                      rows="7"
                      className="w-full glass-input text-xs font-mono"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveConfig}
                        className="btn-emerald text-xs py-2.5"
                      >
                        {t.saveConfig}
                      </button>
                      {localStorage.getItem("firebase_config") && (
                        <button
                          onClick={handleClearConfig}
                          className="btn-outline text-xs text-red-400 border-red-500/20 hover:bg-red-950/20 py-2.5"
                        >
                          Clear Config
                        </button>
                      )}
                    </div>

                    {configError && (
                      <div className="p-3.5 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                        <span>{configError}</span>
                      </div>
                    )}

                    {configSuccess && (
                      <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        <span>Config saved! Reloading application...</span>
                      </div>
                    )}
                  </div>

                  {/* Developer stats block */}
                  <div className="glass-panel p-6 flex flex-col gap-4 text-xs font-mono">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                      <Info className="h-5 w-5 text-emerald-500" />
                      System Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 border-t border-emerald-950/10 pt-4">
                      <div>
                        <span className="text-slate-500 block">FastAPI Server</span>
                        <span className="text-slate-300 font-bold">http://localhost:8000</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">3D Canvas Engine</span>
                        <span className="text-slate-300 font-bold">WebGL / Three.js</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Supported Crops</span>
                        <span className="text-slate-300 font-bold">9 species</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Supported Diseases</span>
                        <span className="text-slate-300 font-bold">34 classes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>

        </>
      )}

      {/* CUSTOM WARNING MODAL POPUP */}
      {modalWarning && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <div className="custom-modal-header">
              <AlertTriangle className="custom-modal-icon text-amber-400" />
              <h3 className="custom-modal-title">{modalWarning.title}</h3>
            </div>
            <div className="custom-modal-body">
              <p>{modalWarning.message}</p>
            </div>
            <div className="custom-modal-footer">
              <button
                onClick={() => setModalWarning(null)}
                className="custom-modal-btn"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
