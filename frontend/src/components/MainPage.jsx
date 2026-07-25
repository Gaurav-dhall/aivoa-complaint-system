import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSelector, useDispatch } from 'react-redux';
import CompletenessChecker from './CompletenessChecker';
import Toast from './Toast';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  updateField,
  updateAllFields,
  resetForm,
  addChatMessage,
  setProcessing,
} from '../store/complaintSlice';
import { extractComplaint, chatMessage, saveComplaint, checkDuplicate } from '../services/api';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const LightningIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ShieldIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const PaperclipIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

const SendIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CheckIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FileIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const UserIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ─── Shared Field classes ──────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5046e6]/30 focus:border-[#5046e6] bg-white transition';

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const sectionLabelClass =
  'text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase border-b border-gray-100 pb-2 mb-4 mt-8';

// ─── Navbar ───────────────────────────────────────────────────────────────────

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="w-full bg-white border-b border-gray-200 flex items-center justify-between px-6 h-14 flex-shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5046e6]" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#ede9fe" />
            <path d="M13 6L7 13h5l-1 5 6-7h-5l1-5z" fill="#5046e6" />
          </svg>
        </div>
        <div className="flex items-end gap-0.5">
          <span className="font-bold text-gray-900 text-base leading-none">AIVOA</span>
          <span className="text-[10px] text-gray-400 ml-1 leading-none mb-0.5">QMS</span>
        </div>
      </div>

      {/* Nav links + avatar */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/')}
          className={`text-sm font-medium pb-0.5 transition-colors ${
            location.pathname === '/'
              ? 'text-[#5046e6] border-b-2 border-[#5046e6]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Log Complaint
        </button>
        <button
          onClick={() => navigate('/complaints')}
          className={`text-sm font-medium pb-0.5 transition-colors ${
            location.pathname === '/complaints'
              ? 'text-[#5046e6] border-b-2 border-[#5046e6]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          View Complaints
        </button>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
};

// ─── Left Panel — Complaint Form ───────────────────────────────────────────────

const LeftPanel = () => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.complaint);
  const {
    complaint_source,
    customer_name,
    product_name,
    product_strength,
    batch_number,
    manufacturing_date,
    expiry_date,
    quantity_affected,
    quantity_unit,
    originating_site_block,
    npm,
    complaint_category,
    complaint_date,
    description,
    severity,
    priority,
    ai_summary,
    severity_suggested,
    suggested_next_action,
    initial_risk_assessment,
    formStatus,
  } = state;

  const field = (name, value) =>
    dispatch(updateField({ field: name, value }));

  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      // 1. Check duplicate first if batch_number & product_name are present
      if (batch_number || product_name) {
        const dupRes = await checkDuplicate(batch_number, product_name);
        if (dupRes.data && dupRes.data.duplicate) {
          const duplicateMsg =
            dupRes.data.message ||
            `Duplicate complaint detected! Matching record found for Product '${product_name}' and Batch '${batch_number}'.`;
          
          setToast({
            title: 'Duplicate Complaint Detected',
            message: duplicateMsg,
            type: 'warning',
          });
          setIsSubmitting(false);
          return; // STOP! Do not commit duplicate
        }
      }

      // 2. If no duplicate, save complaint
      const res = await saveComplaint({
        complaint_source,
        customer_name,
        product_name,
        product_strength,
        batch_number,
        manufacturing_date,
        expiry_date,
        quantity_affected,
        quantity_unit,
        originating_site_block,
        impacted_npm: npm,           // Redux key 'npm' → DB column 'impacted_npm'
        complaint_type: complaint_category, // Redux key 'complaint_category' → DB column 'complaint_type'
        complaint_date,
        description,
        severity,
        priority,
        ai_summary,
        severity_suggested,
        suggested_next_action,
        initial_risk_assessment,
      });

      setToast({
        title: 'Committed Successfully',
        message: `Complaint #${res.data.id} has been saved to the QMS Ledger!`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        title: 'Commit Failed',
        message: err?.response?.data?.detail || 'Failed to commit complaint. Please check the backend connection.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white h-full overflow-y-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Customer Complaint</h1>
          <p className="text-sm text-gray-500 mt-1">API &amp; FDF Quality Assurance Module</p>
        </div>
        {formStatus === 'ready' ? (
          <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Ready to Commit
          </span>
        ) : (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap mt-1">
            Pending Triage
          </span>
        )}
      </div>

      {/* ── Section 1 ── */}
      <p className={sectionLabelClass}>1. Origin &amp; Customer Details</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Complaint Source</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={complaint_source}
            onChange={(e) => field('complaint_source', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Customer Name</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={customer_name}
            onChange={(e) => field('customer_name', e.target.value)}
          />
        </div>
      </div>

      {/* ── Section 2 ── */}
      <p className={sectionLabelClass}>2. Product &amp; Batch Identification</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Product Name (API/FDF)</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={product_name}
            onChange={(e) => field('product_name', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Product Strength / Grade</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={product_strength}
            onChange={(e) => field('product_strength', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Batch / Lot Number</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={batch_number}
            onChange={(e) => field('batch_number', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Affected Quantity</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={quantity_affected}
            onChange={(e) => field('quantity_affected', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Manufacturing Date</label>
          <input
            type="date"
            className={inputClass}
            value={manufacturing_date}
            onChange={(e) => field('manufacturing_date', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Expiry Date</label>
          <input
            type="date"
            className={inputClass}
            value={expiry_date}
            onChange={(e) => field('expiry_date', e.target.value)}
          />
        </div>
      </div>

      {/* ── Section 3 ── */}
      <p className={sectionLabelClass}>3. Facility &amp; Material Impact</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Originating Site Block</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={originating_site_block}
            onChange={(e) => field('originating_site_block', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Impacted Non-Product Materials (NPM)</label>
          <input
            className={inputClass}
            placeholder="e.g., Primary packaging..."
            value={npm}
            onChange={(e) => field('npm', e.target.value)}
          />
        </div>
      </div>

      {/* ── Section 4 ── */}
      <p className={sectionLabelClass}>4. Defect Analysis</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Complaint Category</label>
          <input
            className={inputClass}
            placeholder="Awaiting AI extraction..."
            value={complaint_category}
            onChange={(e) => field('complaint_category', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Complaint Description</label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="AI will synthesize the complaint into a formal QMS description..."
            value={description}
            onChange={(e) => field('description', e.target.value)}
          />
        </div>
      </div>

      {/* AI Risk Assessment Card */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 flex items-center justify-center text-[#5046e6]">
            <ShieldIcon className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-[#5046e6]">AI copilot risk assessment</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5046e6] mb-1">
              Severity (Suggested)
            </label>
            <input
              readOnly
              className="w-full bg-white border border-indigo-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none"
              placeholder="Awaiting AI..."
              value={severity_suggested}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5046e6] mb-1">
              Suggested Next Action
            </label>
            <input
              readOnly
              className="w-full bg-white border border-indigo-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none"
              placeholder="Awaiting AI..."
              value={suggested_next_action}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-[#5046e6] mb-1">
              Initial Risk Assessment
            </label>
            <input
              readOnly
              className="w-full bg-white border border-indigo-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none"
              placeholder="Awaiting AI..."
              value={initial_risk_assessment}
            />
          </div>
        </div>
      </div>

      {/* Completeness Checker */}
      <CompletenessChecker />

      {/* Toast Notification popping from top-right */}
      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer buttons */}
      <button
        onClick={handleCommit}
        disabled={isSubmitting}
        className="w-full bg-[#5046e6] hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-base py-4 rounded-xl mt-8 transition-colors"
      >
        {isSubmitting ? 'Checking & Committing...' : 'Commit to QMS Ledger'}
      </button>
      <div className="text-center mt-3 mb-4">
        <button
          onClick={() => dispatch(resetForm())}
          className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
        >
          Reset Form
        </button>
      </div>
    </div>
  );
};

// ─── Chat Message Components ───────────────────────────────────────────────────

const AiMessageBubble = ({ message }) => {
  const iconBg =
    message.type === 'greeting' ? 'bg-indigo-100' :
    message.type === 'response' ? 'bg-indigo-100' :
    'bg-indigo-100';

  const IconContent = () => {
    if (message.type === 'extracted' || message.type === 'response') {
      return <CheckIcon className="w-3.5 h-3.5 text-[#5046e6]" />;
    }
    return <LightningIcon className="w-3.5 h-3.5 text-[#5046e6]" />;
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <IconContent />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 max-w-[85%] leading-relaxed">
        {message.content}
      </div>
    </div>
  );
};

const UserMessageBubble = ({ message }) => {
  if (message.type === 'file') {
    return (
      <div className="flex justify-end">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 max-w-[85%]">
          <div className="bg-red-100 text-red-600 rounded p-1 flex-shrink-0">
            <FileIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm text-gray-800 font-medium">{message.content}</p>
            <p className="text-xs text-gray-500">PDF Document</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-[#5046e6] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[85%] leading-relaxed">
        {message.content}
      </div>
    </div>
  );
};

// ─── Right Panel — AI Copilot Chat ────────────────────────────────────────────

const RightPanel = () => {
  const dispatch = useDispatch();
  const { chatMessages, isProcessing } = useSelector((s) => s.complaint);
  const formState = useSelector((s) => s.complaint);

  const [inputText, setInputText] = useState('');
  // progress: 0 = hidden, 1-99 = in-progress, 100 = done
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Fake progress animation ───────────────────────────────────────────────
  const startFakeProgress = () => {
    setProgress(10);
    setProgressStatus('Reading document...');
    let current = 10;
    const statuses = [
      { at: 25, text: 'Analyzing document content...' },
      { at: 45, text: 'Extracting complaint fields...' },
      { at: 65, text: 'Running risk assessment...' },
      { at: 80, text: 'Generating AI summary...' },
      { at: 90, text: 'Finalizing extraction...' },
    ];
    progressTimerRef.current = setInterval(() => {
      current = Math.min(current + 4, 90);
      setProgress(current);
      const match = [...statuses].reverse().find((s) => current >= s.at);
      if (match) setProgressStatus(match.text);
    }, 200); // steps every 200ms → reaches 90 in ~2s
  };

  const finishProgress = () => {
    clearInterval(progressTimerRef.current);
    setProgress(100);
    setProgressStatus('Extraction complete!');
    setTimeout(() => {
      setProgress(0);
      setProgressStatus('');
    }, 1200);
  };

  const resetProgress = () => {
    clearInterval(progressTimerRef.current);
    setProgress(0);
    setProgressStatus('');
  };

  // ── Core file processor (shared by dropzone + file input) ─────────────────
  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      dispatch(
        addChatMessage({ id: Date.now(), role: 'user', type: 'file', content: file.name })
      );
      dispatch(setProcessing(true));
      startFakeProgress();

      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await extractComplaint(formData);
        const data = response.data;
        if (data) dispatch(updateAllFields(data));
        finishProgress();
        dispatch(
          addChatMessage({
            id: Date.now() + 1,
            role: 'ai',
            type: 'extracted',
            content:
              "Complaint parsed successfully. I've extracted the product details, mapped the batch information, and generated an initial risk assessment.",
          })
        );
      } catch {
        resetProgress();
        dispatch(
          addChatMessage({
            id: Date.now() + 1,
            role: 'ai',
            type: 'response',
            content: 'Failed to process the file. Please ensure the backend is running and try again.',
          })
        );
      } finally {
        dispatch(setProcessing(false));
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [dispatch]
  );

  // ── react-dropzone setup ──────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'message/rfc822': ['.eml'],
    },
    multiple: false,
    noClick: true,   // we handle clicks ourselves via paperclip
    noKeyboard: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) processFile(acceptedFiles[0]);
    },
  });

  // ── File input onChange (paperclip button) ────────────────────────────────
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

 // ── Chat send ─────────────────────────────────────────────────────────────
const handleSend = async () => {
  const text = inputText.trim();
  if (!text || isProcessing) return;

  setInputText('');
  dispatch(addChatMessage({ id: Date.now(), role: 'user', type: 'text', content: text }));
  dispatch(setProcessing(true));

  // ── DECISION: long text = full complaint paste → run /extract (fills form)
  //             short text = chat message → run /chat (may update individual fields)
  // 200 chars is a safe threshold: complaint emails are always much longer,
  // edit commands like "change quantity to 500" are always much shorter.
  const isComplaintPaste = text.length > 200;

  if (isComplaintPaste) {
    // ── Route to /extract (same path as file upload) ──────────────────────
    startFakeProgress();
    try {
      const formData = new FormData();
      formData.append('text', text);                   // backend accepts text= OR file=
      const response = await extractComplaint(formData);
      const data = response.data;
      if (data) dispatch(updateAllFields(data));
      finishProgress();
      dispatch(
        addChatMessage({
          id: Date.now() + 1,
          role: 'ai',
          type: 'extracted',
          content:
            "Complaint processed. I've extracted the fields and filled in the form. Review everything on the left — tell me if anything needs changing.",
        })
      );
    } catch {
      resetProgress();
      dispatch(
        addChatMessage({
          id: Date.now() + 1,
          role: 'ai',
          type: 'response',
          content: 'Failed to process the complaint text. Please check the backend and try again.',
        })
      );
    } finally {
      dispatch(setProcessing(false));
    }

  } else {
    // ── Route to /chat (edit intent or question) ──────────────────────────
    try {
      const context = {
        complaint_source: formState.complaint_source,
        customer_name: formState.customer_name,
        product_name: formState.product_name,
        product_strength: formState.product_strength,
        batch_number: formState.batch_number,
        manufacturing_date: formState.manufacturing_date,
        expiry_date: formState.expiry_date,
        quantity_affected: formState.quantity_affected,
        originating_site_block: formState.originating_site_block,
        npm: formState.npm,
        complaint_category: formState.complaint_category,
        description: formState.description,
      };

      const response = await chatMessage(text, context);
      const data = response.data;

      // ✅ FIX: check for field_updates (new backend shape) instead of extracted_fields
      if (data.is_field_update && data.field_updates && Object.keys(data.field_updates).length > 0) {
        Object.entries(data.field_updates).forEach(([fieldName, value]) => {
          dispatch(updateField({ field: fieldName, value }));
        });
      }

      dispatch(
        addChatMessage({
          id: Date.now() + 1,
          role: 'ai',
          // ✅ FIX: use is_field_update flag for bubble type, response for content
          type: data.is_field_update ? 'extracted' : 'response',
          content: data.response || 'Done.',
        })
      );
    } catch {
      dispatch(
        addChatMessage({
          id: Date.now() + 1,
          role: 'ai',
          type: 'response',
          content: 'I encountered an error connecting to the backend. Please check the server and try again.',
        })
      );
    } finally {
      dispatch(setProcessing(false));
    }
  }
};

  return (
    <div
      {...getRootProps()}
      className="bg-white h-full flex flex-col border-l border-gray-100 relative"
    >
      {/* react-dropzone hidden input (managed separately from paperclip input) */}
      <input {...getInputProps()} />

      {/* Drag-over overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-20 bg-indigo-50/90 border-2 border-dashed border-[#5046e6] rounded-none flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5046e6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[#5046e6]">Drop file to extract complaint</p>
          <p className="text-xs text-indigo-400">Supports PDF, DOCX, TXT, EML</p>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <LightningIcon className="w-3.5 h-3.5 text-[#5046e6]" />
            </div>
            <span className="text-base font-semibold text-gray-900">AIVOA Copilot</span>
            {/* BETA badge */}
            <span className="bg-indigo-100 text-[#5046e6] text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-9">Drop complaint files or paste text below.</p>
        </div>
        <div className="mt-1">
          {isProcessing ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          ) : (
            <span className="block w-2.5 h-2.5 rounded-full bg-green-400"></span>
          )}
        </div>
      </div>

      {/* Progress bar — shown only during file extraction */}
      {progress > 0 && (
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-indigo-50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[#5046e6]">{progressStatus}</span>
            <span className="text-xs font-semibold text-[#5046e6]">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5046e6] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatMessages.map((msg) =>
          msg.role === 'ai' ? (
            <AiMessageBubble key={msg.id} message={msg} />
          ) : (
            <UserMessageBubble key={msg.id} message={msg} />
          )
        )}

        {/* Processing indicator (typing dots) */}
        {isProcessing && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <LightningIcon className="w-3.5 h-3.5 text-[#5046e6]" />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400 max-w-[85%]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 bg-white focus-within:ring-2 focus-within:ring-[#5046e6]/30 focus-within:border-[#5046e6] transition">
          {/* Hidden file input for paperclip */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.eml"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title="Attach file (PDF, DOCX, TXT, EML)"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            className="flex-1 text-sm outline-none placeholder-gray-400 text-gray-800 bg-transparent"
            placeholder="Type a message or paste a complaint..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isProcessing || !inputText.trim()}
            className="bg-[#5046e6] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
        {/* Disclaimer */}
        <p className="text-center text-[10px] text-amber-500 mt-2 px-2">
          ⚠️ AI responses may contain errors. Please verify information.
        </p>
        <p className="text-center text-[10px] text-gray-400 mt-1 tracking-widest uppercase">
          Powered by LangGraph
        </p>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const MainPage = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Left: Complaint Form */}
        <div className="w-1/2 border-r border-gray-200 h-full">
          <LeftPanel />
        </div>
        {/* Right: AI Copilot */}
        <div className="w-1/2 h-full">
          <RightPanel />
        </div>
      </div>
    </div>
  );
};

export default MainPage;
