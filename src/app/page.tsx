"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { 
  ArrowRight, Sparkles, Calendar, TrendingUp, Shield, Zap, 
  Brain, ChevronRight, Play, X, Menu, Activity, FileText, 
  CheckCircle2, Volume2, VolumeX, BarChart3, Users, Layers
} from "lucide-react";
import logo from "@/components/asset/logo.png";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // Redirect signed-in users immediately to their dashboard
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  // UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Nexo AI Interactive Demo States
  const [currentQuery, setCurrentQuery] = useState("");
  const [nexoReply, setNexoReply] = useState("");
  const [nexoLoading, setNexoLoading] = useState(false);

  // Tab Demo States
  const [activeTab, setActiveTab] = useState<"scheduling" | "billing" | "risks" | "nexo">("scheduling");

  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play / mute toggle logic for video preview
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = 0.4;
      videoRef.current.play().catch((err) => {
        console.warn("Video auto-play prevented:", err);
      });
    }
  }, [isMuted]);

  // Simulated Nexo AI queries
  const nexoQueries = {
    risks: {
      question: "Which projects have elevated delivery risk?",
      answer: "Analyzing portfolio telemetry...\n\n⚠️ Project Alpha (Execution Phase) has a 72% risk index due to 3 pending PMO approvals and key engineering resource constraints.\n⚠️ Project Orion (Planning Phase) is delayed by 8 days due to allocation overlaps."
    },
    utilization: {
      question: "Analyze team utilization bottlenecks.",
      answer: "Calculating team utilization metrics...\n\n📈 Frontend Engineering is over-allocated at 118% capacity. \n💼 3 senior developers are scheduled at >100% capacity. \n💡 Recommendation: Assign 2 pending tasks to developers currently on the Bench (0% allocated)."
    },
    revenue: {
      question: "Generate financial forecast summary.",
      answer: "Compiling financial analytics...\n\n💵 Estimated Q3 Revenue: $485,000 (based on active billing rates).\n📊 Average Portfolio Margin: 68.2% (Healthy).\n🔍 Unbilled hours: 142 hours ($10,650) ready to invoice."
    }
  };

  const handleNexoDemo = (key: keyof typeof nexoQueries) => {
    setNexoLoading(true);
    setCurrentQuery(nexoQueries[key].question);
    setNexoReply("");
    
    setTimeout(() => {
      setNexoLoading(false);
      setNexoReply(nexoQueries[key].answer);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-[#090A0C] text-stone-200 overflow-x-hidden font-sans selection:bg-[#C67C4E]/30 selection:text-white">
      {/* CSS Animation Overrides */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes slow-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.1); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-slow-pulse {
          animation: slow-pulse 8s ease-in-out infinite;
        }
        .glass-panel {
          background: rgba(17, 17, 19, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(198, 124, 78, 0.12);
        }
        .text-gradient-copper {
          background: linear-gradient(135deg, #FFF 30%, #D4A373 70%, #C67C4E 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(198,124,78,0.12)_0%,rgba(9,10,12,0)_70%)] blur-[100px]" />
        <div className="absolute top-[800px] -right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,163,115,0.08)_0%,rgba(9,10,12,0)_70%)] blur-[120px] animate-slow-pulse" />
        <div className="absolute bottom-20 -left-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(198,124,78,0.07)_0%,rgba(9,10,12,0)_70%)] blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <Image src={logo} className="h-10 w-auto object-contain" alt="NexusFlow Logo" />
          <span className="font-bold text-xl tracking-tight text-white font-sans">
            Nexus<span className="text-[#C67C4E]">Flow</span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-400">
          <a href="#features" className="hover:text-[#D4A373] transition-colors">Features</a>
          <a href="#modules" className="hover:text-[#D4A373] transition-colors">Modules</a>
          <a href="#nexo-demo" className="hover:text-[#D4A373] transition-colors">Nexo AI</a>
          <a href="#security" className="hover:text-[#D4A373] transition-colors">Security</a>
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-stone-300 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/login" 
            className="h-10 px-5 rounded-lg text-sm font-semibold flex items-center justify-center bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(198,124,78,0.2)]"
          >
            Get Started <ArrowRight className="size-4 ml-1.5" />
          </Link>
        </div>

        {/* Mobile Menu Icon */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="md:hidden p-2 text-stone-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#090A0C]/95 backdrop-blur-lg pt-24 px-6 md:hidden flex flex-col gap-6">
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-xl font-medium text-stone-300 hover:text-[#D4A373]"
          >
            Features
          </a>
          <a 
            href="#modules" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-xl font-medium text-stone-300 hover:text-[#D4A373]"
          >
            Modules
          </a>
          <a 
            href="#nexo-demo" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-xl font-medium text-stone-300 hover:text-[#D4A373]"
          >
            Nexo AI
          </a>
          <a 
            href="#security" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-xl font-medium text-stone-300 hover:text-[#D4A373]"
          >
            Security
          </a>
          <div className="h-px bg-white/5 my-4" />
          <Link 
            href="/login" 
            className="w-full h-12 rounded-xl flex items-center justify-center font-medium border border-white/10 text-white"
          >
            Sign In
          </Link>
          <Link 
            href="/login" 
            className="w-full h-12 rounded-xl flex items-center justify-center font-semibold bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white"
          >
            Get Started
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-20 text-center z-10">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C67C4E]/20 bg-[#C67C4E]/5 text-xs text-[#D4A373] font-medium tracking-wide mb-8 animate-pulse">
          <Sparkles className="size-3.5" />
          <span>Enterprise Project Lifecycle Management System</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-5xl mx-auto leading-[1.1]">
          The Operating System for <span className="text-gradient-copper">Project Delivery</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          NexusFlow connects projects, resource scheduling, utilization tracking, billing analytics, and approvals under a single unified dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <Link 
            href="/login" 
            className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold flex items-center justify-center bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white hover:shadow-[0_8px_24px_rgba(198,124,78,0.3)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          >
            Get Started Free <ArrowRight className="size-4 ml-2" />
          </Link>
          <button 
            onClick={() => setVideoModalOpen(true)}
            className="w-full sm:w-auto h-12 px-6 rounded-xl font-medium flex items-center justify-center border border-white/10 hover:border-[#C67C4E]/40 bg-white/[0.02] hover:bg-[#C67C4E]/5 text-stone-200 hover:text-white transition-all cursor-pointer"
          >
            <Play className="size-4 fill-current mr-2.5 text-[#D4A373]" />
            Watch Video Demo
          </button>
        </div>

        {/* Interactive Dashboard Mockup */}
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-float bg-[#0D0D10]/90">
          <div className="flex items-center justify-between px-6 h-12 border-b border-white/[0.08] bg-black/40">
            <div className="flex gap-2">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-widest">NEXUSFLOW_PORTFOLIO_DASHBOARD</span>
            <div className="w-12" />
          </div>

          <div className="relative aspect-[16/10] overflow-hidden">
            <video 
              ref={videoRef}
              autoPlay 
              loop 
              muted 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none"
            >
              <source src="/NexusFlow_Enterprise_Hero_Vide.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-[#090A0C] via-transparent to-transparent opacity-60" />

            {/* Video overlay control */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-6 right-6 z-20 p-2.5 rounded-lg bg-[#111113] border border-white/10 text-stone-400 hover:text-white active:scale-95 transition-all shadow-lg flex items-center gap-2 text-xs font-semibold cursor-pointer"
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              <span>{isMuted ? "Unmute Preview" : "Mute Preview"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.04] z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Operational Hub for Modern Teams
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto">
            Eliminate operational fragmentation. NexusFlow binds core functional capabilities into one single source of truth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature Card 1 */}
          <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 hover:border-[#C67C4E]/30 transition-all duration-300 group">
            <div className="size-12 rounded-xl flex items-center justify-center bg-[#C67C4E]/10 border border-[#C67C4E]/20 text-[#D4A373] mb-6 group-hover:scale-110 transition-transform">
              <Layers className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Project Lifecycle Management</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Track project progress systematically from Initiation, Planning, and Execution, through Monitoring and final project Closure.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 hover:border-[#C67C4E]/30 transition-all duration-300 group">
            <div className="size-12 rounded-xl flex items-center justify-center bg-[#C67C4E]/10 border border-[#C67C4E]/20 text-[#D4A373] mb-6 group-hover:scale-110 transition-transform">
              <Users className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Resource & Bench Scheduling</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Maintain an active skills matrix, schedule resources via a drag-and-drop calendar timeline, and optimize bench capacity.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 hover:border-[#C67C4E]/30 transition-all duration-300 group">
            <div className="size-12 rounded-xl flex items-center justify-center bg-[#C67C4E]/10 border border-[#C67C4E]/20 text-[#D4A373] mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Billing & Cost Optimization</h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              Establish individual resource billing rates, audit billable vs. non-billable timesheets, and generate automated client invoices.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Module Details Tab */}
      <section id="modules" className="relative max-w-7xl mx-auto px-6 py-12 z-10">
        <div className="glass-panel rounded-3xl overflow-hidden p-8 md:p-12">
          <div className="grid lg:grid-cols-5 gap-12 items-center">
            {/* Left Options switcher */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-3xl font-bold text-white mb-6">Built for Operational Excellence</h2>
              
              <button
                onClick={() => setActiveTab("scheduling")}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all border ${
                  activeTab === "scheduling" 
                    ? "bg-[#C67C4E]/10 border-[#C67C4E]/30 text-white" 
                    : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Calendar className="size-5 text-[#D4A373]" />
                <div>
                  <h4 className="font-semibold text-sm">Resource Scheduling</h4>
                  <p className="text-xs text-stone-500 mt-1">Calendar timelines and allocation matching.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("billing")}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all border ${
                  activeTab === "billing" 
                    ? "bg-[#C67C4E]/10 border-[#C67C4E]/30 text-white" 
                    : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <TrendingUp className="size-5 text-[#D4A373]" />
                <div>
                  <h4 className="font-semibold text-sm">Invoicing & Finance</h4>
                  <p className="text-xs text-stone-500 mt-1">Role-based billing rates and profitability forecast.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("risks")}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all border ${
                  activeTab === "risks" 
                    ? "bg-[#C67C4E]/10 border-[#C67C4E]/30 text-white" 
                    : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Shield className="size-5 text-[#D4A373]" />
                <div>
                  <h4 className="font-semibold text-sm">Risk Assessment Matrix</h4>
                  <p className="text-xs text-stone-500 mt-1">Heatmaps mapping probability against severity.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("nexo")}
                className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all border ${
                  activeTab === "nexo" 
                    ? "bg-[#C67C4E]/10 border-[#C67C4E]/30 text-white" 
                    : "bg-transparent border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Brain className="size-5 text-[#D4A373]" />
                <div>
                  <h4 className="font-semibold text-sm">Nexo AI Engine</h4>
                  <p className="text-xs text-stone-500 mt-1">Natural language queries for project compliance.</p>
                </div>
              </button>
            </div>

            {/* Right Display window */}
            <div className="lg:col-span-3 bg-black/40 rounded-2xl border border-white/5 p-6 aspect-[4/3] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C67C4E]/5 to-transparent pointer-events-none" />
              
              {activeTab === "scheduling" && (
                <div className="space-y-6 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Resource Timelines</span>
                    <h3 className="text-xl font-bold text-white mt-2">Conflict-Free Calendar Schedulers</h3>
                    <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                      Visualize team calendars. Our conflict resolution flags notify you if an employee is assigned to overlapping activities, helping you balance resource loads.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#111113]/80 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] uppercase text-stone-500 font-mono">
                      <span>Resource Name</span>
                      <span>Allocated Project</span>
                      <span>Workload Status</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-200">Sarah Jenkins</span>
                      <span className="text-stone-400">Mobile API Integration</span>
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">80% Load (Optimal)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-200">David Kim</span>
                      <span className="text-stone-400">Web Dashboard UI</span>
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono">120% Load (Conflict)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "billing" && (
                <div className="space-y-6 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Financial Ledger</span>
                    <h3 className="text-xl font-bold text-white mt-2">Rate-Based Invoice Generation</h3>
                    <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                      Convert billable project timesheets directly into commercial invoices. Track margins, hourly rate sheets, and department spend ratios.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                    <div className="bg-[#111113] p-3 rounded-lg border border-white/5">
                      <span className="text-[10px] text-stone-500 uppercase block font-mono">Billed Revenue</span>
                      <span className="text-base font-bold text-white mt-1 block">$142,500</span>
                    </div>
                    <div className="bg-[#111113] p-3 rounded-lg border border-white/5">
                      <span className="text-[10px] text-stone-500 uppercase block font-mono">Unbilled Hours</span>
                      <span className="text-base font-bold text-[#D4A373] mt-1 block">180 hrs</span>
                    </div>
                    <div className="bg-[#111113] p-3 rounded-lg border border-white/5">
                      <span className="text-[10px] text-stone-500 uppercase block font-mono">Avg Project Margin</span>
                      <span className="text-base font-bold text-green-400 mt-1 block">68.4%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "risks" && (
                <div className="space-y-6 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Mitigation & Audit</span>
                    <h3 className="text-xl font-bold text-white mt-2">Active Heatmap Risk Scoring</h3>
                    <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                      Log delivery threats and mitigation tasks. The risk matrix dashboard displays severity rankings to flag delivery roadblocks before they impact project launch dates.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-[#111113] p-3 rounded-lg border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <div className="text-xs">
                      <span className="font-semibold text-white">Critical Risk:</span>
                      <span className="text-stone-400 ml-1">Database API load exceeds budget limit threshold.</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "nexo" && (
                <div className="space-y-6 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Portfolio Assistant</span>
                    <h3 className="text-xl font-bold text-white mt-2">Nexo Cognitive Analysis</h3>
                    <p className="text-sm text-stone-400 mt-3 leading-relaxed">
                      Nexo continuously analyzes milestone progress, resource workloads, and transaction logs to summarize operational risks in natural language.
                    </p>
                  </div>
                  <div className="bg-[#111113] p-4 rounded-xl border border-white/10 text-xs font-mono space-y-2">
                    <span className="text-[#C67C4E]">Nexo AI:</span>
                    <p className="text-stone-300">"Project Alpha has a delayed milestone. Senior developer is over-allocated. Shift 3 tasks to resolve delay."</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Nexo AI Simulation Chat */}
      <section id="nexo-demo" className="relative max-w-7xl mx-auto px-6 py-24 z-10">
        <div className="text-center mb-16">
          <span className="text-[#D4A373] font-bold text-xs uppercase tracking-widest block mb-2 font-mono">AI-Powered Decisions</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Meet Nexo, Your Portfolio Co-Pilot
          </h2>
          <p className="text-stone-400 max-w-2xl mx-auto">
            Interact with our simulated portfolio dashboard analyzer. Click a question below to see Nexo evaluate system health logs.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Preset Buttons Left */}
          <div className="lg:col-span-2 flex flex-col gap-4 justify-center">
            <button
              onClick={() => handleNexoDemo("risks")}
              className="p-4 rounded-xl text-left bg-white/[0.02] border border-white/10 hover:border-[#C67C4E]/50 hover:bg-[#C67C4E]/5 transition-all text-sm font-semibold text-white flex items-center justify-between group cursor-pointer"
            >
              <span>Verify Portfolio Project Risks</span>
              <ChevronRight className="size-4 text-stone-500 group-hover:text-[#D4A373] transition-colors" />
            </button>

            <button
              onClick={() => handleNexoDemo("utilization")}
              className="p-4 rounded-xl text-left bg-white/[0.02] border border-white/10 hover:border-[#C67C4E]/50 hover:bg-[#C67C4E]/5 transition-all text-sm font-semibold text-white flex items-center justify-between group cursor-pointer"
            >
              <span>Check Resource Overlaps</span>
              <ChevronRight className="size-4 text-stone-500 group-hover:text-[#D4A373] transition-colors" />
            </button>

            <button
              onClick={() => handleNexoDemo("revenue")}
              className="p-4 rounded-xl text-left bg-white/[0.02] border border-white/10 hover:border-[#C67C4E]/50 hover:bg-[#C67C4E]/5 transition-all text-sm font-semibold text-white flex items-center justify-between group cursor-pointer"
            >
              <span>Summarize Revenue & Forecasts</span>
              <ChevronRight className="size-4 text-stone-500 group-hover:text-[#D4A373] transition-colors" />
            </button>
          </div>

          {/* Interactive Chat Box Right */}
          <div className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden flex flex-col h-[340px]">
            <div className="h-12 border-b border-white/5 bg-white/[0.02] px-6 flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#C67C4E] animate-ping" />
              <span className="text-xs font-semibold text-stone-300 font-mono">NEXO_AI_TELEMETRY</span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs leading-relaxed">
              {currentQuery ? (
                <div className="space-y-3">
                  <div className="text-[#D4A373]">
                    <span className="text-stone-500">Query: </span>
                    {currentQuery}
                  </div>
                  <div className="h-px bg-white/5" />
                  
                  {nexoLoading ? (
                    <div className="flex items-center gap-2 text-stone-400">
                      <span className="animate-spin select-none">⏳</span>
                      <span>Processing project logs...</span>
                    </div>
                  ) : (
                    <div className="text-stone-300 whitespace-pre-wrap">
                      <span className="text-[#C67C4E] font-semibold">Nexo: </span>
                      {nexoReply}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 space-y-3 py-10">
                  <Brain className="size-8 text-[#C67C4E]/30" />
                  <p>Click one of the telemetry prompts on the left to simulate Nexo's analytical feedback.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative max-w-7xl mx-auto px-6 py-24 border-t border-white/[0.04] z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#D4A373] font-bold text-xs uppercase tracking-widest block mb-2 font-mono">Security & Compliance</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Bank-Grade Security for Corporate Operations
            </h2>
            <p className="text-stone-400 mb-8 leading-relaxed">
              NexusFlow meets modern enterprise governance compliance. We safeguard project rates, budget files, and resource records with security features built directly into our platform.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-[#C67C4E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm">Role-Based Access Controls (RBAC)</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Restrict critical rate edits, budget creations, and compliance audits to authorized stakeholders.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-[#C67C4E] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm">Cryptographic Audit Logs</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Every status change, budget allocation override, and invoice approval is permanently logged with timestamps.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 bg-[#C67C4E]/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="glass-panel p-8 rounded-2xl w-full max-w-[400px] space-y-6 relative z-10 bg-[#0E0F12]/90 shadow-2xl">
              <div className="size-12 rounded-xl flex items-center justify-center bg-[#C67C4E]/10 border border-[#C67C4E]/20 text-[#D4A373]">
                <Shield className="size-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Encryption & Isolation</h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                Project rate sheets and resource billing credentials are encrypted in transit and at rest using AES-256 and TLS 1.3 standards.
              </p>
              <div className="h-px bg-white/5" />
              <div className="flex items-center gap-3 text-xs text-[#D4A373] font-mono">
                <Zap className="size-4" />
                <span>Verified System Compliance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero CTA / Footer Card */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 z-10">
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-16 text-center border border-[#C67C4E]/20 bg-[radial-gradient(ellipse_at_top,rgba(198,124,78,0.15),#090A0C_70%)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(198,124,78,0.02)_0%,rgba(9,10,12,0)_100%)]" />
          
          <h2 className="relative z-10 text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Unify Your Project Delivery?
          </h2>
          <p className="relative z-10 text-stone-400 max-w-xl mx-auto mb-10 text-sm md:text-base leading-relaxed">
            Create an account, align your staff directory, define your project budgets, and start delivering projects on schedule today.
          </p>
          
          <Link 
            href="/login" 
            className="relative z-10 inline-flex h-12 px-8 rounded-xl font-semibold items-center justify-center bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-xl cursor-pointer"
          >
            Get Started Free <ArrowRight className="size-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Page Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/[0.04] text-center text-xs text-stone-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>© 2026 NexusFlow Inc. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-stone-300 transition-colors">Features</a>
          <a href="#modules" className="hover:text-stone-300 transition-colors">Modules</a>
          <a href="#security" className="hover:text-stone-300 transition-colors">Security</a>
        </div>
      </footer>

      {/* Video Lightbox Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-xl">
          <button 
            onClick={() => setVideoModalOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 border border-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="Close video"
          >
            <X className="size-6" />
          </button>
          
          <div className="relative w-full max-w-5xl aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-[#000]">
            <video 
              autoPlay 
              controls
              playsInline 
              className="w-full h-full object-contain"
            >
              <source src="/NexusFlow_Enterprise_Hero_Vide.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
