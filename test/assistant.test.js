const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { matchFaq, renderTemplate, getOffer } = require('../src/knowledge/faq');
const {
  draftUnrepliedReplies,
  draftOfferMessages,
  handleInboundMessage,
} = require('../src/assistant/service');
const store = require('../src/store/inbox');

describe('matchFaq', () => {
  it('matches pricing questions', () => {
    const hit = matchFaq('How much does the class cost?');
    assert.equal(hit.id, 'pricing');
    assert.match(hit.answer, /£10/);
  });

  it('matches schedule questions', () => {
    const hit = matchFaq('When is the Tuesday class in Clapham?');
    assert.equal(hit.id, 'schedule');
  });
});

describe('templates', () => {
  it('personalizes with first name', () => {
    const text = renderTemplate('offerSoft', {
      firstName: 'Maya',
      offer: 'Wednesday class £10',
      cta: 'Come join us',
      link: 'https://roguebachata.com',
    });
    assert.match(text, /Hi Maya/);
    assert.match(text, /Wednesday class/);
  });

  it('loads wednesday offer', () => {
    assert.equal(getOffer('wednesdays').id, 'wednesdays');
  });
});

describe('assistant drafts', () => {
  it('creates unreplied drafts from inbox store', async () => {
    await handleInboundMessage({
      senderId: 'user_test_1',
      recipientId: 'ig_biz',
      text: 'Do I need a partner?',
      messageId: 'm_test_1',
      timestamp: Date.now(),
    });

    const unreplied = store.listUnreplied({ limit: 10 });
    assert.ok(unreplied.some((c) => c.id === 'user_test_1'));

    const drafted = draftUnrepliedReplies({ limit: 10 });
    assert.ok(drafted.count >= 1);
    assert.ok(drafted.drafts.some((d) => d.recipientId === 'user_test_1'));
  });

  it('drafts offer messages only for recent inbound contacts', () => {
    const result = draftOfferMessages({ offerId: 'tuesdays', withinHours: 24 });
    assert.ok(result.count >= 1);
    assert.match(result.drafts[0].text, /Rogue Bachata|Cafe Sol|Tuesday/i);
  });
});
