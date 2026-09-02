/* ==========================================================================
   ManakMitra — Shared Data Layer
   Central source of truth + localStorage persistence.
   All pages read/write this same store so data flows across the app.
   ========================================================================== */

(function (global) {
  'use strict';

  var STORE_KEY = 'manakmitra_state';

  /* ----------------------------- Seed data ----------------------------- */
  function seed() {
    return {
      dark: false,

      /* Standards catalog */
      standards: [
        { id: 'is1293', title: 'IS 1293:2019', industry: 'electronics', status: 'current', category: 'safety', description: 'Plugs and Socket-Outlets of Rated Voltage up to and including 250 Volts and Rated Current up to and including 16 Amperes.', supersededBy: null, bookmarked: true, inRoadmap: true },
        { id: 'is13252p1', title: 'IS 13252 (Part 1)', industry: 'electronics', status: 'current', category: 'safety', description: 'Safety of Information Technology Equipment including Electrical Business Equipment. Specifies requirements for general safety, protection against electric shock, and physical hazards.', supersededBy: null, bookmarked: false, inRoadmap: true },
        { id: 'is16333p3', title: 'IS 16333 (Part 3)', industry: 'electronics', status: 'under_review', category: 'performance', description: 'Mobile Phone Handsets Requirement for Indian Language Support. Details specific requirements for displaying and inputting text in various regional languages.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is16046p2', title: 'IS 16046 (Part 2)', industry: 'electronics', status: 'current', category: 'performance', description: 'Secondary Cells and Batteries containing Alkaline or other non-acid Electrolytes. Safety requirements for portable sealed secondary lithium cells.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is302p1', title: 'IS 302 (Part 1)', industry: 'electronics', status: 'withdrawn', category: 'safety', description: 'Safety of household and similar electrical appliances. This standard has been superseded by updated safety regulations.', supersededBy: 'IS 302-1:2020', bookmarked: false, inRoadmap: false },
        { id: 'is16064', title: 'IS 16064', industry: 'automotive', status: 'current', category: 'testing_methods', description: 'Performance and safety requirements for electrically operated automotive vehicles, including battery systems.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is12169', title: 'IS 12169', industry: 'chemicals', status: 'current', category: 'performance', description: 'Specifications for plastic materials used in electrical and electronic equipment (flame retardant grades).', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is1387', title: 'IS 1387', industry: 'textiles', status: 'current', category: 'safety', description: 'Textile fabrics — Flammability and fire safety requirements for domestic garments.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is11925', title: 'IS 11925', industry: 'electronics', status: 'current', category: 'safety', description: 'Fire safety of data / server rooms and critical power installations.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'is3400', title: 'IS 3400', industry: 'textiles', status: 'under_review', category: 'testing_methods', description: 'Methods of test for textile materials — mechanical and physical properties.', supersededBy: null, bookmarked: false, inRoadmap: false },
        { id: 'iec60884', title: 'IEC 60884-1', industry: 'electronics', status: 'current', category: 'safety', description: 'Plugs and socket-outlets for household and similar purposes — General requirements (international reference).', supersededBy: null, bookmarked: false, inRoadmap: true }
      ],

      /* Laboratory catalog */
      labs: [
        { id: 'nth', name: 'National Test House (NR)', location: 'Ghaziabad, Uttar Pradesh', match: 98, tags: ['IS 13252(Part 1)', 'Safety Testing', 'EMI/EMC'], standards: ['is13252p1'], tests: ['EMI/EMC', 'Safety Testing'], top: 40, left: 60 },
        { id: 'ertl', name: 'Electronics Regional Test Laboratory', location: 'Okhla Industrial Area, New Delhi', match: 94, tags: ['IS 13252(Part 1)', 'IT Equipment'], standards: ['is13252p1'], tests: ['IT Equipment'], top: 55, left: 45 },
        { id: 'tuv', name: 'TUV SUD South Asia Pvt. Ltd.', location: 'Gurugram, Haryana', match: 88, tags: ['Safety Testing', 'Environmental'], standards: ['is1293'], tests: ['Environmental', 'Safety Testing'], top: 70, left: 35 }
      ],

      /* Compliance roadmaps — first is the active IS 1293 plug roadmap */
      roadmaps: [
        {
          id: 'rm-plug',
          product: 'IS 1293 (Plugs and Socket-Outlets)',
          standardId: 'is1293',
          status: 'in_progress',
          progress: 68,
          classification: 'Plugs and Socket-Outlets of Rated Voltage up to and including 250 Volts and Rated Current up to and including 16 Amperes',
          createdAt: '2026-07-14',
          sources: [
            { type: 'Official QCO Document', title: 'Electrical Household Appliances (QCO) 2023', quote: 'All electrical plugs and socket-outlets manufactured, imported, or sold in India must conform to IS 1293:2019 and bear the Standard Mark under a license from BIS.', source: 'Gazette of India', updated: 'Oct 2023' }
          ],
          gapInsight: 'your product specifications do not clearly state the material flammability rating (Clause 14.1 of IS 1293). This is a mandatory check for QCO compliance. Please upload the specific material safety data sheet (MSDS).',
          steps: [
            { key: 'classification', title: 'Product Classification', status: 'completed', desc: '', action: 'View Classification Report' },
            { key: 'discovery', title: 'Standards Discovery', status: 'completed', desc: '' },
            { key: 'qco', title: 'QCO Check & Gap Analysis', status: 'in_progress', desc: '', progress: 68 },
            { key: 'testing', title: 'Testing & Lab Finding', status: 'locked', desc: '' },
            { key: 'certification', title: 'Certification Application', status: 'locked', desc: '' }
          ]
        }
      ],

      /* Chat threads */
      chats: [
        {
          id: 'chat-1',
          title: 'IS 1293 Plug Requirements',
          ts: 'Today, 10:42 AM',
          active: true,
          context: { entities: ['3-Pin Plug', '6A / 250V', 'Domestic Appliance'], standard: 'is1293', confidence: 95, citedDocs: [{ id: 'is1293', title: 'IS 1293:2019', note: 'Plugs and Socket-Outlets of Rated Voltage up to 250V.' }, { id: 'scheme1', title: 'Scheme-I Guidelines', note: 'Mandatory Certification Scheme procedures and fee structures.' }] },
          messages: [
            { role: 'ai', text: "Hello! I'm your BIS compliance assistant. I can help you analyze products against Indian Standards, find testing labs, or outline the CRS registration process.\n\nWhat product or standard are you looking to investigate today?" },
            { role: 'user', text: 'I need to know the specific testing requirements and applicable standard for a 3-pin power plug rated at 6A, 250V used for domestic appliances.' },
            { role: 'ai', text: 'Based on your description of a 3-pin power plug (6A, 250V) for domestic use, the applicable Indian Standard is <strong>IS 1293:2019</strong> (Plugs and Socket-Outlets of Rated Voltage up to and including 250 Volts and Rated Current up to and including 16 Amperes).\n\n<b>Key Testing Requirements under IS 1293:2019:</b><ul><li><strong>Dimensions and Interchangeability:</strong> Gauging tests to ensure pin dimensions and spacing meet exact specifications to prevent loose connections.</li><li><strong>Protection against Electric Shock:</strong> Testing to ensure live parts are not accessible when the plug is partially or fully inserted.</li><li><strong>Insulation Resistance &amp; Electric Strength:</strong> Withstand high voltage tests to ensure the insulating materials can handle voltage surges.</li><li><strong>Temperature Rise:</strong> Operating at maximum rated current to ensure the temperature of terminals and casing does not exceed safe limits.</li><li><strong>Mechanical Strength:</strong> Tumbling barrel tests and drop tests to verify durability against everyday impacts.</li></ul><div class="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2"><span class="material-symbols-outlined text-warning text-[18px]">warning</span><p class="text-body-sm text-on-surface">Note: This product falls under the Mandatory Certification Scheme (Scheme-I) of BIS. It must bear the ISI Mark before it can be sold in India.</p></div>' }
          ]
        },
        { id: 'chat-2', title: 'Smartwatch testing criteria', ts: 'Yesterday', active: false, context: { entities: ['Smartwatch', 'Wearable', 'Battery'], standard: null, confidence: null, citedDocs: [] }, messages: [{ role: 'ai', text: 'I can help you test a smartwatch. Please tell me whether it is intended for consumer or medical use, so I can shortlist the right Indian Standards.' }] },
        { id: 'chat-3', title: 'CRS Registration Process', ts: 'Oct 24, 2023', active: false, context: { entities: ['CRS', 'Registration'], standard: null, confidence: null, citedDocs: [] }, messages: [{ role: 'ai', text: 'The Compulsory Registration Scheme (CRS) requires manufacturers to register products covered under a QCO and self-certify against the applicable Indian Standard before import or sale in India.' }] },
        { id: 'chat-4', title: 'LED Bulb Labeling', ts: 'Oct 20, 2023', active: false, context: { entities: ['LED Bulb', 'Labeling'], standard: null, confidence: null, citedDocs: [] }, messages: [{ role: 'ai', text: 'LED bulb labeling must conform to the applicable Indian Standard and display key parameters such as input voltage, wattage, lumen output, and BIS certification mark where mandated.' }] }
      ],

      /* Product analyzer scan history */
      analyses: [
        { id: 'an-1', product: 'Smart Wi-Fi Router AC1200', industry: 'electronics', standard: 'IS 13252 (Part 1)', date: '2026-07-10' },
        { id: 'an-2', product: '3-Pin Power Plug 6A', industry: 'electronics', standard: 'IS 1293:2019', date: '2026-07-14' }
      ],

      activeRoadmapId: 'rm-plug',
      activeChatId: 'chat-1'
    };
  }

  /* --------------------------- Persistence API ------------------------- */
  function load() {
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      if (!raw) return seed();
      var parsed = JSON.parse(raw);
      // Merge with seed to tolerate schema additions
      var base = seed();
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) base[k] = parsed[k];
      }
      return base;
    } catch (e) {
      return seed();
    }
  }

  var state = load();
  var listeners = [];

  function applyExternal(raw) {
    var parsed = JSON.parse(raw);
    var base = seed();
    for (var k in parsed) {
      if (Object.prototype.hasOwnProperty.call(parsed, k)) base[k] = parsed[k];
    }
    // Replace state in place so existing get/mutate closures keep working.
    var keys = Object.keys(state);
    keys.forEach(function (k) { delete state[k]; });
    for (var n in base) if (Object.prototype.hasOwnProperty.call(base, n)) state[n] = base[n];
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable */ }
  }

  function get(key) {
    return state[key];
  }

  function set(key, value) {
    state[key] = value;
    save();
  }

  function mutate(fn) {
    fn(state);
    save();
  }

  function reset() {
    state = seed();
    save();
  }

  /* Subscribe to state changes from other tabs (cross-page live sync). */
  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return fn;
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { /* ignore subscriber errors */ }
    });
    global.dispatchEvent(new CustomEvent(STORE_KEY + '-changed'));
  }

  /* A tiny simulated API to demonstrate async loading / error handling.
     Pages can call Data.api(request) to exercise loading, empty and error states. */
  function api() {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(true); }, 450);
    });
  }

  var Data = {
    STORE_KEY: STORE_KEY,
    get: get,
    set: set,
    mutate: mutate,
    reset: reset,
    save: save,
    api: api,
    onChange: onChange,
    applyExternal: applyExternal
  };

  global.ManakData = Data;

  global.addEventListener('manaknitra-reset', function () { reset(); });

  /* Live sync: when another tab writes state, refresh in place and notify. */
  global.addEventListener('storage', function (e) {
    if (e.key !== STORE_KEY || e.newValue == null) return;
    applyExternal(e.newValue);
    notify();
  });
})(window);
