import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength: '',
  batch_number: '',
  manufacturing_date: '',
  expiry_date: '',
  quantity_affected: '',
  quantity_unit: '',
  originating_site_block: '',
  npm: '',
  complaint_category: '',
  complaint_date: '',
  description: '',
  severity: '',
  priority: '',
  ai_summary: '',
  severity_suggested: '',
  suggested_next_action: '',
  initial_risk_assessment: '',
  formStatus: 'pending', // 'pending' | 'ready'
  chatMessages: [
    {
      id: 1,
      role: 'ai',
      type: 'greeting',
      content:
        'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.',
    },
  ],
  isProcessing: false,
};

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    updateAllFields: (state, action) => {
      return { ...state, ...action.payload, formStatus: 'ready' };
    },
    resetForm: () => initialState,
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload);
    },
    setProcessing: (state, action) => {
      state.isProcessing = action.payload;
    },
  },
});

export const { updateField, updateAllFields, resetForm, addChatMessage, setProcessing } =
  complaintSlice.actions;
export default complaintSlice.reducer;