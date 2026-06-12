"use client";

import React, { useState, useEffect } from "react";
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Upload, 
  Grid3x3, 
  List, 
  Search, 
  MoreHorizontal, 
  X, 
  Download, 
  Trash2, 
  FolderSync, 
  FileCode, 
  ExternalLink 
} from "lucide-react";
import { documents as initialMockDocuments } from "@/lib/mock";
import { toast } from "sonner";
import { supabase, useSupabase } from "@/lib/supabase";
import { useAuth, useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/context/WorkspaceContext";

// ==========================================
// TYPES
// ==========================================

export interface RepoDocument {
  id: string;
  name: string;
  type: "PDF" | "Excel" | "Word" | "Image" | "Code" | "Other";
  size: string;
  owner: string;
  updated: string;
  project: string;
  folder: "Projects" | "PMO Templates" | "Finance" | "Compliance" | "Architecture";
  description: string;
  filePath?: string;
}

function Documents() {
  const { orgRole } = useAuth();
  const { user } = useUser();
  const { projects } = useWorkspace();
  const { getAuthenticatedClient } = useSupabase();

  const userName = user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  // Roles detection
  const isSystemAdmin = !!(orgRole && (
    orgRole.toLowerCase().includes("admin") ||
    orgRole.toLowerCase().includes("it_administrators")
  ));

  const isProjectManager = !!(orgRole && orgRole.toLowerCase().includes("project_managers"));

  const canAccessProjectFiles = !orgRole || [
    "org:admin",
    "org:it_administrators",
    "org:project_managers",
    "org:finance_team",
    "org:executive_management",
    "org:member",
    "org:resource_managers"
  ].includes(orgRole);

  // Find projects managed by this user
  const managedProjectNames = projects
    .filter(p => p.projectManager && userName && (p.projectManager.toLowerCase() === userName.toLowerCase() || p.projectManager === userName))
    .map(p => p.name);

  const [docs, setDocs] = useState<RepoDocument[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Folder Navigation state
  const [activeFolder, setActiveFolderState] = useState<string | null>(null);
  const setActiveFolder = (val: string | null) => {
    setActiveFolderState(val);
    if (typeof window !== "undefined") {
      if (val === null) {
        localStorage.removeItem("nexus_doc_active_folder");
      } else {
        localStorage.setItem("nexus_doc_active_folder", val);
      }
    }
  };

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RepoDocument | null>(null);

  // Form State for upload
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<RepoDocument['type']>("PDF");
  const [formFolder, setFormFolder] = useState<RepoDocument['folder']>(
    canAccessProjectFiles ? "Projects" : "PMO Templates"
  );

  // Prevent System Admin or unauthorized role from manually accessing the Projects folder
  useEffect(() => {
    if (activeFolder === "Projects" && !canAccessProjectFiles) {
      setActiveFolder(null);
    }
  }, [activeFolder, canAccessProjectFiles]);

  // Sync default upload folder if access rights change
  useEffect(() => {
    if (!canAccessProjectFiles && formFolder === "Projects") {
      setFormFolder("PMO Templates");
    }
  }, [canAccessProjectFiles, formFolder]);

  const [selectedSubProject, setSelectedSubProjectState] = useState<string | null>(null);
  const setSelectedSubProject = (val: string | null) => {
    setSelectedSubProjectState(val);
    if (typeof window !== "undefined") {
      if (val === null) {
        localStorage.removeItem("nexus_doc_subproject");
      } else {
        localStorage.setItem("nexus_doc_subproject", val);
      }
    }
  };

  // Safe client-side mount navigation restoration to prevent hydration mismatches
  useEffect(() => {
    const savedFolder = localStorage.getItem("nexus_doc_active_folder");
    const savedSubProject = localStorage.getItem("nexus_doc_subproject");
    if (savedFolder) {
      setActiveFolderState(savedFolder);
    }
    if (savedSubProject) {
      setSelectedSubProjectState(savedSubProject);
    }
  }, []);

  // Projects to list as subfolders under "Projects"
  const accessibleProjects = isProjectManager
    ? projects.filter(p => p.projectManager && userName && (p.projectManager.toLowerCase() === userName.toLowerCase() || p.projectManager === userName))
    : projects;

  // Reset selected project subfolder if active folder changes
  useEffect(() => {
    if (activeFolder !== "Projects") {
      setSelectedSubProject(null);
    }
  }, [activeFolder]);

  const [formProject, setFormProject] = useState("Atlas Banking Platform");

  // Sync default upload project option
  useEffect(() => {
    if (selectedSubProject) {
      setFormProject(selectedSubProject);
    } else if (accessibleProjects.length > 0) {
      setFormProject(accessibleProjects[0].name);
    } else {
      setFormProject("General PMO");
    }
  }, [selectedSubProject, accessibleProjects]);

  const [formSize, setFormSize] = useState("1.8 MB");
  const [formDesc, setFormDesc] = useState("");

  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setSelectedFileName(file.name);

    // Pre-fill Name (remove extension)
    const lastDot = file.name.lastIndexOf(".");
    const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
    setFormName(baseName);

    // Calculate size
    let sizeStr = "0 KB";
    if (file.size > 1024 * 1024) {
      sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    } else {
      sizeStr = Math.round(file.size / 1024) + " KB";
    }
    setFormSize(sizeStr);

    // Detect format
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      setFormType("PDF");
      setFormFolder("Projects");
    } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      setFormType("Excel");
      setFormFolder("Finance");
    } else if (ext === "docx" || ext === "doc") {
      setFormType("Word");
      setFormFolder("Compliance");
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) {
      setFormType("Image");
      setFormFolder("Architecture");
    } else if (["tsx", "ts", "jsx", "js", "json", "css", "html"].includes(ext || "")) {
      setFormType("Code");
      setFormFolder("Architecture");
    } else {
      setFormType("Other");
      setFormFolder("Projects");
    }
  };

  // Initialize Documents state from Supabase, fallback to localStorage/seed
  useEffect(() => {
    async function loadDocuments() {
      try {
        const authClient = await getAuthenticatedClient();
        const { data, error } = await authClient.from("documents").select("*");
        
        let currentDocs: RepoDocument[] = [];
        if (error || !data || data.length === 0) {
          const saved = localStorage.getItem("nexus_documents_v2");
          if (saved) {
            currentDocs = JSON.parse(saved);
          } else {
            currentDocs = initializeDefaultDocs();
          }
        } else {
          currentDocs = data.map(d => ({
            id: d.id,
            name: d.name,
            type: d.file_type as RepoDocument['type'],
            size: d.file_size 
              ? (d.file_size >= 1 
                ? `${d.file_size.toFixed(1)} MB` 
                : `${Math.round(d.file_size * 1024)} KB`) 
              : "1.2 MB",
            owner: d.uploaded_by || "PMO",
            updated: d.updated_at ? new Date(d.updated_at).toLocaleDateString() : "Just now",
            project: d.project_name || "General",
            folder: d.folder as RepoDocument['folder'],
            description: d.description || `Official document on ${d.project_name || "General"}.`,
            filePath: d.file_path
          }));
        }
        setDocs(currentDocs);
      } catch (err) {
        console.error("Failed to load documents from Supabase:", err);
        const saved = localStorage.getItem("nexus_documents_v2");
        if (saved) {
          setDocs(JSON.parse(saved));
        } else {
          initializeDefaultDocs();
        }
      }
    }
    loadDocuments();
  }, []);

  const initializeDefaultDocs = () => {
    const mapped: RepoDocument[] = initialMockDocuments.map((d, index) => {
      let t: RepoDocument['type'] = "Other";
      if (d.type === "Excel") t = "Excel";
      else if (d.type === "Excel (Imported)") t = "Excel";
      else if (d.type === "PDF") t = "PDF";
      else if (d.type === "Word") t = "Word";
      else if (d.type === "Image") t = "Image";

      let folderName: RepoDocument['folder'] = "Projects";
      if (d.name.toLowerCase().includes("risk") || d.project === "PMO") {
        folderName = "PMO Templates";
      } else if (d.name.toLowerCase().includes("invoice") || d.name.toLowerCase().includes("budget")) {
        folderName = "Finance";
      } else if (d.name.toLowerCase().includes("contract") || d.name.toLowerCase().includes("sow")) {
        folderName = "Compliance";
      } else if (d.name.toLowerCase().includes("architecture") || d.name.toLowerCase().includes("design")) {
        folderName = "Architecture";
      }

      return {
        id: `DOC-0${200 + index}`,
        name: d.name,
        type: t,
        size: d.size,
        owner: d.owner || "PMO",
        updated: d.updated || "Just now",
        project: d.project || "General",
        folder: folderName,
        description: `Official ${t} attachment for project ${d.project || "General"}.`
      };
    });
    setDocs(mapped);
    localStorage.setItem("nexus_documents_v2", JSON.stringify(mapped));
    return mapped;
  };

  const parseSizeToMb = (sizeStr: string): number => {
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 1.0;
    if (sizeStr.toLowerCase().includes("kb")) {
      return num / 1024;
    }
    if (sizeStr.toLowerCase().includes("gb")) {
      return num * 1024;
    }
    return num;
  };

  const saveState = (updated: RepoDocument[]) => {
    setDocs(updated);
    localStorage.setItem("nexus_documents_v2", JSON.stringify(updated));
  };

  const iconFor = (t: RepoDocument['type']) => {
    switch (t) {
      case "PDF": return <FileText className="size-5 text-red-500" />;
      case "Excel": return <FileSpreadsheet className="size-5 text-emerald-600" />;
      case "Word": return <FileText className="size-5 text-sky-600" />;
      case "Image": return <ImageIcon className="size-5 text-violet-500" />;
      case "Code": return <FileCode className="size-5 text-amber-500" />;
      default: return <FileText className="size-5 text-muted-foreground" />;
    }
  };

  // Upload Action
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSystemAdmin) {
      toast.error("System Administrators only have read access.");
      return;
    }
    if (!formName.trim()) {
      toast.error("Please enter a file name.");
      return;
    }

    // Append file type extension if missing
    let finalName = formName;
    const extMap: Record<string, string> = {
      PDF: ".pdf",
      Excel: ".xlsx",
      Word: ".docx",
      Image: ".png",
      Code: ".tsx",
      Other: ".txt"
    };
    const targetExt = extMap[formType];
    if (targetExt && !finalName.toLowerCase().endsWith(targetExt)) {
      finalName = finalName + targetExt;
    }

    const newDocId = (() => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    })();

    const newDoc: RepoDocument = {
      id: newDocId,
      name: finalName,
      type: formType,
      size: formSize || "1.2 MB",
      owner: userName || "Yogesh V",
      updated: new Date().toISOString().split("T")[0],
      project: formProject,
      folder: formFolder,
      description: formDesc || `Uploaded document for project ${formProject}.`
    };

    // Get authenticated client first
    const authClient = await getAuthenticatedClient();

    let uploadedFilePath = `documents/${newDoc.name}`;
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const pathInBucket = `${newDocId}.${fileExt}`;
      
      try {
        const { error: uploadError } = await authClient.storage
          .from("documents")
          .upload(pathInBucket, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error("Supabase storage upload error:", uploadError);
          toast.error(`File upload to storage failed: ${uploadError.message}`);
          return;
        }
        uploadedFilePath = pathInBucket;
      } catch (err) {
        console.error("Storage upload failed:", err);
        toast.error("Failed to upload file to storage.");
        return;
      }
    }

    newDoc.filePath = uploadedFilePath;

    // Save to database first
    try {
      const dbRow = {
        id: newDoc.id,
        name: newDoc.name,
        file_path: uploadedFilePath,
        file_type: newDoc.type,
        file_size: parseSizeToMb(newDoc.size),
        folder: newDoc.folder,
        project_name: newDoc.project,
        uploaded_by: newDoc.owner
      };
      
      const { error } = await authClient.from("documents").insert(dbRow);
      if (error) {
        console.error("Supabase insert error:", error);
        toast.error(`Database save failed: ${error.message}`);
        if (selectedFile) {
          await authClient.storage.from("documents").remove([uploadedFilePath]);
        }
        return;
      }
      console.log("Supabase insert succeeded!");
    } catch (err) {
      console.error("Failed to insert document in Supabase:", err);
      toast.error("Failed to save document to database.");
      return;
    }

    const updated = [newDoc, ...docs];
    saveState(updated);
    setIsUploadOpen(false);
    
    // Reset Form
    setFormName("");
    setFormDesc("");
    setSelectedFile(null);
    setSelectedFileName("");

    toast.success(`Successfully uploaded ${finalName} to ${formFolder}`);
  };

  // Delete Action
  const handleDeleteDoc = async (docId: string) => {
    if (isSystemAdmin) {
      toast.error("System Administrators only have read access.");
      return;
    }

    const authClient = await getAuthenticatedClient();

    if (!docId.includes("DOC-")) {
      try {
        // Find document and delete from storage first if applicable
        const docToDelete = docs.find(d => d.id === docId);
        if (docToDelete && docToDelete.filePath) {
          await authClient.storage.from("documents").remove([docToDelete.filePath]);
        }

        const { error } = await authClient.from("documents").delete().eq("id", docId);
        if (error) {
          console.error("Failed to delete document from Supabase:", error);
          toast.error(`Failed to delete document from database: ${error.message}`);
          return;
        }
      } catch (err) {
        console.error("Failed to delete document from Supabase:", err);
        toast.error("Failed to delete document from database.");
        return;
      }
    }

    const updated = docs.filter(d => d.id !== docId);
    saveState(updated);
    setSelectedDoc(null);
    toast.success("Document removed from repository.");
  };

  // Move folder action
  const handleMoveFolder = async (docId: string, destFolder: RepoDocument['folder']) => {
    if (isSystemAdmin) {
      toast.error("System Administrators only have read access.");
      return;
    }

    const authClient = await getAuthenticatedClient();

    if (!docId.includes("DOC-")) {
      try {
        const { error } = await authClient.from("documents").update({ folder: destFolder }).eq("id", docId);
        if (error) {
          console.error("Failed to update folder in Supabase:", error);
          toast.error(`Failed to move folder in database: ${error.message}`);
          return;
        }
      } catch (err) {
        console.error("Failed to update folder in Supabase:", err);
        toast.error("Failed to save changes to database.");
        return;
      }
    }

    const updated = docs.map(d => d.id === docId ? { ...d, folder: destFolder } : d);
    saveState(updated);
    if (selectedDoc) {
      setSelectedDoc({ ...selectedDoc, folder: destFolder });
    }
    toast.success(`Moved document to folder: ${destFolder}`);
  };

  // Download Handler
  const handleDownload = async (doc: RepoDocument) => {
    if (doc.filePath && !doc.id.includes("DOC-")) {
      try {
        const authClient = await getAuthenticatedClient();
        const { data, error } = await authClient.storage
          .from("documents")
          .download(doc.filePath);
          
        if (error) {
          console.error("Storage download error:", error);
          toast.error(`Download failed: ${error.message}`);
          return;
        }
        
        if (data) {
          const url = window.URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success(`Downloaded ${doc.name} successfully!`);
        }
      } catch (err) {
        console.error("Download failed:", err);
        toast.error("Download failed.");
      }
      return;
    }

    // Fallback simulation for mock documents
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `Preparing download file: ${doc.name}...`,
        success: `Downloaded ${doc.name} successfully!`,
        error: "Download failed."
      }
    );
  };

  // Filter logs
  const filteredDocs = docs.filter(d => {
    // Hide Projects files if user is not allowed to access them
    if (d.folder === "Projects" && !canAccessProjectFiles) {
      return false;
    }

    // If active folder is Projects:
    // If a subproject is selected, show only documents belonging to that project
    if (d.folder === "Projects" && activeFolder === "Projects") {
      if (selectedSubProject) {
        if (d.project !== selectedSubProject) return false;
      } else {
        // If no subproject is selected yet, we shouldn't show files (we show folders instead)
        return false;
      }
    }

    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = !activeFolder || d.folder === activeFolder;
    return matchesSearch && matchesFolder;
  });

  // Calculate folder counts dynamically
  const getFolderCount = (folderName: string) => {
    return docs.filter(d => {
      if (d.folder !== folderName) return false;
      if (d.folder === "Projects" && !canAccessProjectFiles) return false;
      if (d.folder === "Projects" && isProjectManager && userName) {
        return managedProjectNames.includes(d.project);
      }
      return true;
    }).length;
  };

  // Calculate aggregate space
  const totalGb = (3.2 + (docs.length * 0.046)).toFixed(1);

  const showProjectFolders = activeFolder === "Projects" && !selectedSubProject;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Document Repository</h1>
          <p className="text-sm text-muted-foreground mt-1">{docs.length} documents · {totalGb} GB across all projects</p>
        </div>
        {!isSystemAdmin && (
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-medium shadow-copper inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Upload className="size-4" />Upload Files
          </button>
        )}
      </div>

      {/* Folders Navigation Row */}
      <div className={`grid grid-cols-2 ${canAccessProjectFiles ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}>
        {[
          { name: "Projects" },
          { name: "PMO Templates" },
          { name: "Finance" },
          { name: "Compliance" },
          { name: "Architecture" }
        ].map((f) => {
          if (f.name === "Projects" && !canAccessProjectFiles) return null;

          const isSelected = activeFolder === f.name;
          const count = getFolderCount(f.name);
          return (
            <div 
              key={f.name} 
              onClick={() => setActiveFolder(isSelected ? null : f.name)}
              className={`group border rounded-2xl p-5 transition-all cursor-pointer ${
                isSelected 
                  ? "bg-primary/10 border-primary shadow-soft" 
                  : "bg-card border-border hover:shadow-card hover:-translate-y-0.5"
              }`}
            >
              <div className={`size-10 rounded-xl grid place-items-center mb-3 transition ${
                isSelected ? "bg-primary text-white" : "bg-gradient-to-br from-primary/15 to-accent/10 text-primary"
              }`}>
                <Folder className="size-5" />
              </div>
              <div className="text-sm font-semibold truncate text-foreground">{f.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{count} items</div>
            </div>
          );
        })}
      </div>

      {/* Main Files Display Panel */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Navigation Breadcrumb & Search Actions */}
        <div className="px-5 py-4 border-b border-border bg-secondary/10 flex flex-col md:flex-row items-center gap-3">
          <div className="mr-auto text-xs text-muted-foreground flex items-center gap-1">
            <button 
              onClick={() => {
                setActiveFolder(null);
                setSelectedSubProject(null);
              }}
              className="hover:text-primary transition font-medium"
            >
              All Files
            </button>
            {activeFolder && (
              <>
                <span className="mx-1 text-muted-foreground/50">›</span>
                <button 
                  onClick={() => setSelectedSubProject(null)}
                  className={`hover:text-primary transition font-bold px-2 py-0.5 rounded-md ${!selectedSubProject ? "text-primary bg-primary/10" : "text-muted-foreground/85 hover:bg-secondary/50"}`}
                >
                  {activeFolder}
                </button>
              </>
            )}
            {selectedSubProject && (
              <>
                <span className="mx-1 text-muted-foreground/50">›</span>
                <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">{selectedSubProject}</span>
              </>
            )}
          </div>
          
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input 
              placeholder="Search file name, project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-1 p-1 bg-secondary rounded-xl">
            <button 
              onClick={() => setView("grid")} 
              className={`size-8 grid place-items-center rounded-lg cursor-pointer transition ${view === "grid" ? "bg-card shadow-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3x3 className="size-4" />
            </button>
            <button 
              onClick={() => setView("list")} 
              className={`size-8 grid place-items-center rounded-lg cursor-pointer transition ${view === "list" ? "bg-card shadow-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        {/* Dynamic List or Grid Toggle Content */}
        {showProjectFolders ? (
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {accessibleProjects.map((proj) => {
              const docCount = docs.filter(d => d.project === proj.name).length;
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedSubProject(proj.name)}
                  className="group rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer bg-card/60 relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <Folder className="size-5" />
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {proj.code || "Project"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors line-clamp-1 mt-1">
                      {proj.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Manager: {proj.projectManager || "None"}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{docCount} {docCount === 1 ? "doc" : "docs"}</span>
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium inline-flex items-center gap-0.5">
                      Open →
                    </span>
                  </div>
                </div>
              );
            })}
            {accessibleProjects.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <Folder className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-medium text-foreground text-sm">No Projects Found</h3>
                <p className="text-xs text-muted-foreground mt-1">You are not assigned to any active projects.</p>
              </div>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocs.map((d) => (
              <div 
                key={d.id} 
                onClick={() => setSelectedDoc(d)}
                className="group rounded-2xl border border-border p-4 hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer bg-card/60"
              >
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-secondary to-secondary/30 border border-border/40 grid place-items-center mb-3">
                  {iconFor(d.type)}
                </div>
                <div className="text-xs font-semibold truncate text-foreground">{d.name}</div>
                <div className="text-[10px] text-muted-foreground flex justify-between mt-1">
                  <span>{d.size}</span>
                  <span>{d.updated} ago</span>
                </div>
              </div>
            ))}
            {filteredDocs.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground text-xs italic">
                No documents found in this directory folder.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="font-medium px-5 py-3">File Name</th>
                  <th className="font-medium px-3 py-3">Project Link</th>
                  <th className="font-medium px-3 py-3">Virtual Folder</th>
                  <th className="font-medium px-3 py-3">Owner</th>
                  <th className="font-medium px-3 py-3 text-right">Size</th>
                  <th className="font-medium px-5 py-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d) => (
                  <tr 
                    key={d.id} 
                    onClick={() => setSelectedDoc(d)}
                    className="border-b border-border/50 hover:bg-secondary/20 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      {iconFor(d.type)}
                      <span className="font-semibold text-foreground truncate max-w-[200px]">{d.name}</span>
                    </td>
                    <td className="px-3 text-muted-foreground">{d.project}</td>
                    <td className="px-3">
                      <span className="px-2 py-0.5 bg-secondary border border-border text-[9px] rounded-md font-semibold text-muted-foreground">
                        {d.folder}
                      </span>
                    </td>
                    <td className="px-3 font-medium">{d.owner}</td>
                    <td className="px-3 text-right text-muted-foreground font-mono">{d.size}</td>
                    <td className="px-5 text-right text-muted-foreground">{d.updated} ago</td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground text-xs italic">
                      No documents found in this directory list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPLOAD FILE MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsUploadOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <h3 className="font-semibold text-foreground">Upload Document Attachment</h3>
              <button 
                onClick={() => setIsUploadOpen(false)} 
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              {/* Real File Input selector */}
              <div className="space-y-2 bg-secondary/20 p-4 border border-dashed border-border rounded-xl text-center">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className="size-6 text-primary" />
                  <span className="font-semibold text-xs text-foreground">Select file from device</span>
                  <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">PDF, Excel, Word, Image</span>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  id="doc-file-input"
                  onChange={handleFileChange}
                />
                <button 
                  type="button"
                  onClick={() => document.getElementById("doc-file-input")?.click()}
                  className="mt-1 h-7 px-3 rounded-lg border border-border bg-card hover:bg-secondary text-[10px] font-semibold text-foreground cursor-pointer transition"
                >
                  Choose File
                </button>
                {selectedFileName && (
                  <div className="text-[10px] text-emerald-500 font-bold mt-1 truncate">
                    Selected: {selectedFileName}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">File Name (Without extension)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. System-Architecture-SOP" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">File Format</label>
                  <select 
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    <option value="PDF">PDF File (.pdf)</option>
                    <option value="Excel">Excel Sheet (.xlsx)</option>
                    <option value="Word">Word Doc (.docx)</option>
                    <option value="Image">PNG Image (.png)</option>
                    <option value="Code">Source Code (.tsx)</option>
                    <option value="Other">Text/Other (.txt)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Destination Folder</label>
                  <select 
                    value={formFolder}
                    onChange={(e) => setFormFolder(e.target.value as any)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    {canAccessProjectFiles && <option value="Projects">Projects</option>}
                    <option value="PMO Templates">PMO Templates</option>
                    <option value="Finance">Finance</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Architecture">Architecture</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Link Project</label>
                  <select 
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50"
                  >
                    {accessibleProjects.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    <option value="General PMO">General PMO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Mock File Size</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 2.4 MB" 
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full h-9 px-3 border border-border rounded-xl bg-secondary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Document Description / Scope</label>
                <textarea 
                  rows={2} 
                  placeholder="Additional context about this upload..." 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsUploadOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium shadow-copper hover:opacity-90"
                >
                  Upload & Classify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT METADATA PREVIEW DRAWER */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div onClick={() => setSelectedDoc(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative bg-card border-l border-border h-full w-full max-w-md shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                {iconFor(selectedDoc.type)}
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Document details</span>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">File Name</div>
                <h3 className="text-sm font-bold text-foreground break-all">{selectedDoc.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[9px] rounded font-semibold text-primary">
                    Format: {selectedDoc.type}
                  </span>
                  <span className="px-2 py-0.5 bg-secondary border border-border text-[9px] rounded font-semibold text-muted-foreground">
                    ID: {selectedDoc.id}
                  </span>
                </div>
              </div>

              {/* Metadata Details table */}
              <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">File Metadata</h4>
                <div className="grid grid-cols-2 gap-y-2.5">
                  <div className="text-muted-foreground">Linked Project:</div>
                  <div className="font-semibold text-right text-foreground">{selectedDoc.project}</div>
                  <div className="text-muted-foreground">Virtual Folder:</div>
                  <div className="font-semibold text-right text-primary">{selectedDoc.folder}</div>
                  <div className="text-muted-foreground">Uploaded By:</div>
                  <div className="font-semibold text-right text-foreground">{selectedDoc.owner}</div>
                  <div className="text-muted-foreground">File Size:</div>
                  <div className="font-semibold text-right text-foreground font-mono">{selectedDoc.size}</div>
                  <div className="text-muted-foreground">Last Modified:</div>
                  <div className="font-semibold text-right text-foreground">{selectedDoc.updated} ago</div>
                </div>
              </div>

              {/* File Category Transfer */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <FolderSync className="size-3.5 text-primary" />Reclassify Folder
                </div>
                <select 
                  value={selectedDoc.folder}
                  onChange={(e) => handleMoveFolder(selectedDoc.id, e.target.value as any)}
                  disabled={isSystemAdmin}
                  className="w-full h-9 px-2 border border-border rounded-xl bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {canAccessProjectFiles && <option value="Projects">Projects</option>}
                  <option value="PMO Templates">PMO Templates</option>
                  <option value="Finance">Finance</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Architecture">Architecture</option>
                </select>
              </div>

              {/* Scope/Description */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">File Scope & description</div>
                <p className="bg-secondary/30 border border-border rounded-xl p-3 leading-relaxed text-muted-foreground italic">
                  "{selectedDoc.description}"
                </p>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="p-6 border-t border-border bg-secondary/5 flex gap-2">
              <button 
                onClick={() => handleDownload(selectedDoc)}
                className="w-full h-10 rounded-xl bg-primary text-white text-xs font-semibold shadow-copper hover:opacity-90 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="size-4" />Download File
              </button>
              
              {!isSystemAdmin && (
                <button 
                  onClick={() => handleDeleteDoc(selectedDoc.id)}
                  className="h-10 px-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-500/10 transition inline-flex items-center justify-center cursor-pointer"
                  title="Delete document permanently"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
