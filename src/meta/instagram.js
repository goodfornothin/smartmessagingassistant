const { loadKnowledge } = require('../knowledge/faq');

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getAccessToken() {
  return (
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.INSTAGRAM_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    ''
  );
}

function getIgUserId() {
  return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_USER_ID || '';
}

async function graphRequest(pathname, { method = 'GET', query = {}, body } = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Missing META_PAGE_ACCESS_TOKEN / INSTAGRAM_ACCESS_TOKEN');
  }

  const url = new URL(`${GRAPH_BASE}${pathname}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || res.statusText;
    const err = new Error(`Meta API error: ${message}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * Send an Instagram DM. Recipient must have messaged you first (API rule).
 * @param {{ recipientId: string, text: string, useHumanAgentTag?: boolean }} opts
 */
async function sendTextMessage({ recipientId, text, useHumanAgentTag = false }) {
  const igUserId = getIgUserId();
  if (!igUserId) {
    throw new Error('Missing INSTAGRAM_BUSINESS_ACCOUNT_ID');
  }

  const payload = {
    recipient: { id: recipientId },
    message: { text },
  };

  // HUMAN_AGENT is for real human-approved replies within 7 days — never for blind automation
  if (useHumanAgentTag) {
    payload.tag = 'HUMAN_AGENT';
    payload.messaging_type = 'MESSAGE_TAG';
  }

  return graphRequest(`/${igUserId}/messages`, {
    method: 'POST',
    body: payload,
  });
}

/**
 * Fetch recent conversations (Instagram Messaging Conversations API).
 * Useful for "who have we not responded to" when webhook store is cold.
 */
async function listConversations({ limit = 25 } = {}) {
  const igUserId = getIgUserId();
  if (!igUserId) {
    throw new Error('Missing INSTAGRAM_BUSINESS_ACCOUNT_ID');
  }

  return graphRequest(`/${igUserId}/conversations`, {
    query: {
      platform: 'instagram',
      fields: 'id,updated_time,participants,messages{id,message,from,to,created_time}',
      limit,
    },
  });
}

/**
 * Best-effort profile fields (may be limited by permissions / privacy).
 */
async function getUserProfile(igscidOrUserId) {
  try {
    return await graphRequest(`/${igscidOrUserId}`, {
      query: { fields: 'name,username,profile_pic' },
    });
  } catch (err) {
    console.warn('[meta] profile lookup failed:', err.message);
    return null;
  }
}

function assertCanAutomateSend() {
  const limits = loadKnowledge().limits;
  return limits;
}

module.exports = {
  sendTextMessage,
  listConversations,
  getUserProfile,
  getAccessToken,
  getIgUserId,
  assertCanAutomateSend,
  graphRequest,
};
