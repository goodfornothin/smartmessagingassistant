const knowledge = require('../../knowledge/rogue-bachata.json');

function loadKnowledge() {
  return knowledge;
}

/**
 * Simple keyword FAQ matcher for inbound DMs.
 * @param {string} text
 * @returns {{ id: string, answer: string, score: number } | null}
 */
function matchFaq(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s£]/g, ' ');

  if (!normalized.trim()) return null;

  let best = null;
  for (const faq of knowledge.faqs) {
    let score = 0;
    for (const keyword of faq.questions) {
      if (normalized.includes(String(keyword).toLowerCase())) {
        score += keyword.length > 4 ? 2 : 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: faq.id, answer: faq.answer, score };
    }
  }

  return best;
}

function getOffer(offerId) {
  return knowledge.offers.find((o) => o.id === offerId) || null;
}

function listOffers() {
  return knowledge.offers;
}

/**
 * @param {string} templateKey
 * @param {{ firstName?: string, body?: string, offer?: string, cta?: string, link?: string }} vars
 */
function renderTemplate(templateKey, vars = {}) {
  const template = knowledge.messageTemplates[templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  const namePart = vars.firstName ? ` ${vars.firstName}` : '';
  return template
    .replaceAll('{{namePart}}', namePart)
    .replaceAll('{{body}}', vars.body || '')
    .replaceAll('{{offer}}', vars.offer || '')
    .replaceAll('{{cta}}', vars.cta || '')
    .replaceAll('{{link}}', vars.link || '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  loadKnowledge,
  matchFaq,
  getOffer,
  listOffers,
  renderTemplate,
};
