import { Startup } from '../../types';
import { useState, useRef, useEffect } from 'react';
import { Loader2, Monitor, Code, Play, Send, Bot, Database, AppWindow, Square, Table2, Image as ImageIcon, X, Download, FileText, FileJson, MousePointer2 } from 'lucide-react';
import { generateWebsite, editWebsite, generateBackend, editBackend, assistCodebase } from '../../lib/gemini';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Markdown from 'react-markdown';
import { DataTable } from '../ui/DataTable';
import { Sandpack } from '@codesandbox/sandpack-react';
import JSZip from 'jszip';
import JSON5 from 'json5';

const MOCK_DATA = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Inactive' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'Editor', status: 'Active' },
  { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', role: 'User', status: 'Active' },
  { id: '5', name: 'Tom Brown', email: 'tom@example.com', role: 'User', status: 'Pending' },
];

const COLUMNS = [
  { header: 'Ism/Familiya', accessorKey: 'name' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Rol', accessorKey: 'role' },
  { 
    header: 'Holat', 
    accessorKey: 'status',
    cell: (item: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        item.status === 'Active' ? 'bg-green-100 text-green-700' : 
        item.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {item.status}
      </span>
    )
  },
];

const parseMultiFiles = (codeString: string, isFrontend: boolean = true) => {
  if (!codeString) return null;
  
  let cleanCode = codeString.trim();

  // 1. Try to parse using XML <file path="...">...</file> format first
  const xmlFiles: Record<string, string> = {};
  const fileRegex = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/ig;
  let match;
  let hasXmlFiles = false;
  
  while ((match = fileRegex.exec(cleanCode)) !== null) {
      hasXmlFiles = true;
      let path = match[1].trim();
      if (!path.startsWith('/')) path = '/' + path;
      xmlFiles[path] = match[2].trim();
  }

  // Helper function to post-process files
  const postProcessFiles = (parsed: Record<string, any>) => {
      const normalizedFiles: Record<string, string> = {};
      
      Object.entries(parsed).forEach(([path, content]) => {
        let cleanPath = path.trim();
        if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
        normalizedFiles[cleanPath] = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      });

      if (isFrontend) {
        // Sandpack specific adjustments
        if (!normalizedFiles['/public/index.html'] && !normalizedFiles['/index.html']) {
          normalizedFiles['/public/index.html'] = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
        }
        
        // Ensure App.js or App.tsx exists for Sandpack template
        if (!Object.keys(normalizedFiles).some(k => k.toLowerCase().includes('app.'))) {
          normalizedFiles['/src/App.js'] = normalizedFiles['/App.js'] || `import React from 'react';\nexport default function App() {\n  return <div className="p-8 text-2xl font-bold">Loyiha yuklanmoqda...</div>;\n}`;
        }
      }
      return normalizedFiles;
  };

  if (hasXmlFiles) {
     return postProcessFiles(xmlFiles);
  }

  // 2. Fallback to older JSON approach
  if (cleanCode.includes('```')) {
    const blocks = cleanCode.split('```');
    for (const block of blocks) {
      const b = block.replace(/^[a-z]+\n/, '').trim();
      if (b.startsWith('{') && b.includes('}')) {
        const firstBrace = b.indexOf('{');
        const lastBrace = b.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanCode = b.substring(firstBrace, lastBrace + 1);
          break;
        }
      }
    }
  } else if (cleanCode.startsWith('```') === false && (cleanCode.includes('{') && cleanCode.includes('}'))) {
     const firstBrace = cleanCode.indexOf('{');
     const lastBrace = cleanCode.lastIndexOf('}');
     if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
       cleanCode = cleanCode.substring(firstBrace, lastBrace + 1);
     }
  }

  try {
    let parsed;
    try {
      parsed = JSON5.parse(cleanCode);
    } catch (e1) {
      const manualClean = cleanCode.replace(/,\s*([\]}])/g, '$1');
      parsed = JSON5.parse(manualClean);
    }

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
       return postProcessFiles(parsed);
    }
  } catch(e) {
    console.error("Parse multi-files error:", e);
  }
  return null;
};

