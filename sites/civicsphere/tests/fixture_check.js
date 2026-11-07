// Shared expectation checker for the core and browser harnesses.
// r: {decision, destinationId, sectionIndex, sectionId, reason, options:[ids]}
module.exports = function check(f, r, C) {
  const problems = [];
  const okDecisions = [f.expectedDecision, ...(f.acceptableDecisions || [])];
  if (!okDecisions.includes(r.decision)) problems.push(`decision ${r.decision} (expected ${okDecisions.join('/usher-demonstrator/sites/civicsphere/')})`);
  if ((f.forbiddenDestinationIds || []).includes(r.destinationId)) problems.push(`forbidden destination ${r.destinationId}`);
  if (r.decision === 'navigate' && f.expectedDecision === 'navigate') {
    const okDest = [f.expectedDestinationId, ...(f.acceptableDestinationIds || [])];
    if (!okDest.includes(r.destinationId)) problems.push(`destination ${r.destinationId} (expected ${okDest.join('/usher-demonstrator/sites/civicsphere/')})`);
    else if (!f.anySection) {
      const okSec = [f.expectedSectionId ?? null, ...(f.acceptableSectionIds || [])];
      if (!okSec.includes(r.sectionId ?? null)) problems.push(`section ${r.sectionId} (expected ${okSec.join('/usher-demonstrator/sites/civicsphere/')})`);
    }
    if (C) { const v = C.validateDestination(r.destinationId, r.sectionIndex ?? null); if (!v.ok) problems.push('invalid destination: ' + v.error); }
  }
  if (f.expectedClarifyReason && r.decision === 'clarify' && r.reason !== f.expectedClarifyReason) problems.push(`clarify reason ${r.reason} (expected ${f.expectedClarifyReason})`);
  if (r.decision === 'clarify' && (r.options || []).length > 3) problems.push('more than 3 options');
  return problems;
};
