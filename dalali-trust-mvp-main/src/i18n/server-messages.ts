import type { Locale } from ".";

/**
 * Swahili versions of messages produced on the server (validation and action results).
 * The English text stays the source of truth: anything not listed here is shown as is.
 * Administrator-only messages are deliberately left out (the admin area is English-only).
 */
const SW: Record<string, string> = {
  // General
  "Something went wrong. Please try again.": "Kuna tatizo limetokea. Tafadhali jaribu tena.",
  "Please correct the highlighted fields.": "Tafadhali rekebisha sehemu zilizowekwa alama.",
  "Please sign in to continue.": "Tafadhali ingia ili kuendelea.",
  "Please sign in again.": "Tafadhali ingia tena.",
  "Too many attempts. Please wait a few minutes and try again.":
    "Majaribio mengi mno. Tafadhali subiri dakika chache kisha ujaribu tena.",
  "Too many attempts. Please wait and try again.":
    "Majaribio mengi mno. Tafadhali subiri kisha ujaribu tena.",
  "Your account is not active. Please contact support.":
    "Akaunti yako haiko hai. Tafadhali wasiliana na huduma kwa wateja.",
  "Unknown action.": "Kitendo hakijulikani.",
  // Accounts
  "Enter your email and password.": "Weka barua pepe na nenosiri lako.",
  "Enter a valid email address.": "Weka barua pepe sahihi.",
  "Use at least 10 characters.": "Tumia angalau herufi 10.",
  "Use at least 10 characters": "Tumia angalau herufi 10",
  "Use at most 128 characters": "Tumia herufi zisizozidi 128",
  "Your current password is incorrect.": "Nenosiri lako la sasa si sahihi.",
  "Password changed. Other devices have been signed out.":
    "Nenosiri limebadilishwa. Vifaa vingine vimetolewa kwenye akaunti.",
  "You must accept the terms to continue": "Lazima ukubali masharti ili kuendelea",
  "Choose how you will use Estate": "Chagua jinsi utakavyotumia Estate",
  "We could not create an account with these details. If you already have an account, sign in or reset your password.":
    "Hatukuweza kufungua akaunti kwa taarifa hizi. Kama tayari una akaunti, ingia au weka upya nenosiri lako.",
  "Type your email address exactly to confirm.": "Andika barua pepe yako kama ilivyo ili kuthibitisha.",
  "Profile saved.": "Wasifu umehifadhiwa.",
  "Public profile saved.": "Wasifu wa umma umehifadhiwa.",
  "Enter a Tanzanian mobile number, e.g. 0712 345 678": "Weka namba ya simu ya Tanzania, mf. 0712 345 678",
  "Enter a valid date": "Weka tarehe sahihi",
  "Add your mobile number to get WhatsApp updates": "Weka namba yako ya simu ili kupata taarifa kwa WhatsApp",
  // Listings
  "Listing saved.": "Tangazo limehifadhiwa.",
  "Photos uploaded.": "Picha zimepakiwa.",
  "Choose at least one photo.": "Chagua angalau picha moja.",
  "Submitted for review.": "Limetumwa likaguliwe.",
  "Listing archived.": "Tangazo limehifadhiwa na kufichwa.",
  "Listing restored as a draft.": "Tangazo limerudishwa kuwa rasimu.",
  "Availability confirmed.": "Upatikanaji umethibitishwa.",
  "Add at least one real photo of the property before submitting.":
    "Ongeza angalau picha moja halisi ya nyumba kabla ya kutuma.",
  "Only drafts or rejected listings can be submitted.":
    "Ni rasimu au matangazo yaliyokataliwa tu yanayoweza kutumwa.",
  "Only archived listings can be restored.": "Ni matangazo yaliyohifadhiwa tu yanayoweza kurudishwa.",
  "This listing can no longer be edited.": "Tangazo hili haliwezi kubadilishwa tena.",
  "This listing cannot be updated.": "Tangazo hili haliwezi kusasishwa.",
  "The listing changed. Please refresh and try again.":
    "Tangazo limebadilika. Tafadhali onyesha upya ukurasa kisha ujaribu tena.",
  "This listing is suspended. Contact support if you believe this is a mistake.":
    "Tangazo hili limesimamishwa. Wasiliana na huduma kwa wateja kama unaamini ni kosa.",
  "Photos can no longer be changed on this listing.": "Picha za tangazo hili haziwezi kubadilishwa tena.",
  "Photos must be JPEG, PNG or WebP images.": "Picha lazima ziwe za aina JPEG, PNG au WebP.",
  "That image could not be processed. Please try another photo.":
    "Picha hiyo haikuweza kusomeka. Tafadhali jaribu picha nyingine.",
  "Photo not found.": "Picha haikupatikana.",
  "Listing not found.": "Tangazo halikupatikana.",
  "Choose a property type": "Chagua aina ya nyumba",
  "Choose a region": "Chagua mkoa",
  "At least 1 month": "Angalau mwezi 1",
  "At most 24 months": "Isizidi miezi 24",
  "At most 10 additional charges": "Isizidi gharama nyingine 10",
  "Provide both latitude and longitude, or neither":
    "Weka latitudo na longitudo zote mbili, au usiweke yoyote",
  "Tell tenants when it becomes available": "Waambie wapangaji itapatikana lini",
  // Viewings
  "Choose a date and time.": "Chagua tarehe na saa.",
  "Choose a date and time": "Chagua tarehe na saa",
  "Choose a time between 1 hour and 90 days from now.": "Chagua muda kati ya saa 1 na siku 90 kuanzia sasa.",
  "You cannot request a viewing of your own listing.": "Huwezi kuomba kuangalia tangazo lako mwenyewe.",
  "You already have an active viewing request for this property.":
    "Tayari una ombi la kuangalia linaloendelea kwa nyumba hii.",
  "Viewing request not found.": "Ombi la kuangalia halikupatikana.",
  "This request can no longer be changed.": "Ombi hili haliwezi kubadilishwa tena.",
  "This request can no longer be cancelled.": "Ombi hili haliwezi kusitishwa tena.",
  "This request changed. Please refresh.": "Ombi hili limebadilika. Tafadhali onyesha upya ukurasa.",
  // Verification
  "Choose a check.": "Chagua ukaguzi.",
  "Choose the listing this evidence is for.": "Chagua tangazo ambalo ushahidi huu ni wake.",
  "Choose a document type that fits this check.": "Chagua aina ya nyaraka inayofaa ukaguzi huu.",
  "Choose a file to upload.": "Chagua faili la kupakia.",
  "Please choose a file.": "Tafadhali chagua faili.",
  "Documents must be PDF, JPEG, PNG or WebP files.": "Nyaraka lazima ziwe faili za PDF, JPEG, PNG au WebP.",
  "That document image could not be processed.": "Picha ya nyaraka hiyo haikuweza kusomeka.",
  "Document uploaded.": "Nyaraka imepakiwa.",
  "Upload at least one document before submitting.": "Pakia angalau nyaraka moja kabla ya kutuma.",
  "This request has already been submitted.": "Ombi hili tayari limetumwa.",
  "Submitted documents cannot be removed while under review.":
    "Nyaraka zilizotumwa haziwezi kuondolewa wakati zinakaguliwa.",
  "Evidence can only be added before submission or when more information is requested.":
    "Ushahidi unaweza kuongezwa kabla ya kutuma au maelezo zaidi yanapoombwa tu.",
  "This check is not linked to a listing.": "Ukaguzi huu haujaunganishwa na tangazo.",
  "Document not found.": "Nyaraka haikupatikana.",
  "Verification request not found.": "Ombi la uthibitisho halikupatikana.",
  // Reports
  "Choose what is wrong": "Chagua tatizo ni nini",
  "Choose a listing or account to report": "Chagua tangazo au akaunti ya kuripoti",
  "You cannot report yourself.": "Huwezi kujiripoti mwenyewe.",
  "You cannot report your own listing.": "Huwezi kuripoti tangazo lako mwenyewe.",
  "Add between 5 and 2000 characters.": "Andika kati ya herufi 5 na 2000.",
  "Explain your appeal in 10–2000 characters.": "Eleza rufaa yako kwa herufi kati ya 10 na 2000.",
  "Appeal submitted. A different review will take place.": "Rufaa imetumwa. Ukaguzi mwingine utafanyika.",
  "Information added. The report is back under review.": "Maelezo yameongezwa. Ripoti inakaguliwa tena.",
  "This report has already been appealed.": "Tayari umekata rufaa kwa ripoti hii.",
  "This report cannot be appealed.": "Ripoti hii haiwezi kukatiwa rufaa.",
  "More information was not requested for this report.": "Maelezo zaidi hayakuombwa kwa ripoti hii.",
  "Report not found.": "Ripoti haikupatikana.",
};