export default function WebsiteBuilder({ startup }: { startup: Startup }) {
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'data'>('frontend');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortOp = useRef(false);
  
  // CRUD API Generator State
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [crudModelName, setCrudModelName] = useState('');
  const [crudSchema, setCrudSchema] = useState('');

  // Local state for immediate live editing, syncs to FB occasionally if needed
  const [code, setCode] = useState(startup.websiteCode || '');
  const [backendCode, setBackendCode] = useState(startup.backendCode || '');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string, image?: string, selector?: string }[]>([]);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({
        type: 'toggle-focus-mode',
        active: focusModeActive
      }, '*');
    }

    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data.type === 'element-selected') {
        setSelectedSelector(e.data.selector);
        setFocusModeActive(false);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [focusModeActive]);

  const FOCUS_MODE_SCRIPT = `
<script>
  (function() {
    let active = false;
    let hoveredElement = null;
    
    window.addEventListener('message', (e) => {
      if (e.data.type === 'toggle-focus-mode') {
        active = e.data.active;
        if (!active && hoveredElement) {
          hoveredElement.style.outline = '';
          hoveredElement = null;
        }
      }
    });

    document.addEventListener('mouseover', (e) => {
      if (!active) return;
      e.stopPropagation();
      if (hoveredElement) hoveredElement.style.outline = '';
      hoveredElement = e.target;
      hoveredElement.style.outline = '2px solid #000';
      hoveredElement.style.outlineOffset = '-2px';
    });

    document.addEventListener('click', (e) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      
      const getSelector = (el) => {
        if (el.id) return '#' + el.id;
        let selector = el.nodeName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(/\\s+/).filter(c => c).join('.');
          if (classes) selector += '.' + classes;
        }
        return selector;
      };
      
      window.parent.postMessage({
        type: 'element-selected',
        selector: getSelector(e.target)
      }, '*');
    }, true);
  })();
</script>
`;

  const getPreviewHtml = (htmlCode: string) => {
    if (htmlCode.includes('</body>')) {
      return htmlCode.replace('</body>', `${FOCUS_MODE_SCRIPT}</body>`);
    }
    return htmlCode + FOCUS_MODE_SCRIPT;
  };

  useEffect(() => {
    if (activeTab === 'frontend' && startup.websiteCode !== code) {
      setCode(startup.websiteCode || '');
    } else if (activeTab === 'backend' && startup.backendCode !== backendCode) {
      setBackendCode(startup.backendCode || '');
    }
  }, [startup.websiteCode, startup.backendCode, activeTab]);

  const handleStop = () => {
    abortOp.current = true;
    if (editing) {
       setChatHistory(prev => [...prev, { role: 'assistant', text: 'Jarayon to\'xtatildi.' }]);
    }
    setEditing(false);
    setGenerating(false);
    setFocusModeActive(false);
  };

  const handleGenerate = async () => {
    abortOp.current = false;
    setGenerating(true);
    setChatHistory([]); // Clear history on new generation
    setSelectedSelector(null);
    try {
      const startupRef = doc(db, 'startups', startup.id);
      if (activeTab === 'frontend') {
        let generatedCode = await generateWebsite(startup);
        if (abortOp.current) return;
        
        // Clean up markdown specifically if it's not multi-file JSON
        if (!generatedCode.trim().startsWith('{')) {
           generatedCode = generatedCode.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }

        await updateDoc(startupRef, {
          websiteCode: generatedCode,
          updatedAt: serverTimestamp()
        });
        setCode(generatedCode);
      } else {
        let generatedBackend = await generateBackend(startup);
        if (abortOp.current) return;

        if (!generatedBackend.trim().startsWith('{')) {
          generatedBackend = generatedBackend.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }

        await updateDoc(startupRef, {
          backendCode: generatedBackend,
          updatedAt: serverTimestamp()
        });
        setBackendCode(generatedBackend);
      }
    } catch (error) {
      if (!abortOp.current) {
        console.error('Kod yaratishda xatolik:', error);
      }
    } finally {
      if (!abortOp.current) setGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert("Rasm hajmi 4MB dan oshmasligi kerak");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeChatCommand = async (promptText: string, attachedImg?: string | null, selector?: string | null) => {
    const isFrontend = activeTab === 'frontend';
    const currentActiveCode = isFrontend ? code : backendCode;
    
    if ((!promptText.trim() && !attachedImg) || !currentActiveCode) return;
    
    abortOp.current = false;
    setEditing(true);
    setChatHistory(prev => [...prev, { role: 'user', text: promptText, image: attachedImg || undefined, selector: selector || undefined }]);
    
    try {
      const startupRef = doc(db, 'startups', startup.id);
      
      const otherCode = isFrontend ? backendCode : code;
      const result = await assistCodebase(currentActiveCode, promptText, startup, isFrontend, chatHistory, otherCode, attachedImg, selector || undefined);

      if (abortOp.current) return;

      setChatHistory(prev => [...prev, { role: 'assistant', text: result.message }]);
      setSelectedSelector(null); // Clear after use

      if (result.action === 'update' && result.code) {
        let cleanedNewCode = result.code;
        if (!cleanedNewCode.trim().startsWith('{')) {
          cleanedNewCode = cleanedNewCode.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }

        if (isFrontend) {
          setCode(cleanedNewCode);
          await updateDoc(startupRef, {
            websiteCode: cleanedNewCode,
            updatedAt: serverTimestamp()
          });
        } else {
          setBackendCode(cleanedNewCode);
          await updateDoc(startupRef, {
            backendCode: cleanedNewCode,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      if (!abortOp.current) {
        console.error('Sayt tahrirlashda xatolik:', error);
        setChatHistory(prev => [...prev, { role: 'assistant', text: "Kechirasiz, xatolik yuz berdi. Qaytadan urinib ko'ring." }]);
      }
    } finally {
      if (!abortOp.current) setEditing(false);
    }
  };

  const handleChatEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = chatInput;
    const imgToSend = attachedImage;
    const selectorToSend = selectedSelector;
    setChatInput('');
    setAttachedImage(null);
    setFocusModeActive(false);
    await executeChatCommand(prompt, imgToSend, selectorToSend);
  };

  const handleCrudSubmit = () => {
    if (!crudModelName || !crudSchema || !backendCode) return;
    setShowCrudModal(false);
    const prompt = `Yangi '${crudModelName}' deb nomlangan turkum uchun Backend-da CRUD (Create, Read, Update, Delete) API marshrutlarini yaratib ber.
Uning ma'lumotlar tuzilmasi (schema) quyidagicha:
${crudSchema}

Iltimos server js kodni tahlil qil va bu CRUD API ni asosiy proyekt arxitekturasiga xavfsiz integratsiya qilish imkoniyatini taqdim et.`;
    
    executeChatCommand(prompt);
  };

  const handleGenerateDocs = () => {
    if (!backendCode) return;
    const prompt = `Mavjud Backend kodi uchun Swagger/OpenAPI dokumentatsiyasini yarating. 
Barcha endpoints (endpointlar) va modellarni (schemas) tahlil qilib, professionak dokumentatsiya tayyorlang. 
Buni 'swagger-ui-express' ishlatadigan '/api-docs' marshruti (route) va 'swagger.js' fayli orqali loyihaga qo'shing.`;
    executeChatCommand(prompt);
  };

  const currentDisplayCode = activeTab === 'frontend' ? code : backendCode;

  const handleManualCodeUpdate = async (newCode: string) => {
    if (activeTab === 'frontend') {
      setCode(newCode);
    } else {
      setBackendCode(newCode);
    }
  };
  
  const saveCode = async () => {
    const startupRef = doc(db, 'startups', startup.id);
    if (activeTab === 'frontend' && code !== startup.websiteCode) {
      await updateDoc(startupRef, {
        websiteCode: code,
        updatedAt: serverTimestamp()
      });
    } else if (activeTab === 'backend' && backendCode !== startup.backendCode) {
      await updateDoc(startupRef, {
        backendCode: backendCode,
        updatedAt: serverTimestamp()
      });
    }
  };

  const handleDownloadCode = async () => {
    if (!code && !backendCode) return;
    try {
      const zip = new JSZip();
      
      const readmeContent = `# ${startup.name}\n\n**G'oya:** ${startup.idea}\n\n**Loyiha turi:** ${startup.projectType || 'webapp'}\n\nUshbu arxiv AI Studio orqali yaratilgan jami Frontend va Backend kodlarini o'zida jamlaydi.`;
      zip.file("README.md", readmeContent);

      if (code) {
        const parsedFrontend = parseMultiFiles(code, true);
        const frontendFolder = zip.folder("frontend");
        if (parsedFrontend && frontendFolder) {
          Object.keys(parsedFrontend).forEach((filePath) => {
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            frontendFolder.file(cleanPath, parsedFrontend[filePath]);
          });
        } else if (frontendFolder) {
          frontendFolder.file('index.html', code);
        }
      }

      if (backendCode) {
        const parsedBackend = parseMultiFiles(backendCode, false);
        const backendFolder = zip.folder("backend");
        if (parsedBackend && backendFolder) {
          Object.keys(parsedBackend).forEach((filePath) => {
            const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
            backendFolder.file(cleanPath, parsedBackend[filePath]);
          });
        } else if (backendFolder) {
          backendFolder.file('server.js', backendCode);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${startup.name.replace(/\s+/g, '-').toLowerCase()}-toliq-loyiha.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Yuklab olishda xatolik yuz berdi.");
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-bg">
      <div className="flex-1 flex flex-col min-w-0 border-r border-line">
        <div className="flex flex-col border-b border-line bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-ink text-bg rounded-lg">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight uppercase">Startup Builder</h2>
                <div className="flex items-center space-x-2 text-[11px] text-muted font-medium mt-0.5">
                   <span className="px-1.5 py-0.5 bg-line rounded uppercase tracking-widest">{startup.projectType || 'WEB APP'}</span>
                   <span>•</span>
                   <span>{startup.name} Workstation</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
               {(code || backendCode) && !generating && !editing && (
                 <button
                   onClick={handleDownloadCode}
                   className="hidden sm:flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-bg hover:bg-line border border-line rounded-md transition-all focus-visible:ring-2 focus-visible:ring-ink"
                 >
                   <Download className="w-3.5 h-3.5" />
                   <span>Cloud Export</span>
                 </button>
               )}
               <button
                 onClick={generating || editing ? handleStop : handleGenerate}
                 className={`flex items-center space-x-2 px-4 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${generating || editing ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-ink text-bg hover:opacity-90'}`}
               >
                 {generating || editing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                 <span>{(generating || editing) ? 'Stop' : (currentDisplayCode ? 'Propagate' : 'Deploy Engine')}</span>
               </button>
            </div>
          </div>
          
          <div className="flex items-center px-6 space-x-6 border-t border-line/40 overflow-x-auto" role="tablist">
             <button
                role="tab"
                aria-selected={activeTab === 'frontend'}
                onClick={() => setActiveTab('frontend')}
                className={`py-3 text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all focus:outline-none ${activeTab === 'frontend' ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink/60'}`}
             >
                Frontend
             </button>
             <button
                role="tab"
                aria-selected={activeTab === 'backend'}
                onClick={() => setActiveTab('backend')}
                className={`py-3 text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all focus:outline-none ${activeTab === 'backend' ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink/60'}`}
             >
                Backend
             </button>
             <button
                role="tab"
                aria-selected={activeTab === 'data'}
                onClick={() => setActiveTab('data')}
                className={`py-3 text-[11px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all focus:outline-none ${activeTab === 'data' ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink/60'}`}
             >
                Database
             </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-card/60 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            {currentDisplayCode && activeTab === 'frontend' && (
              <div className="flex bg-line/30 p-1 rounded-md border border-line/50">
                <button 
                  aria-pressed={viewMode === 'preview'}
                  onClick={() => setViewMode('preview')} 
                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded-sm transition-all ${viewMode === 'preview' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  Dizayn
                </button>
                <button 
                  aria-pressed={viewMode === 'code'}
                  onClick={() => setViewMode('code')} 
                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded-sm transition-all ${viewMode === 'code' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  Kod
                </button>
              </div>
            )}
            {activeTab === 'backend' && currentDisplayCode && (
               <div className="flex items-center space-x-2">
                 <button 
                   onClick={() => setShowCrudModal(true)}
                   className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border border-line rounded-md hover:bg-line/50 hover:text-ink transition-all"
                 >
                   + CRUD
                 </button>
                 <button 
                   onClick={handleGenerateDocs}
                   disabled={editing || generating}
                   className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border border-line rounded-md hover:bg-line/50 hover:text-ink transition-all disabled:opacity-50"
                 >
                   Swagger
                 </button>
               </div>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
             <div className="px-2 py-0.5 bg-ink/5 text-ink/70 rounded text-[9px] font-bold uppercase tracking-widest border border-line">
                v2.1 Stable
             </div>
             <div className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[9px] font-bold uppercase tracking-widest border border-green-500/20">
                PRO ENGINE
             </div>
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'data' ? (
             <div className="flex-1 w-full h-full relative p-6">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-ink">Loyiha foydalanuvchilari</h3>
                   <button 
                     onClick={() => alert("Hozircha faqat Read-Only rejimida ko'rsatilmoqda.")} 
                     className="px-3 py-1.5 bg-ink text-bg text-sm font-medium rounded-md hover:bg-ink/90"
                   >
                     Ma'lumot qo'shish
                   </button>
                </div>
                <div className="h-[calc(100%-60px)] w-full border border-line rounded-lg overflow-hidden bg-card/10">
                   <DataTable 
                     data={MOCK_DATA} 
                     columns={COLUMNS} 
                     searchKey="name" 
                     searchPlaceholder="Ism bo'yicha qidirish..." 
                   />
                </div>
             </div>
          ) : !currentDisplayCode && !generating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[radial-gradient(circle_at_center,_var(--color-line)_1px,_transparent_1px)] bg-[size:24px_24px]">
              <div className="mb-8 p-6 bg-card border border-line rounded-2xl shadow-xl max-w-sm">
                <div className="w-16 h-16 bg-line/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'frontend' ? <Monitor className="w-8 h-8 text-muted" /> : <Database className="w-8 h-8 text-muted" />}
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">Workstation Tayyor</h3>
                <p className="text-sm text-muted leading-relaxed mb-6">
                   Biz startapingiz g'oyasini tahlil qildik. Endi birgina bosish orqali barcha {activeTab === 'frontend' ? 'UI komponentlarni' : 'API xizmatlarni'} yaratishimiz mumkin.
                </p>
                <button
                  onClick={handleGenerate}
                  className="w-full py-3 bg-ink text-bg font-bold rounded-xl shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
                >
                  Ishni boshlash
                </button>
              </div>
            </div>
          ) : generating ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink mb-4" />
              <p className="text-sm text-muted">Aqlbovar qilmas {activeTab === 'frontend' ? 'dizayn chizilmoqda' : 'arxitektura mo\'ljallanmoqda'}... Kodingiz yozilmoqda...</p>
            </div>
          ) : (
            <div className="flex-1 flex w-full relative">
              {editing && (
                 <div className="absolute inset-0 bg-bg/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-ink mb-4" />
                    <p className="text-sm text-muted font-medium bg-bg py-2 px-4 rounded-full shadow-sm border border-line">Maket AI orqali tahrirlanmoqda...</p>
                 </div>
              )}
              {viewMode === 'preview' && activeTab === 'frontend' ? (
                parseMultiFiles(code) ? (
                  <div className="flex-1 bg-white w-full h-full overflow-hidden [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-none [&_.sp-stack]:h-full">
                     <Sandpack 
                       template="react" 
                       theme="light"
                       files={parseMultiFiles(code)!} 
                       customSetup={{
                         dependencies: {
                           "lucide-react": "latest",
                           "date-fns": "latest",
                           "clsx": "latest",
                           "tailwind-merge": "latest"
                         }
                       }}
                       options={{
                          showTabs: true,
                          editorHeight: '100%',
                          showNavigator: true,
                       }}
                     />
                  </div>
                ) : (
                  <div className="flex-1 bg-white w-full h-full relative">
                    <iframe
                      ref={iframeRef}
                      srcDoc={getPreviewHtml(code)}
                      title="Website Preview"
                      sandbox="allow-scripts"
                      className="absolute inset-0 w-full h-full border-none"
                    />
                  </div>
                )
              ) : activeTab === 'backend' && parseMultiFiles(backendCode, false) ? (
                 <div className="flex-1 bg-white w-full h-full overflow-hidden [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full [&_.sp-layout]:rounded-none [&_.sp-stack]:h-full">
                    <Sandpack 
                      template="node" 
                      theme="dark"
                      files={parseMultiFiles(backendCode, false)} 
                      options={{
                         showTabs: true,
                         editorHeight: '100%',
                         showNavigator: true,
                      }}
                    />
                 </div>
              ) : (
                <div className="flex-1 flex flex-col bg-[#0d0d0d] w-full h-full">
                  <textarea
                    value={currentDisplayCode}
                    onChange={(e) => handleManualCodeUpdate(e.target.value)}
                    onBlur={saveCode}
                    spellCheck="false"
                    className="flex-1 w-full p-6 bg-transparent text-[#e6e6e6] font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 overflow-y-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* UI AI Assistant Sidebar */}
      {currentDisplayCode && activeTab !== 'data' && (
        <div className="w-full md:w-85 flex flex-col bg-bg border-t md:border-t-0 border-line shrink-0">
          <div className="p-5 border-b border-line bg-card flex items-center justify-between">
             <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center shadow-lg transform rotate-3">
                   <Bot className="w-5 h-5 text-bg" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-muted mb-0.5">Architect AI</h3>
                  <p className="text-xs font-bold">{activeTab === 'frontend' ? "UI Designer" : "System Architect"}</p>
                </div>
             </div>
             {editing && (
                <div className="flex items-center space-x-1.5 px-2 py-1 bg-ink/5 rounded-full">
                   <div className="w-1 h-1 bg-ink rounded-full animate-ping" />
                   <span className="text-[9px] font-bold uppercase text-ink">Thinking</span>
                </div>
             )}
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
             {chatHistory.length === 0 ? (
               <div className="bg-card/50 border border-line rounded-lg p-4 space-y-3 shadow-sm text-left">
                  <p className="text-sm text-ink/80 leading-relaxed font-medium">
                    {activeTab === 'frontend' ? "Platformani" : "Backendni"} o'zgartirish uchun istaklaringizni yozing:
                  </p>
                  {activeTab === 'frontend' ? (
                     <ul className="text-xs text-muted space-y-2 list-disc list-inside ml-1">
                      <li>"Tepadagi headerni qizil qilib ber"</li>
                      <li>"Dashboardga jadvallar jadvalini kirit"</li>
                      <li>"Saytdagilarni O'zbek tiliga tarjima qil"</li>
                    </ul>
                  ) : (
                    <ul className="text-xs text-muted space-y-2 list-disc list-inside ml-1">
                      <li>"Foydalanuvchini autentifikatsiya qilish routesini qo'sh"</li>
                      <li>"Izohlarni ingliz tiliga aylantir"</li>
                      <li>"Mahsulotlar modelini yarat (schema)"</li>
                    </ul>
                  )}
               </div>
             ) : (
               <div className="space-y-4 flex flex-col">
                 {chatHistory.map((msg, idx) => (
                   <div key={idx} className={`max-w-[85%] text-[13px] leading-relaxed p-3 rounded-xl shadow-sm ${msg.role === 'user' ? 'bg-line/30 text-ink self-end rounded-tr-sm' : 'bg-ink/5 border border-line/50 text-ink self-start rounded-tl-sm'}`}>
                     {msg.role === 'user' ? (
                        <>
                           {msg.image && (
                              <div className="mb-2 w-full max-w-[200px] overflow-hidden rounded-md border border-line">
                                 <img src={msg.image} alt="Foydalanuvchi yuborgan rasm" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                              </div>
                           )}
                           {msg.selector && (
                              <div className="mb-2 px-2 py-1 bg-ink/10 text-[10px] font-mono rounded border border-line flex items-center">
                                 <MousePointer2 className="w-3 h-3 mr-1" /> {msg.selector}
                              </div>
                           )}
                           {msg.text}
                        </>
                     ) : (
                        <div className="markdown-body text-[13px] leading-relaxed break-words space-y-2 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_strong]:font-semibold [&_code]:bg-line/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                           <Markdown>{msg.text}</Markdown>
                        </div>
                     )}
                   </div>
                 ))}
                 {editing && (
                   <div className="max-w-[85%] text-[13px] leading-relaxed p-3 rounded-xl bg-ink/5 border border-line/50 text-ink self-start rounded-tl-sm flex items-center space-x-2">
                     <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />
                     <span className="text-muted">Kod yangilanmoqda...</span>
                   </div>
                 )}
               </div>
             )}
          </div>
                   <div className="p-4 border-t border-line bg-card">
            {(attachedImage || selectedSelector) && (
              <div className="mb-3 flex flex-wrap gap-2">
                 {attachedImage && (
                    <div className="relative group">
                       <img src={attachedImage} alt="Preview" className="h-20 w-auto rounded-lg border-2 border-line object-cover shadow-sm group-hover:border-ink transition-colors" referrerPolicy="no-referrer" />
                       <button 
                         onClick={() => setAttachedImage(null)}
                         className="absolute -top-2 -right-2 bg-ink text-bg rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                         type="button"
                       >
                         <X className="w-3 h-3" />
                       </button>
                    </div>
                 )}
                 {selectedSelector && (
                    <div className="px-3 py-1.5 bg-ink text-bg text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center shadow-lg border border-white/10">
                       <MousePointer2 className="w-3.5 h-3.5 mr-2 opacity-80" />
                       <span className="max-w-[120px] truncate">{selectedSelector}</span>
                       <button 
                         onClick={() => setSelectedSelector(null)}
                         className="ml-2 hover:text-red-400 p-0.5 transition-colors"
                         type="button"
                       >
                         <X className="w-3 h-3" />
                       </button>
                    </div>
                 )}
              </div>
            )}
            
            {focusModeActive && (
               <div className="mb-3 p-3 bg-ink text-bg border border-white/10 rounded-xl flex items-center justify-between shadow-2xl animate-pulse">
                  <div className="flex items-center space-x-3 text-xs font-bold uppercase tracking-widest">
                     <MousePointer2 className="w-4 h-4" />
                     <span>Select element</span>
                  </div>
                  <button 
                    onClick={() => setFocusModeActive(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
               </div>
            )}

            <div className="bg-bg rounded-2xl border border-line p-2 focus-within:ring-2 focus-within:ring-ink/20 transition-all shadow-sm">
               <form onSubmit={handleChatEdit} className="relative">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AI to change something..."
                    className="w-full bg-transparent text-sm resize-none border-none focus:outline-none focus:ring-0 px-3 py-2 min-h-[60px] max-h-48 leading-relaxed font-medium placeholder:text-muted/40"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatEdit(e);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-1 px-1">
                     <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-2 rounded-xl transition-all ${attachedImage ? 'bg-line text-ink' : 'text-muted hover:bg-line hover:text-ink'}`}
                          title="Attach image"
                        >
                           <ImageIcon className="w-4 h-4" />
                        </button>
                        {activeTab === 'frontend' && (
                          <button
                            type="button"
                            onClick={() => setFocusModeActive(!focusModeActive)}
                            className={`p-2 rounded-xl transition-all ${focusModeActive || selectedSelector ? 'bg-line text-ink' : 'text-muted hover:bg-line hover:text-ink'}`}
                            title="Focus mode"
                          >
                            <MousePointer2 className="w-4 h-4" />
                          </button>
                        )}
                     </div>
                     <button
                        type={editing ? "button" : "submit"}
                        onClick={editing ? handleStop : undefined}
                        disabled={!chatInput.trim() && !attachedImage && !editing}
                        className={`p-2.5 rounded-xl transition-all shadow-md ${editing ? 'bg-red-500 text-white' : 'bg-ink text-bg hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:shadow-none'}`}
                     >
                        {editing ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
                     </button>
                  </div>
               </form>
            </div>
            
            <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleImageUpload} 
               accept="image/*" 
               className="hidden" 
            />
          </div>
        </div>
      )}

      {/* CRUD Generation Modal */}
      {showCrudModal && (
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md border border-line rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <h3 className="font-semibold flex items-center"><Database className="w-4 h-4 mr-2 text-ink" /> CRUD API Yaratish</h3>
              <button onClick={() => setShowCrudModal(false)} className="text-muted hover:text-ink"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
               <div>
                 <label className="block text-xs font-medium text-muted mb-1">Model nomi (Masalan: Mahsulot, User, Post)</label>
                 <input 
                   value={crudModelName} 
                   onChange={e => setCrudModelName(e.target.value)} 
                   className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink/40" 
                   placeholder="Product" 
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-muted mb-1">Maydonlar (Masalan: name: string, price: number)</label>
                 <textarea 
                   value={crudSchema} 
                   onChange={e => setCrudSchema(e.target.value)} 
                   className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink/40 resize-none h-24" 
                   placeholder="title: string,&#10;description: string,&#10;price: number" 
                 />
               </div>
            </div>
            <div className="p-4 border-t border-line bg-bg flex justify-end space-x-2">
               <button onClick={() => setShowCrudModal(false)} className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors">Bekor qilish</button>
               <button onClick={handleCrudSubmit} disabled={!crudModelName || !crudSchema || editing || generating} className="px-4 py-2 text-sm bg-ink text-bg rounded-lg hover:bg-ink/90 disabled:opacity-50 transition-colors">Generatsiya qilish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
