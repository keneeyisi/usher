/*
 * CivicSphereNav RESOLVER4: natural-language destination descriptions.
 * Each entry describes what a page or section is FOR (everyday goals, situations and synonyms),
 * not lists of query phrasings. Embedded offline (tools/build_embeddings.mjs) into semantic-index.json.
 * SEMANTIC_ALIASES: generated placeholder pages whose meaning duplicates a hand-authored flagship page;
 * they stay browsable but are not routing targets (the flagship page is used instead).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CivicDescriptions = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const PAGES = {
  // Money & Tax
  'money-tax-household-charge-payment': ['Pay your household charge, the yearly council bill for your home, online, by card or by bank transfer.', 'Check how much household charge you owe for your property and make a payment towards the local tax on your home.'],
  'money-tax-household-charge-discounts': ['Single-person discount and other reductions on the household charge, for example if you live alone, are a student or have a disability.', 'Ways to lower the household charge bill depending on who lives in the property.'],
  'money-tax-tax-records': ['View your household charge account, past bills and the record of local tax you have paid.', 'Get a copy of an old household charge bill or statement for your property.'],
  'money-tax-payment-arrangements': ['Change how or when you pay the household charge, such as moving instalment dates or paying monthly instead of yearly.'],
  'money-tax-exemptions': ['Find out whether a property is exempt from the household charge altogether, for example homes left empty after a death or homes where only students live.'],
  'money-tax-annual-statements': ['Your yearly statement summarising the household charges billed and paid during the year.'],
  'money-tax-charge-appeals': ['Appeal against your household charge if you think the bill or the property valuation band is wrong.'],
  'money-tax-direct-debit': ['Set up, change or cancel a direct debit so your household charge is paid automatically from your bank account.'],
  'household-tax-assistance': ['Help for people who are struggling to pay their household charge or council bill and have fallen behind.', 'Payment assistance when the yearly local tax on your home has become unaffordable: reductions, payment breaks and spreading arrears.', 'Support when payments to the council for your home are too much because of low income, losing a job or debt.'],
  // Benefits & Support
  'financial-support': ['Financial support with everyday living costs such as food, energy and household bills when money is short.', 'Help if you have lost your job, had your income cut or cannot afford essentials.', 'Benefits and cost of living payments for people on a low income.'],
  'benefits-support-household-support': ['Help getting essential household items such as a bed, cooker, fridge or washing machine if you cannot afford to buy them.', 'A household support fund for furniture and white goods when setting up a home or in crisis.'],
  'benefits-support-emergency-assistance': ['Urgent crisis help when you have no money for food, heating or electricity right now, including food vouchers and emergency energy top-ups.', 'Same-day emergency support if you are in immediate hardship after a sudden loss of income, theft or disaster.'],
  'benefits-support-care-support-payment': ['A regular payment towards the extra costs of a disability or long-term illness.'],
  'benefits-support-eligibility-checker': ['Check which benefits and support payments you might be entitled to by answering a few questions.'],
  'benefits-support-support-applications': ['Track or manage a benefit or support application you have already made.'],
  'benefits-support-evidence-requirements': ['Which evidence and documents are accepted for benefit and support claims.'],
  'benefits-support-payment-information': ['Payment dates, amounts and changes to benefit or support payments you already receive.'],
  'benefits-support-appeals': ['Appeal a benefit or support decision if your claim was refused or the amount awarded is wrong.', 'Ask for a decision about your benefits to be looked at again when you disagree with it.'],
  'benefits-support-support-reviews': ['Scheduled reviews of support you already receive, and how to report a change in your circumstances.'],
  // Housing & Property
  'housing-property-housing-repairs': ['Repairs in rented homes: getting a landlord to fix broken heating, boilers, leaks, damp, mould, windows or electrics.', 'What to do when something in your rented flat or house is broken and needs repairing.', "Tenants' rights to repairs and what a landlord is responsible for maintaining."],
  'housing-property-rent-support': ['Help paying your rent if you are on a low income or behind with rent payments.'],
  'housing-property-property-records': ['Records about a property, such as ownership history, boundaries and official property details.'],
  'housing-property-tenancy-support': ['Advice on your rights as a tenant: eviction notices, deposits, tenancy agreements and disputes with a landlord.', 'Help if a landlord wants to end your tenancy or is harassing you.'],
  'housing-property-housing-applications': ['Apply for social housing or join the housing register to get a council or housing association home.'],
  'housing-property-neighbourhood-issues': ['Report problems with neighbours such as noise, antisocial behaviour or disputes.'],
  'housing-property-property-information': ["General information about a home's features, energy rating and nearby services."],
  'housing-property-housing-costs': ['Understanding the costs of housing such as service charges, ground rent and affordability.'],
  'housing-property-temporary-accommodation': ['Emergency and temporary housing if you are homeless, facing eviction or have nowhere safe to live.', 'Help if you are about to lose your home and need a place to stay.'],
  'housing-property-housing-appeals': ['Ask for a review of a housing decision, such as a housing register or homelessness decision.'],
  // Transport & Vehicles
  'residential-parking': ["A residents' parking permit so you can park your car on the street near your home.", 'Permission to park outside or close to your house in a controlled parking zone, including after moving to a new address.'],
  'visitor-parking': ['Parking permits for visitors, family, friends or tradespeople coming to your home.'],
  'vehicle-registration': ['Register a car, van or motorbike you have bought, or update the registered keeper details.', 'Vehicle registration and the yearly vehicle charges you owe for a car or motorcycle.'],
  'transport-vehicles-road-permits': ['Permits for using the road during works, such as skips, scaffolding or closing a road for building work.'],
  'transport-vehicles-public-transport': ['Local bus and train routes, timetables and public transport information.'],
  'transport-vehicles-road-services': ['Report potholes, damaged roads, broken streetlights and pavement problems.'],
  'transport-vehicles-vehicle-records': ["Records about a vehicle's history, previous keepers and registration documents."],
  'transport-vehicles-parking-charges': ['Charges for council car parks and pay-and-display bays, and how to pay or challenge a parking fine or penalty charge notice.'],
  'transport-vehicles-travel-support': ['Free or discounted travel passes for older people, disabled people and young people, such as a concessionary bus pass.', 'Help with the cost of getting around if you have a disability or are of pension age.'],
  'transport-vehicles-traffic-reports': ['Current roadworks, traffic disruption and road closures.'],
  // Planning & Development
  'development-approval': ['Find out whether you need planning permission or approval to build an extension, loft conversion, conservatory, garage or extra storey on your home.', 'Development approval before making your house bigger or altering a building.', 'Rules for building work on your property and how to get permission before work starts.'],
  'planning-development-planning-applications': ["Search, view and comment on planning applications in your area, including objecting to building plans nearby.", 'See what building work has been proposed near you and have your say.'],
  'planning-development-building-guidance': ['Building regulations guidance for safe construction, structural work and inspections.'],
  'planning-development-property-development': ['Guidance for developers on larger developments, new homes and commercial building projects.'],
  'planning-development-local-plans': ['The long-term local plan setting out where new homes, shops and roads will be built.'],
  'planning-development-planning-records': ['Records of past planning decisions for a property.'],
  'planning-development-development-fees': ['Fees charged for planning and development applications.'],
  'planning-development-application-guidance': ['Help preparing a planning application: drawings, forms and supporting documents.'],
  'planning-development-planning-appeals': ['Appeal against a refused planning application.'],
  'planning-development-neighbourhood-development': ['Community-led neighbourhood plans and local regeneration projects.'],
  // Work & Business
  'work-business-business-licence': ['Licences to run a business such as selling food or alcohol, street trading, market stalls, taxis or entertainment.', 'Apply for a trading licence before you start selling to the public.'],
  'work-business-trading-registration': ['Register a new business or food business with the council before you start trading.'],
  'work-business-employment-support': ['Help finding work, job training and support if you are unemployed.'],
  'work-business-business-rates': ['Business rates bills, payments and relief for commercial premises.'],
  'work-business-local-business-support': ['Grants, advice and support to start or grow a small business.'],
  'work-business-trading-standards': ['Consumer protection: report a trader who sold you faulty goods, scams, rogue traders or refused refunds.', 'Help with consumer rights problems with shops and businesses.'],
  'work-business-workplace-guidance': ['Health and safety at work and employment rights guidance for workers and employers.'],
  'work-business-business-records': ['Records about registered businesses and licences.'],
  'work-business-licensing-appeals': ['Appeal a decision to refuse or revoke a licence.'],
  'work-business-business-premises': ['Find or rent commercial premises and business units.'],
  // Education & Learning
  'education-learning-school-place': ['Apply for a school place for your child, starting primary or secondary school or moving schools.', 'School admissions and how to get a child into a local school.'],
  'education-learning-childcare-support': ['Help finding and paying for childcare, nurseries and free childcare hours for young children.'],
  'education-learning-adult-learning': ['Courses and classes for adults, including English language, maths and digital skills.', 'Learning opportunities for grown-ups returning to education.'],
  'education-learning-learning-accounts': ['Manage your learning account and course bookings.'],
  'education-learning-school-information': ['Term dates, school holidays, school closures and information about local schools.'],
  'education-learning-education-support': ['Support for children with special educational needs and disabilities at school.'],
  'education-learning-course-funding': ['Funding, grants and loans to help pay for courses and training.'],
  'education-learning-education-records': ['Request school records and exam certificates.'],
  'education-learning-admissions-appeals': ['Appeal if your child was not offered the school place you wanted.'],
  'education-learning-skills-development': ['Apprenticeships and vocational training to build job skills.'],
  // Health & Care
  'health-care-care-support': ['Care and support at home for older or disabled people, such as help with washing, dressing and meals.'],
  'health-care-health-access': ['How to access local health services, register with a doctor and find clinics.'],
  'health-care-wellbeing-services': ['Mental health and wellbeing support for stress, loneliness and healthy living.'],
  'health-care-care-assessment': ['Ask for a care needs assessment to find out what support an older or disabled person needs to live safely at home.', "Request an assessment when a relative's health or mobility means they need extra help day to day."],
  'health-care-support-planning': ['Planning the care you receive after an assessment, including personal budgets.'],
  'health-care-health-information': ['Local health information and public health advice.'],
  'health-care-care-charges': ['How much care services cost and financial assessments for care.'],
  'health-care-carer-support': ['Support for unpaid carers who look after a family member, including respite breaks, carer assessments and help with stress.', 'Help for parents and relatives caring for someone with a disability or illness.'],
  'health-care-care-records': ['Access records about the care you have received.'],
  'health-care-service-appeals': ['Appeal a decision about a care or health service.'],
  // Family & Community
  'family-community-community-events': ["What's on: local events, festivals and activities in your community."],
  'family-community-family-support': ['Support for families and parents, including parenting help and early help services.'],
  'family-community-community-groups': ['Find and join local community groups and clubs.'],
  'family-community-local-activities': ['Things to do locally: sports, leisure and activities for all ages.'],
  'family-community-family-records': ['Records relating to families, such as adoption and family history.'],
  'family-community-community-facilities': ['Book community halls, centres and facilities.'],
  'family-community-youth-services': ['Youth clubs and youth workers offering activities and support for young people aged 11 to 19.'],
  'family-community-volunteering': ['Volunteering opportunities in your community.'],
  'family-community-community-funding': ['Grants for community projects and voluntary groups.'],
  'family-community-event-permits': ['Permission to hold an event, such as a street party, festival or a road closure for a community celebration.'],
  // Environment & Utilities
  'environment-utilities-waste-recycling': ['Waste and recycling overview: what goes in which bin and where the recycling centres are.'],
  'environment-utilities-report-an-environmental-issue': ['Report fly-tipping, dumped rubbish, pollution or other environmental problems.'],
  'environment-utilities-collection-services': ['Household bin collections: collection days, missed bin collections and replacement or extra bins.', 'Report a missed bin or find out when your rubbish and recycling will be collected.'],
  'environment-utilities-recycling-guidance': ['Guidance on what can be recycled and how to sort recycling.'],
  'environment-utilities-utility-support': ['Advice about utilities in your home, such as water supply, energy efficiency and help with utility bills.'],
  'environment-utilities-climate-nature': ['Climate action, parks, trees and nature conservation.'],
  'environment-utilities-environmental-records': ['Environmental data and records, such as contaminated land and air quality.'],
  'environment-utilities-waste-charges': ['Charges for waste services such as garden waste subscriptions and extra bins.'],
  'environment-utilities-street-cleanliness': ['Street cleaning, litter, graffiti and keeping public spaces clean.'],
  'environment-utilities-environmental-appeals': ['Appeal environmental fines and enforcement decisions.'],
  'large-item-collection': ['Book a collection for bulky household items such as a sofa, mattress, fridge, freezer, wardrobe or bed.', 'Get rid of old furniture and large appliances that are too big for your bin.', 'The council can come and take away old beds, settees, mattresses and broken appliances from your home for a fee.'],
  // Identity & Records
  'identity-replacement': ['Replace an identity document that is lost, stolen, damaged or expired, such as a passport, ID card or driving licence.', 'Get a new identity document when yours can no longer be used.'],
  'birth-certificate': ['Order a copy of a birth certificate or birth record.'],
  'address-change': ['Tell the council you have moved house and update your address on your records.'],
  'identity-records-official-records': ['Request official records held by the council.'],
  'identity-records-identity-services': ['Prove your identity online to access council services and accounts.'],
  'identity-records-record-requests': ['Request the personal information the council holds about you.'],
  'identity-records-certificates': ['Copies of marriage, civil partnership and death certificates.'],
  'identity-records-personal-details': ['Update your personal details on council records, such as a change of name after marriage or divorce, or new contact details.'],
  'identity-records-record-corrections': ['Correct a mistake in an official record, such as a misspelled name or wrong date.'],
  'identity-records-identity-support': ['Help if your identity has been stolen or used fraudulently.'],
  // Safety, Legal & Civic Services
  'formal-complaint': ['Make a formal complaint about a council service, a member of staff or how you were treated.', 'Complain when something has gone wrong with a public service, follow its progress, or take it further.', 'Ask for your complaint to be looked at again, or appeal the outcome, if you disagree with how it was resolved.'],
  'safety-legal-civic-challenge-a-decision': ['Challenge a council decision you think is wrong or unfair and ask for it to be reconsidered.'],
  'safety-legal-civic-safety-reporting': ['Report a safety hazard such as a dangerous structure, an unsafe building or a risk to the public.'],
  'safety-legal-civic-civic-processes': ['Elections, voter registration and other civic processes.'],
  'safety-legal-civic-legal-information': ['Legal information about council powers and your legal rights.'],
  'safety-legal-civic-service-appeals': ['Appeal a decision about a council service.'],
  'safety-legal-civic-public-safety': ['Community safety, crime prevention and emergency planning.'],
  'safety-legal-civic-civic-requests': ['Freedom of information and other civic requests.'],
  'safety-legal-civic-complaint-review': ["Independent review of a complaint after the council's final response."],
  'safety-legal-civic-decision-records': ['Published records of council decisions and meetings.'],
  // My CivicSphere (synthetic account)
  'activity-in-progress': ['Applications you started but have not finished or submitted yet; continue a saved form.', 'Your in-progress applications and drafts in your account.'],
  'activity-submitted': ['Applications you have already submitted and their current status.'],
  'saved-residential-parking-application': ['Continue the residential parking permit application you started but did not finish.', 'Your saved parking permit application, ready to pick up where you stopped.']
};
const SECTIONS = {
  'household-tax-assistance': { 'eligibility': ['Who qualifies for help with household charges, based on income and circumstances.'], 'evidence': ['Evidence you need to provide, such as payslips, benefit letters and bank statements.'], 'support-options': ['What help is available with household charge arrears: payment plans, reductions and hardship relief.'], 'apply-for-support': ['How to apply for household payment assistance.'] },
  'financial-support': { 'what-support-is-available': ['The kinds of financial help available: grants, cost of living payments, and food and energy support.'], 'how-to-apply': ['How to apply for financial support and what happens after you apply.'], 'evidence-and-documents': ['Documents and proof of income needed for a financial support claim.'], 'payment-information': ['When and how financial support payments are paid into your account.'] },
  'housing-property-housing-repairs': { 'what-counts-as-a-repair': ['What counts as a repair, from broken fixtures to faults with heating, water or wiring.'], 'what-your-landlord-must-fix': ["Which repairs a landlord is legally responsible for, such as the structure, heating, hot water, gas, drains and electrics, and which are the tenant's job."], 'how-to-report-a-repair': ['How to report a repair to your landlord or housing provider, and what to include.'], 'if-repairs-are-not-done': ['What to do if a landlord ignores repair requests or does not respond, including asking the council to inspect and take action.'] },
  'residential-parking': { 'eligibility': ["Who can get a residents' parking permit, based on address and vehicle."], 'permit-requirements': ['What you need to apply for a parking permit, such as proof of address and vehicle details.'], 'permit-charges': ['How much a residential parking permit costs each year, what residents pay to park near their home, and the price of different permit lengths.'], 'how-to-apply': ["How to apply for a residents' parking permit online."] },
  'visitor-parking': { 'eligibility': ['Who can buy visitor permits for guests.'], 'visitor-permits': ['How to get and use visitor parking permits.'], 'charges': ['How much visitor parking permits cost.'] },
  'vehicle-registration': { 'who-can-register': ['Who can register a vehicle and be its registered keeper.'], 'information-required': ['Documents and vehicle details you need in order to register.'], 'registration-process': ['The step-by-step process to register a vehicle.'], 'fees-and-charges': ['The registration fee and annual vehicle charges you owe for a car, van or motorbike.'] },
  'development-approval': { 'do-i-need-approval': ['Whether your building project needs approval or is allowed without permission.'], 'application-types': ['The different types of development application.'], 'documents': ['Plans and documents to submit with a development application.'], 'fees': ['How much a development application costs.'], 'decision-process': ['How and when a decision on a development application is made.'] },
  'large-item-collection': { 'what-can-be-collected': ['Which large items can be collected.'], 'charges': ['How much the council charges to collect bulky items such as furniture or appliances, and any reduced rates.'], 'collection-slots': ['Available collection dates and times.'], 'how-to-request': ['How to book a large-item collection.'] },
  'identity-replacement': { 'who-can-apply': ['Who can apply for a replacement identity document.'], 'what-you-need': ['What information you need before applying for a replacement document.'], 'documents': ['Supporting documents needed to replace an identity document, such as photos and proof of identity.'], 'fees': ['How much it costs to replace an identity document.'], 'replacement-process': ['How the replacement process works and how to get a new one.'] },
  'formal-complaint': { 'before-you-complain': ['What you can complain about and what to try first.'], 'how-complaints-are-handled': ['How complaints are handled, timescales, and how to check progress on a complaint you made.'], 'submit-a-complaint': ['Submit a new complaint.'], 'not-happy-with-the-response': ['What to do if you are unhappy with the response to your complaint: ask for a review, appeal or escalate it.'] },
  'birth-certificate': { 'request-a-certificate': ['How to order a birth certificate.'] },
  'address-change': { 'records-affected': ['Which records are updated when you change address.'], 'update-process': ['How to update your address.'] },
  'activity-in-progress': { 'saved-applications': ['Saved applications you can continue.'], 'awaiting-your-action': ['Items waiting for you to act on them.'], 'recently-submitted': ['Applications you recently submitted.'] },
  'saved-residential-parking-application': { 'application-summary': ['Summary of the saved parking application.'], 'progress-so-far': ['Which steps of the saved application are complete.'], 'continue-where-you-left-off': ['Resume the saved application at the step where you stopped.'] }
};
// Template meanings for generic section labels ({t} = page title).
const SECTION_TEMPLATES = {
  'Overview': 'Overview of {t}: what it is and who it is for.', 'Eligibility': 'Who is eligible for {t} and the conditions that apply.',
  'What you need': 'What information or evidence you need before using {t}.', 'Requirements': 'Requirements and rules for {t}.',
  'Fees and charges': 'How much {t} costs: fees and charges.', 'Contact and support': 'Contact details and support for {t}.'
};

// RESOLVER6 enrichment: core services whose descriptions were thin (every page and section now has hand-written text).
Object.assign(PAGES, {
  'visitor-parking': ['Parking permits for visitors, family, friends or tradespeople coming to your home.', 'Short-term permits so guests, relatives or a builder can park in a residents-only zone while they are with you.'],
  'birth-certificate': ['Order a copy of a birth certificate or birth record.', 'An official certified copy of a birth registration, often needed for school, a new job, a marriage or proving age and nationality.'],
  'address-change': ['Tell the council you have moved house and update your address on your records.', 'Make sure council records, bills and accounts follow you when you move to a new home, in the same area or from elsewhere.'],
  'activity-submitted': ['Applications you have already submitted and their current status.', 'Track an application you sent: whether it has been received, is being processed or has been decided.'],
  'activity-in-progress': ['Applications you started but have not finished or submitted yet; continue a saved form.', 'Your in-progress applications and drafts in your account.', 'Return to an application you saved part-way through and continue from the step you reached.']
});
Object.assign(SECTIONS['birth-certificate'] = SECTIONS['birth-certificate'] || {}, {
  'eligibility': ['Who can order a copy of a birth certificate, including your own, your child\'s or a relative\'s.'],
  'what-you-need': ['Details needed to find the birth record, such as full name at birth, date and place of birth and parents\' names.'],
  'fees': ['How much a certified copy of a birth certificate costs, including the priority service.']
});
Object.assign(SECTIONS['address-change'] = SECTIONS['address-change'] || {}, {
  'before-you-start': ['What to have ready before updating your address, such as your moving date and account references.']
});
SECTIONS['activity-submitted'] = {
  'current-applications': ['Applications you have submitted that are still being processed, with their current status.'],
  'past-applications': ['Applications that have been decided or closed.']
};

// RESOLVER6 off-topic prototypes ("null class"): broad descriptions of requests a public-service navigator cannot help with.
// They are embedded like destinations but can never be navigated to; if the closest description to a goal is one of these
// (by a margin), the goal is rejected as unrelated. Written as category descriptions, not as example queries.
const OFFTOPIC = [
  'Creative writing: compose a poem, song lyrics, a short story, a speech or a joke.',
  'Cooking and baking: recipes, ingredients, cooking times and what to make for dinner.',
  'Eating out: recommending restaurants, cafés, pubs and takeaways, and booking a table.',
  'Entertainment: films, television series, music, celebrities, games and what to watch or listen to.',
  'Sport: match results, fixtures, kick-off times, league tables, players and betting odds.',
  'Holidays and travel abroad: flights, hotels, package holidays, sightseeing and destinations in other countries.',
  'Shopping and products: buying things online, product reviews, deals, prices of gadgets, clothes and gifts.',
  'General knowledge and trivia: history facts, geography, capital cities, science explanations and definitions.',
  'School work and puzzles: maths problems, equations, homework answers, essays and exam revision.',
  'World news and national or international politics: elections, governments and events in other countries.',
  'Technology support: fixing a laptop, phone, printer, wifi, apps, software errors and passwords for websites.',
  'Small talk with the assistant: greetings, how are you, who made you, tell me about yourself and your opinions.',
  'Jokes, riddles, fun facts and games to pass the time.',
  'Weather forecasts, horoscopes, lottery numbers and random facts.',
  'Personal finance products: stocks, cryptocurrency, investments, mortgages deals and comparing bank accounts.',
  'Relationships, dating and personal life advice unrelated to public services.'
];
const SEMANTIC_ALIASES = { 'money-tax-payment-difficulties': 'household-tax-assistance', 'money-tax-financial-support': 'financial-support', 'benefits-support-living-cost-support': 'financial-support' };
return { PAGES, SECTIONS, SECTION_TEMPLATES, SEMANTIC_ALIASES, OFFTOPIC };
});
