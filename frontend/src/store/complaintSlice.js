import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // --- Form fields (all start empty, AI will populate these) ---
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_number: '',
  manufacturing_date: '',
  expiry_date: '',
  quantity_affected: '',
  quantity_unit: 'kg',
  originating_site_block: '',
  impacted_npm: '',
  complaint_type: '',
  complaint_date: '',
  description: '',
  severity: '',
  priority: '',

  // --- AI Copilot Risk Assessment fields ---
  severity_suggested: '',
  suggested_next_action: '',
  initial_risk_assessment: '',
  ai_summary: '',

  // --- UI state (not saved to DB, just controls the interface) ---
  isExtracting: false,
  extractionProgress: 0,
  isSaving: false,
  savedId: null,
  chatMessages: [],
  completenessScore: 0,
  duplicateWarning: null,
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    // Update a single field — used when user edits a field manually
    updateField: (state, action) => {
      const { field, value } = action.payload
      state[field] = value
    },

    // Bulk update — used when AI extraction returns all fields at once
    updateAllFields: (state, action) => {
      const fields = action.payload
      Object.keys(fields).forEach((key) => {
        if (key in state && fields[key] !== null && fields[key] !== undefined) {
          state[key] = fields[key]
        }
      })
    },

    // Reset everything back to blank
    resetForm: () => initialState,

    // Toggle the extraction loading state
    setExtracting: (state, action) => {
      state.isExtracting = action.payload
    },

    // Update the progress bar (0 to 100)
    setProgress: (state, action) => {
      state.extractionProgress = action.payload
    },

    // Toggle save loading state
    setSaving: (state, action) => {
      state.isSaving = action.payload
    },

    // Store the ID returned after saving to DB
    setSavedId: (state, action) => {
      state.savedId = action.payload
    },

    // Add a message to the AI chat history
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload)
    },

    // Clear chat history
    clearChat: (state) => {
      state.chatMessages = []
    },

    // Set completeness score (0-100)
    setCompletenessScore: (state, action) => {
      state.completenessScore = action.payload
    },

    // Set or clear duplicate warning
    setDuplicateWarning: (state, action) => {
      state.duplicateWarning = action.payload
    },
  },
})

export const {
  updateField,
  updateAllFields,
  resetForm,
  setExtracting,
  setProgress,
  setSaving,
  setSavedId,
  addChatMessage,
  clearChat,
  setCompletenessScore,
  setDuplicateWarning,
} = complaintSlice.actions

export default complaintSlice.reducer