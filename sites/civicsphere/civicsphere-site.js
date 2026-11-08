/*
 * CivicSphere City Council: synthetic PRESENTATION content for the R6 UI build (fees, processing times, document lists,
 * contacts, opening hours, last-updated dates, account activity). Display only: the resolver never reads this file
 * (civicsphere-core/-content/-descriptions/-semantic and semantic-index.json are unchanged from RESOLVER6).
 * All names, numbers and addresses are fictional. Phone numbers use the UK range reserved for drama (01632 960xxx);
 * e-mail addresses use the reserved .example domain; the postcode area "CS" does not exist.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CivicSite = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const ORG = {
  name: 'CivicSphere City Council', short: 'CivicSphere',
  phone: '01632 960 100', relay: '18001 01632 960 100', email: 'contact@civicsphere.example',
  address: ['Civic Centre', '1 Harbour Square', 'CivicSphere', 'CS1 1AA'],
  hours: [['Monday, Tuesday, Thursday, Friday', '9am to 5pm'], ['Wednesday', '10am to 5pm'], ['Saturday and Sunday', 'Closed']],
  emergency: '01632 960 999 (out of hours, urgent housing and highway emergencies only)'
};
const DOMAIN_CONTACT = {
  'money-tax': ['Household Charges and Payments team', '01632 960 210', 'charges@civicsphere.example'],
  'benefits-support': ['Living Costs Support team', '01632 960 220', 'support@civicsphere.example'],
  'housing-property': ['Housing Services', '01632 960 230', 'housing@civicsphere.example'],
  'transport-vehicles': ['Parking and Transport Services', '01632 960 240', 'parking@civicsphere.example'],
  'planning-development': ['Planning and Building Control', '01632 960 250', 'planning@civicsphere.example'],
  'work-business': ['Business and Licensing', '01632 960 260', 'business@civicsphere.example'],
  'education-learning': ['Schools and Learning', '01632 960 270', 'learning@civicsphere.example'],
  'health-care': ['Adult Care and Wellbeing', '01632 960 280', 'care@civicsphere.example'],
  'family-community': ['Family and Community Services', '01632 960 290', 'community@civicsphere.example'],
  'environment-utilities': ['Waste and Environment', '01632 960 310', 'environment@civicsphere.example'],
  'identity-records': ['Register Office and Records', '01632 960 320', 'records@civicsphere.example'],
  'safety-legal-civic': ['Customer Feedback and Civic Services', '01632 960 330', 'feedback@civicsphere.example'],
  'my-civicsphere': ['Online Account Support', '01632 960 340', 'account@civicsphere.example']
};
// Hand-written facts for the hand-built services (the rest are generated deterministically below).
const FACTS = {
  'residential-parking': { fee: 'From £24 a year', time: 'Usually 5 working days', fees: [["Residents' permit, first vehicle, 12 months", '£48.00'], ["Residents' permit, first vehicle, 6 months", '£28.00'], ['Second vehicle at the same address, 12 months', '£96.00'], ['Low-emission vehicle, 12 months', '£24.00'], ['Replacement for a lost permit', '£10.00']],
    who: ['you live at an address inside a controlled parking zone', 'the vehicle is registered to you at that address, or is a company or lease car you use', 'the vehicle is under 3.5 tonnes'],
    need: ['the vehicle registration number', 'proof of address dated in the last 3 months, such as a tenancy agreement or household charge bill', 'the vehicle logbook, or a letter from your employer or lease company', 'a debit or credit card to pay'] },
  'visitor-parking': { fee: '£1.50 a day', time: 'Virtual permits are active straight away', fees: [['Visitor day permit', '£1.50'], ['Book of 10 visitor day permits', '£14.00'], ['Carer permit (12 months, for regular care visits)', 'Free']],
    who: ['you hold a residents\' permit, or live in a controlled parking zone', 'your visitor is parking at your address'], need: ['your residents\' account or permit number', 'your visitor\'s vehicle registration', 'the dates of the visit'] },
  'vehicle-registration': { fee: '£55 registration fee', time: '10 working days', fees: [['Register a vehicle', '£55.00'], ['Annual local vehicle charge (standard)', '£40.00'], ['Annual local vehicle charge (low emission)', '£0.00'], ['Replacement registration certificate', '£25.00']],
    who: ['you are the registered keeper', 'the vehicle is kept at an address in CivicSphere'], need: ['proof of purchase or the new keeper slip', 'photo ID', 'proof of address', 'the vehicle identification number (VIN)'] },
  'development-approval': { fee: '£240 for a householder application', time: 'Decision within 8 weeks', fees: [['Householder application (extensions, loft conversions)', '£240.00'], ['Lawful development certificate', '£120.00'], ['Pre-application advice meeting', '£95.00'], ['Discharge of a condition', '£40.00']],
    who: ['you own the property, or have the owner\'s written consent', 'the work is at a property in CivicSphere'], need: ['a site location plan', 'existing and proposed drawings', 'a short description of the work and materials', 'the application fee'] },
  'identity-replacement': { fee: '£42 standard, £85 fast track', time: '15 working days (fast track 3 working days)', fees: [['Standard replacement', '£42.00'], ['Fast-track replacement', '£85.00'], ['Replacement for a document stolen in a reported crime', '£0.00']],
    who: ['your document was lost, stolen, damaged or has expired', 'you are the document holder, or a parent or guardian applying for a child'], need: ['a recent digital photo', 'your old document, if you still have it', 'a crime reference number if it was stolen', 'two pieces of proof of identity and address'] },
  'birth-certificate': { fee: '£12.50 per certificate', time: '10 working days (priority 2 working days)', fees: [['Certified copy (standard)', '£12.50'], ['Certified copy (priority)', '£38.00'], ['Additional copy ordered at the same time', '£10.00']],
    who: ['anyone can order a copy of a birth registered in CivicSphere'], need: ['full name at birth', 'date and place of birth', 'both parents\' names, if known', 'your delivery address'] },
  'address-change': { fee: 'Free', time: 'Records updated within 5 working days', fees: [['Updating your address', 'Free']], who: ['you have moved into, out of or within CivicSphere'], need: ['your new address and moving date', 'your household charge account number', 'any permit or account references you want updated'] },
  'formal-complaint': { fee: 'Free', time: 'Acknowledged in 3 working days, full reply within 20 working days', fees: [['Making a complaint', 'Free']], who: ['you have used a council service, or are acting for someone who has'], need: ['what happened and when', 'any reference numbers', 'what you would like us to do to put things right'] },
  'large-item-collection': { fee: '£25 for up to 3 items', time: 'Next available slot, usually within 10 working days', fees: [['Up to 3 items', '£25.00'], ['Each additional item (up to 8)', '£8.00'], ['Fridge or freezer (each)', '£18.00'], ['Concession rate (up to 3 items)', '£12.50']],
    who: ['you live in a home in CivicSphere (not for business waste)'], need: ['a list of the items', 'where the items will be left for collection', 'a debit or credit card to pay'] },
  'household-tax-assistance': { fee: 'Free', time: 'Decision within 15 working days', fees: [['Applying for payment support', 'Free']], who: ['you are liable for the household charge at your home', 'you are finding it hard to pay, or are on a low income'], need: ['your household charge account number', 'proof of income for everyone in the household, such as payslips or a benefit letter', 'details of your regular outgoings'] },
  'financial-support': { fee: 'Free', time: 'Urgent requests within 2 working days, others within 10', fees: [['Applying for support', 'Free']], who: ['you live in CivicSphere', 'you are on a low income or have had a sudden drop in income'], need: ['proof of income and any benefits', 'recent bank statements (last 1 month)', 'your tenancy agreement or mortgage statement'] },
  'money-tax-household-charge-payment': { fee: 'Depends on your property band', time: 'Payments show on your account within 3 working days', fees: [['Band A (yearly)', '£1,128.40'], ['Band B (yearly)', '£1,316.47'], ['Band C (yearly)', '£1,504.53'], ['Band D (yearly)', '£1,692.60'], ['Single-occupier discount', '25% off']],
    who: ['you are the resident or owner liable for the household charge'], need: ['your 9-digit household charge account number (on your bill)', 'a debit card, or your bank details for Direct Debit'] },
  'housing-property-housing-repairs': { fee: 'Free to report', time: 'Emergency repairs within 24 hours, routine repairs within 20 working days', fees: [['Reporting a repair', 'Free']], who: ['you are a council tenant, or a private tenant whose landlord has not acted'], need: ['your address and tenancy reference', 'a description and photos of the problem', 'times when someone can let a contractor in'] }
};
const TYPE_TIME = { application: 'Decision within 6 weeks', transaction: 'Usually 5 working days', booking: 'Next available slot within 10 working days', record_request: '10 working days', update: 'Within 5 working days', complaint: 'Full reply within 20 working days', information: null, account: null, saved_application: null };
const TYPE_NEED = { application: ['proof of identity', 'proof of address dated in the last 3 months', 'any reference numbers from previous letters'], transaction: ['your account or reference number', 'a debit or credit card'], information: [] };
const DOMAIN_NEED = { 'money-tax': 'your household charge account number', 'benefits-support': 'proof of income for your household', 'housing-property': 'your tenancy or property reference', 'transport-vehicles': 'the vehicle registration number', 'planning-development': 'a site plan or the planning reference', 'work-business': 'your business name and address', 'education-learning': "the child's or learner's full name and date of birth", 'health-care': "details of the person who needs support", 'family-community': 'details of the group, event or family involved', 'environment-utilities': 'the exact location, such as a street name and nearest house number or landmark', 'identity-records': 'full names and dates as they appear on the record', 'safety-legal-civic': 'the date and reference of the decision or incident' };
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function lastUpdated(id) { const h = hash(id), m = 5 + (h % 4), d = 1 + (Math.floor(h / 7) % 28); return `${d} ${MONTHS[m]} 2026`; }
const money = n => '£' + n.toFixed(2);
function hasIntent(s, k) { return s.sections.some(x => (x.intents || []).includes(k)); }
// Facts for any service: { fee, time, fees:[[item, price]], who:[...], need:[...] }
function facts(s) {
  const base = FACTS[s.id] || FACTS[s.duplicateOf];
  if (base) return base;
  const h = hash(s.id), paid = hasIntent(s, 'cost');
  let fees, fee;
  if (paid) { const a = 15 + (h % 30) * 5, b = Math.round(a * 0.5 * 100) / 100; fees = [['Standard fee', money(a)], ['Concession (on a low income, or aged 66 and over)', money(b)], ['Late or urgent request', money(a + 20)]]; fee = money(a) + ' (concessions available)'; }
  else if (s.type === 'information') { fees = null; fee = null; }
  else { fees = [['This service', 'Free']]; fee = 'Free'; }
  const who = s.type === 'information' ? ['anyone living, working or studying in CivicSphere'] : ['you live in CivicSphere, or the request is about a property or activity in CivicSphere', 'you are the person concerned, or have their permission to act for them'];
  const need = [DOMAIN_NEED[s.domain], ...(TYPE_NEED[s.type] || TYPE_NEED.application)].filter(Boolean);
  return { fee, time: TYPE_TIME[s.type] || null, fees, who, need };
}
function contact(domain) { const c = DOMAIN_CONTACT[domain] || DOMAIN_CONTACT['safety-legal-civic']; return { team: c[0], phone: c[1], email: c[2] }; }
// Top tasks on the homepage (all are real catalogue destinations).
const TOP_TASKS = [
  ['money-tax-household-charge-payment', 'Pay your household charge'], ['residential-parking', "Apply for a residents' parking permit"],
  ['large-item-collection', 'Book a bulky item collection'], ['housing-property-housing-repairs', 'Report a repair in your home'],
  ['identity-replacement', 'Replace a lost or damaged document'], ['financial-support', 'Get help with living costs'],
  ['planning-development-planning-applications', 'View or comment on planning applications'], ['formal-complaint', 'Make a complaint']
];
// Synthetic account activity for the test account (Alex Morgan); no real personal data.
const ACCOUNT = {
  name: 'Alex Morgan', ref: 'CS-ACC-104 772', address: '18 Cedar Way, CivicSphere CS4 2BD',
  activity: [
    ['8 October 2026', 'Residential Parking Application saved (step 3 of 4)', '#service/saved-residential-parking-application'],
    ['1 October 2026', 'Household charge instalment received: £126.00', '#service/money-tax-household-charge-payment'],
    ['24 September 2026', 'Bulky item collection completed (ref BW-55120)', '#service/large-item-collection'],
    ['12 September 2026', 'Contact telephone number updated', '#service/address-change'],
    ['30 August 2026', 'Garden waste subscription renewed: £45.00', '#domain/environment-utilities']
  ],
  upcoming: [['15 October 2026', 'Recycling and garden waste collection'], ['1 November 2026', 'Household charge instalment due: £126.00']]
};
return { ORG, contact, facts, lastUpdated, TOP_TASKS, ACCOUNT, hash };
});