const FIELD_SW: Record<string, string> = {
  Title: "Kichwa",
  Description: "Maelezo",
  District: "Wilaya",
  Neighbourhood: "Mtaa",
  Name: "Jina",
  "Display name": "Jina la kuonyesha",
  Message: "Ujumbe",
  "Charge name": "Jina la gharama",
  "Monthly rent": "Kodi ya mwezi",
  Deposit: "Amana",
  "Agent fee": "Ada ya dalali",
  "Charge amount": "Kiasi cha gharama",
};

const PATTERNS: [RegExp, (f: string, n?: string) => string][] = [
  [/^(.+) must be at least (\d+) characters$/, (f, n) => `${f} lazima iwe na angalau herufi ${n}`],
  [/^(.+) must be at most (\d+) characters$/, (f, n) => `${f} isizidi herufi ${n}`],
  [/^(.+) is required$/, (f) => `${f} inahitajika`],
  [/^(.+) must be a whole number of shillings$/, (f) => `${f} lazima iwe kiasi kamili cha shilingi`],
  [/^(.+) must be greater than zero$/, (f) => `${f} lazima iwe zaidi ya sifuri`],
  [/^(.+) cannot be negative$/, (f) => `${f} haiwezi kuwa chini ya sifuri`],
  [/^(.+) is too large$/, (f) => `${f} ni kubwa mno`],
  [/^Must be at most (\d+) characters$/, (n) => `Isizidi herufi ${n}`],
  [/^A listing can have at most (\d+) photos\.$/, (n) => `Tangazo linaweza kuwa na picha zisizozidi ${n}.`],
  [
    /^You can upload at most (\d+) documents per check\.$/,
    (n) => `Unaweza kupakia nyaraka zisizozidi ${n} kwa kila ukaguzi.`,
  ],
  [/^Attach at most (\d+) files\.$/, (n) => `Ambatisha faili zisizozidi ${n}.`],
];

export function translateServerMessage(message: string, locale: Locale): string {
  if (locale !== "sw") return message;
  const exact = SW[message];
  if (exact) return exact;
  for (const [re, build] of PATTERNS) {
    const m = re.exec(message);
    if (!m) continue;
    const [, a, b] = m;
    // Field-based patterns capture (field, number); the rest capture only a number.
    return b !== undefined || re.source.startsWith("^(.+)") ? build(FIELD_SW[a!] ?? a!, b) : build(a!);
  }
  return message;
}
