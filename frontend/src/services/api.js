import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

/**
 * Send a file (PDF/DOCX/TXT) or raw text to extract complaint fields.
 * @param {FormData} formData - Must include either a `file` field or a `text` field.
 * @returns {Promise<object>} Extracted complaint fields.
 */
export const extractComplaint = (formData) => {
  return api.post('/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Send a chat message to the AI copilot.
 * @param {string} message - The user's message.
 * @param {object} context - Current form state to give the AI context.
 * @returns {Promise<object>} AI reply with possible field updates.
 */
export const chatMessage = (message, context) => {
  return api.post('/chat', {
    message,
    complaint_context: JSON.stringify(context),
  });
};

/**
 * Save a finalized complaint to the QMS ledger.
 * @param {object} data - All complaint fields.
 * @returns {Promise<object>} The saved complaint record with ID.
 */
export const saveComplaint = (data) => {
  return api.post('/complaints', data);
};

/**
 * Fetch all complaints from the ledger.
 * @returns {Promise<Array>} List of complaint records.
 */
export const getComplaints = () => {
  return api.get('/complaints');
};

export default api;
