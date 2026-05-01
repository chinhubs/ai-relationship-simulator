const API_BASE = CONFIG.API_BASE;

async function apiCall(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

const API = {
  // Characters
  createCharacter: (data) => apiCall("POST", "/avatars", data),
  listCharacters:  ()     => apiCall("GET",  "/avatars"),
  getCharacter:    (id)   => apiCall("GET",  `/avatars/${id}`),
  updateCharacter: (id, data) => apiCall("PATCH", `/avatars/${id}`, data),
  deleteCharacter: (id)       => apiCall("DELETE", `/avatars/${id}`),

  // Questionnaire
  getQuestionnaire: (id, level = 2) => apiCall("GET", `/avatars/${id}/questionnaire?level=${level}`),
  submitQuestionnaire: (id, data)   => apiCall("POST", `/avatars/${id}/questionnaire`, data),
  getPersona: (id)                  => apiCall("GET",  `/avatars/${id}/persona`),

  // Simulation
  controlSim: (character_id, action) => apiCall("POST", "/simulation/control", { character_id, action }),
  runTick:    (id, relatedId = null) => apiCall("POST", `/simulation/${id}/tick${relatedId ? `?related_character_id=${relatedId}` : ""}`),
  getState:   (id)                   => apiCall("GET",  `/simulation/${id}/state`),
  getTicks:   (id, limit = 20)       => apiCall("GET",  `/simulation/${id}/ticks?limit=${limit}`),
  getEmotionHistory: (id, limit = 48) => apiCall("GET", `/simulation/${id}/emotions/history?limit=${limit}`),
  getMemories: (id, layer = null)    => apiCall("GET",  `/simulation/${id}/memories${layer ? `?layer=${layer}` : ""}`),
  generateDiary: (id)                => apiCall("POST", `/simulation/${id}/diary`),
  getDiary: (id)                     => apiCall("GET",  `/simulation/${id}/diary`),

  // Events
  injectEvent:  (data)  => apiCall("POST",   "/events", data),
  listEvents:   (id)    => apiCall("GET",    `/events/${id}`),
  cancelEvent:  (id)    => apiCall("DELETE", `/events/${id}`),

  // Feedback
  submitFeedback:     (data) => apiCall("POST",  "/feedback", data),
  listFeedback:       (id)   => apiCall("GET",   `/feedback/${id}`),
  deleteFeedback:     (id)   => apiCall("DELETE",`/feedback/${id}`),
  recalibrate:        (id)   => apiCall("POST",  `/feedback/${id}/recalibrate`),

  // Relationships
  getRelationship: (a, b) => apiCall("GET", `/relationships/${a}/${b}`),
  listRelationships: (id) => apiCall("GET", `/relationships/${id}`),
};
