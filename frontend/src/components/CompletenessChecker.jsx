import React from 'react';
import { useSelector } from 'react-redux';

// ─── Field config ─────────────────────────────────────────────────────────────

const MANDATORY_FIELDS = [
  { key: 'customer_name',     label: 'Customer Name'   },
  { key: 'product_name',      label: 'Product Name'    },
  { key: 'batch_number',      label: 'Batch Number'    },
  { key: 'complaint_category', label: 'Complaint Type' }, // Redux key → human label
  { key: 'description',       label: 'Description'     },
  { key: 'severity',          label: 'Severity'        },
];

const TOTAL = MANDATORY_FIELDS.length; // 6

// ─── Color helpers ────────────────────────────────────────────────────────────

function getScoreColor(score) {
  if (score >= 84) return '#10B981'; // green
  if (score >= 50) return '#F59E0B'; // amber
  return '#EF4444';                  // red
}

// ─── CompletenessChecker ─────────────────────────────────────────────────────

const CompletenessChecker = () => {
  // Pull only the fields we need — no useEffect, derived on every render
  const {
    customer_name,
    product_name,
    batch_number,
    complaint_category,
    description,
    severity,
    formStatus,
  } = useSelector((s) => s.complaint);

  const values = { customer_name, product_name, batch_number, complaint_category, description, severity };

  // ── Hidden state: render nothing until extraction has run ──────────────────
  // formStatus transitions 'pending' → 'ready' when updateAllFields is dispatched
  // (i.e., the first time the AI fills the form)
  if (formStatus !== 'ready') return null;

  // ── Score computation (cheap, inline) ─────────────────────────────────────
  const filledCount = MANDATORY_FIELDS.filter(
    ({ key }) => typeof values[key] === 'string' && values[key].trim().length > 0
  ).length;

  const score = Math.round((filledCount / TOTAL) * 100);
  const color = getScoreColor(score);

  const missingFields = MANDATORY_FIELDS.filter(
    ({ key }) => !(typeof values[key] === 'string' && values[key].trim().length > 0)
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="completeness-checker"
      style={{
        padding: '16px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        background: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        marginTop: '20px',
      }}
    >
      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
          }}
        >
          Form Completeness
        </span>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {score}%
        </span>
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          height: '8px',
          borderRadius: '999px',
          background: '#F3F4F6',
          overflow: 'hidden',
        }}
      >
        <div
          id="completeness-bar-fill"
          style={{
            height: '100%',
            width: `${score}%`,
            borderRadius: '999px',
            background: color,
            transition: 'width 0.5s ease, background-color 0.5s ease',
          }}
        />
      </div>

      {/* ── Missing fields row ─────────────────────────────────────────────── */}
      {missingFields.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '10px',
            fontSize: '11.5px',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>⚠ Missing:</span>
          <span style={{ color: '#EF4444', fontWeight: 700 }}>
            {missingFields.map((f) => f.label).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default CompletenessChecker;
