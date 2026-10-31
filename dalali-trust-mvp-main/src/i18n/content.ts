import type { Locale } from ".";

/**
 * Long-form page content. Each section is { heading, paragraphs, bullets? }.
 * Legal pages (privacy, terms) are drafts that must be reviewed by a Tanzanian lawyer
 * before public launch.
 */
export type Section = { h: string; p?: string[]; ul?: string[] };
export type PageContent = { title: string; intro: string; sections: Section[] };

const howItWorks: Record<Locale, PageContent> = {
  en: {
    title: "How Dalali Trust works",
    intro:
      "Dalali Trust is a rental listing platform with a human review step and transparent, clearly-scoped verification.",
    sections: [
      {
        h: "For tenants",
        ul: [
          "Search by region, district, budget, property type and bedrooms.",
          "Every listing shows monthly rent, months of rent paid in advance, deposit, agent fee and any other charges, plus an estimated total before moving in.",
          "Check the verification panel to see exactly which checks were done on the advertiser and when.",
          "Sign in to see contact details, save homes and send a viewing request.",
          "If something looks wrong — especially a request to pay before viewing — report it.",
        ],
      },
      {
        h: "For landlords and agents",
        ul: [
          "Create a free account and add your listing with real photos and the full cost breakdown.",
          "A moderator reviews the listing before it is published. If you change the price, description or photos later, it is reviewed again.",
          "Confirm availability regularly. Listings that have not been confirmed recently show a warning to tenants.",
          "Optionally complete verification checks (identity, landlord/agent authorisation, property evidence) to show a verified badge.",
        ],
      },
      {
        h: "What we do not do",
        ul: [
          "We do not collect rent, deposits or fees, and we never hold your money.",
          "We are not a party to tenancy agreements between tenants and landlords.",
          "We do not have access to government land or identity registries. Checks are manual reviews of documents you provide.",
        ],
      },
    ],
  },
  sw: {
    title: "Dalali Trust inavyofanya kazi",
    intro:
      "Dalali Trust ni jukwaa la matangazo ya nyumba za kupanga lenye hatua ya ukaguzi wa binadamu na uthibitisho ulio wazi na wenye mipaka iliyoelezwa.",
    sections: [
      {
        h: "Kwa wapangaji",
        ul: [
          "Tafuta kwa mkoa, wilaya, bajeti, aina ya nyumba na idadi ya vyumba.",
          "Kila tangazo linaonyesha kodi ya mwezi, miezi ya kulipa mbele, amana, ada ya dalali na gharama nyingine, pamoja na jumla inayokadiriwa kabla ya kuhamia.",
          "Angalia sehemu ya uthibitisho kuona ukaguzi gani hasa ulifanyika kwa mtangazaji na lini.",
          "Ingia ili kuona mawasiliano, kuhifadhi nyumba na kutuma ombi la kuangalia.",
          "Kitu kikionekana si sawa — hasa ukiombwa kulipa kabla ya kuona — ripoti.",
        ],
      },
      {
        h: "Kwa wenye nyumba na madalali",
        ul: [
          "Fungua akaunti bure na uweke tangazo lenye picha halisi na gharama zote.",
          "Msimamizi hukagua tangazo kabla ya kuchapishwa. Ukibadilisha bei, maelezo au picha baadaye, litakaguliwa tena.",
          "Thibitisha upatikanaji mara kwa mara. Matangazo yasiyothibitishwa karibuni huonyesha tahadhari kwa wapangaji.",
          "Kwa hiari, kamilisha ukaguzi (utambulisho, ruhusa ya mwenye nyumba/dalali, ushahidi wa nyumba) ili kuonyesha beji ya uthibitisho.",
        ],
      },
      {
        h: "Tusichofanya",
        ul: [
          "Hatukusanyi kodi, amana wala ada, na hatushikilii pesa zako.",
          "Sisi si sehemu ya mikataba ya upangaji kati ya wapangaji na wenye nyumba.",
          "Hatuna muunganisho na mifumo ya serikali ya ardhi au vitambulisho. Ukaguzi ni mapitio ya mkono ya nyaraka unazowasilisha.",
        ],
      },
    ],
  },
};

const verification: Record<Locale, PageContent> = {
  en: {
    title: "What our verification means",
    intro:
      "Each badge on Dalali Trust refers to one specific, manual check. We show what was checked, who checked it (a Dalali Trust reviewer) and when. No badge proves legal ownership of a property.",
    sections: [
      {
        h: "Listing reviewed",
        p: [
          "A moderator read the listing before it was published, looking for missing costs, misleading content, reused photos and other warning signs. It is not an inspection of the property.",
        ],
      },
      {
        h: "Advertiser identity",
        p: [
          "The advertiser submitted a government-issued photo ID and a selfie. A reviewer compared them with the name on the account. This tells you who operates the account — not whether they own the property.",
        ],
      },
      {
        h: "Landlord / agent authorisation",
        p: [
          "The advertiser submitted documents suggesting they may let property, such as a management agreement or an owner's authorisation letter. We could not confirm these documents with any government registry.",
        ],
      },
      {
        h: "Property evidence",
        p: [
          "The advertiser submitted documents or photos linking them to a specific property, such as a utility bill. This is not a title search.",
        ],
      },
      {
        h: "Statuses",
        ul: [
          "Not verified — no check has been completed (this is not a negative finding).",
          "Under review — documents were submitted and are waiting for a reviewer.",
          "Verified — the check was completed on the date shown. Verifications expire and must be renewed.",
          "Expired — the check is older than its validity period.",
        ],
      },
      {
        h: "Limitations",
        p: [
          "Documents can be forged and situations change after a check. Always view the property in person, meet the person you will pay, ask for a written agreement and receipts, and never pay before viewing.",
        ],
      },
    ],
  },
  sw: {
    title: "Uthibitisho wetu unamaanisha nini",
    intro:
      "Kila beji kwenye Dalali Trust inahusu ukaguzi mmoja maalum wa mkono. Tunaonyesha kilichokaguliwa, aliyekagua (mkaguzi wa Dalali Trust) na lini. Hakuna beji inayothibitisha umiliki halali wa nyumba.",
    sections: [
      {
        h: "Tangazo limekaguliwa",
        p: [
          "Msimamizi alisoma tangazo kabla ya kuchapishwa, akitafuta gharama zilizofichwa, maudhui yanayopotosha, picha zilizotumika tena na dalili nyingine. Huu si ukaguzi wa nyumba yenyewe.",
        ],
      },
      {
        h: "Utambulisho wa mtangazaji",
        p: [
          "Mtangazaji aliwasilisha kitambulisho cha serikali chenye picha na picha yake (selfie). Mkaguzi alivilinganisha na jina la akaunti. Hii inakuambia nani anaendesha akaunti — si kama anamiliki nyumba.",
        ],
      },
      {
        h: "Ruhusa ya mwenye nyumba / dalali",
        p: [
          "Mtangazaji aliwasilisha nyaraka zinazoonyesha anaweza kupangisha, kama mkataba wa usimamizi au barua ya ruhusa ya mmiliki. Hatukuweza kuthibitisha nyaraka hizi na mfumo wowote wa serikali.",
        ],
      },
      {
        h: "Ushahidi wa nyumba",
        p: [
          "Mtangazaji aliwasilisha nyaraka au picha zinazomuunganisha na nyumba husika, kama bili ya huduma. Huu si utafutaji wa hati miliki.",
        ],
      },
      {
        h: "Hali",
        ul: [
          "Haijathibitishwa — hakuna ukaguzi uliokamilika (hili si tokeo hasi).",
          "Inakaguliwa — nyaraka zimewasilishwa na zinasubiri mkaguzi.",
          "Imethibitishwa — ukaguzi ulikamilika tarehe iliyoonyeshwa. Uthibitisho huisha muda na lazima urudiwe.",
          "Muda umeisha — ukaguzi umepita muda wake halali.",
        ],
      },
      {
        h: "Mipaka",
        p: [
          "Nyaraka zinaweza kughushiwa na hali hubadilika baada ya ukaguzi. Daima nenda kuiona nyumba, kutana na mtu utakayemlipa, omba mkataba wa maandishi na risiti, na usilipe kabla ya kuona.",
        ],
      },
    ],
  },
};

const safety: Record<Locale, PageContent> = {
  en: {
    title: "Renting safely",
    intro:
      "Most advertisers are honest, but a few warning signs are worth knowing. These tips apply whether you found the home here or anywhere else.",
    sections: [
      {
        h: "Before you pay anything",
        ul: [
          "Never pay a deposit, 'viewing fee' or advance rent before you have seen the property in person.",
          "Meet the landlord or confirm the agent's authority. Ask to see the owner's authorisation if you are dealing with an agent.",
          "Get a written tenancy agreement showing rent, months paid in advance, deposit and how it is returned.",
          "Pay to a named account (bank or mobile money) and keep receipts and screenshots.",
        ],
      },
      {
        h: "Warning signs",
        ul: [
          "Pressure to pay immediately because 'many people want it'.",
          "A price far below similar homes in the same area.",
          "The advertiser cannot show you inside, or the keys are 'with someone else'.",
          "Photos that look like a hotel or appear on several different adverts.",
        ],
      },
      {
        h: "If something goes wrong",
        ul: [
          "Report the listing on Dalali Trust so a moderator can review it.",
          "If you have lost money, report it to the police and to your mobile money provider immediately.",
          "Keep all messages, numbers and receipts as evidence.",
        ],
      },
    ],
  },
  sw: {
    title: "Kupanga kwa usalama",
    intro:
      "Watangazaji wengi ni waaminifu, lakini kuna dalili chache za tahadhari unazofaa kuzijua. Ushauri huu unafaa popote ulipoipata nyumba.",
    sections: [
      {
        h: "Kabla ya kulipa chochote",
        ul: [
          "Usilipe amana, 'ada ya kuangalia' wala kodi ya mbele kabla ya kuiona nyumba mwenyewe.",
          "Kutana na mwenye nyumba au thibitisha mamlaka ya dalali. Omba kuona ruhusa ya mmiliki kama unashughulika na dalali.",
          "Pata mkataba wa maandishi unaoonyesha kodi, miezi ya kulipa mbele, amana na jinsi itakavyorudishwa.",
          "Lipa kwenye akaunti yenye jina (benki au pesa ya simu) na uhifadhi risiti na picha za skrini.",
        ],
      },
      {
        h: "Dalili za tahadhari",
        ul: [
          "Kushinikizwa kulipa haraka kwa sababu 'watu wengi wanaitaka'.",
          "Bei iliyo chini sana kuliko nyumba zinazofanana eneo hilo.",
          "Mtangazaji hawezi kukuonyesha ndani, au funguo ziko 'kwa mtu mwingine'.",
          "Picha zinazofanana na hoteli au zinazoonekana kwenye matangazo mengi tofauti.",
        ],
      },
      {
        h: "Jambo likienda vibaya",
        ul: [
          "Ripoti tangazo kwenye Dalali Trust ili msimamizi alipitie.",
          "Kama umepoteza pesa, toa taarifa polisi na kwa mtoa huduma wako wa pesa ya simu mara moja.",
          "Hifadhi jumbe zote, namba na risiti kama ushahidi.",
        ],
      },
    ],
  },
};

const about: Record<Locale, PageContent> = {
  en: {
    title: "About Dalali Trust",
    intro: "Our mission: making property search in Tanzania more transparent, accountable, and trustworthy.",
    sections: [
      {
        h: "Why we exist",
        p: [
          "Finding a rental home should not require luck. Many people lose time and transport money on adverts that are out of date, incomplete or misleading, and honest landlords and agents struggle to stand out.",
          "Dalali Trust starts with simple, practical tools: complete cost information, human review of listings, clearly-scoped verification and a structured way to report problems.",
        ],
      },
      {
        h: "Where we are",
        p: [
          "We are an early-stage service, starting with rental homes. We are learning from tenants, landlords and agents, and we will change the product based on what we hear. Please send us feedback.",
        ],
      },
    ],
  },
  sw: {
    title: "Kuhusu Dalali Trust",
    intro:
      "Dhamira yetu: kufanya utafutaji wa nyumba Tanzania kuwa wazi zaidi, wenye uwajibikaji na wa kuaminika.",
    sections: [
      {
        h: "Kwa nini tupo",
        p: [
          "Kupata nyumba ya kupanga hakupaswi kuhitaji bahati. Watu wengi hupoteza muda na nauli kwa matangazo yaliyopitwa na wakati, yasiyokamilika au yanayopotosha, na wenye nyumba na madalali waaminifu hupata shida kujitofautisha.",
          "Dalali Trust inaanza na zana rahisi: taarifa kamili za gharama, ukaguzi wa binadamu wa matangazo, uthibitisho wenye mipaka iliyo wazi na njia rasmi ya kuripoti matatizo.",
        ],
      },
      {
        h: "Tulipo sasa",
        p: [
          "Sisi ni huduma changa, tukianza na nyumba za kupanga. Tunajifunza kutoka kwa wapangaji, wenye nyumba na madalali, na tutabadilisha huduma kulingana na tunachosikia. Tafadhali tutumie maoni.",
        ],
      },
    ],
  },
};

const forAdvertisers: Record<Locale, PageContent> = {
  en: {
    title: "List your property on Dalali Trust",
    intro: "Free for landlords and agents during our early launch. Build a reputation tenants can check.",
    sections: [
      {
        h: "How to get started",
        ul: [
          "Create an account as a landlord or an agent.",
          "Add your listing: real photos taken recently, the full rent and every charge (advance months, deposit, agent fee, utilities).",
          "Submit it for review. A moderator usually responds within two working days.",
          "Optionally complete verification: identity, your authority to let the property, and evidence for the specific property.",
          "Keep listings current — confirm availability and archive homes that are taken.",
        ],
      },
      {
        h: "What we look for in review",
        ul: [
          "Photos of the actual property, not stock images or photos from other adverts.",
          "Complete and honest costs. Listings with hidden charges are rejected.",
          "No request for payment before a viewing.",
          "For agents: the owner has authorised you to advertise.",
        ],
      },
      {
        h: "Documents for verification",
        p: [
          "Upload documents only through the verification page in your dashboard — never by email or chat. Files are stored privately and are visible only to you and our reviewers. Do not upload documents you are not entitled to share.",
        ],
      },
    ],
  },
  sw: {
    title: "Tangaza nyumba yako kwenye Dalali Trust",
    intro:
      "Ni bure kwa wenye nyumba na madalali katika kipindi chetu cha mwanzo. Jenga sifa ambayo wapangaji wanaweza kuikagua.",
    sections: [
      {
        h: "Jinsi ya kuanza",
        ul: [
          "Fungua akaunti kama mwenye nyumba au dalali.",
          "Weka tangazo lako: picha halisi za karibuni, kodi kamili na kila gharama (miezi ya mbele, amana, ada ya dalali, huduma).",
          "Liwasilishe kwa ukaguzi. Msimamizi kwa kawaida hujibu ndani ya siku mbili za kazi.",
          "Kwa hiari, kamilisha uthibitisho: utambulisho, mamlaka yako ya kupangisha, na ushahidi wa nyumba husika.",
          "Weka matangazo yawe ya sasa — thibitisha upatikanaji na hifadhi kumbukumbu nyumba zilizochukuliwa.",
        ],
      },
      {
        h: "Tunachoangalia kwenye ukaguzi",
        ul: [
          "Picha za nyumba halisi, si picha za mtandaoni au za matangazo mengine.",
          "Gharama kamili na za kweli. Matangazo yenye gharama zilizofichwa hukataliwa.",
          "Hakuna kuomba malipo kabla ya kuangalia nyumba.",
          "Kwa madalali: mmiliki amekuruhusu kutangaza.",
        ],
      },
      {
        h: "Nyaraka za uthibitisho",
        p: [
          "Pakia nyaraka kupitia ukurasa wa uthibitisho kwenye dashibodi yako tu — kamwe si kwa barua pepe au chat. Mafaili huhifadhiwa kwa siri na huonekana kwako na kwa wakaguzi wetu tu. Usipakie nyaraka ambazo huna haki ya kuzishiriki.",
        ],
      },
    ],
  },
};

const privacyEn: PageContent = {
  title: "Privacy policy (draft)",
  intro:
    "This draft explains what personal data Dalali Trust collects and why. It must be reviewed by a qualified Tanzanian lawyer, and the operator must complete any registration required under the Personal Data Protection Act, 2022, before public launch.",
  sections: [
    {
      h: "What we collect",
      ul: [
        "Account data: name, email address, optional mobile number, account type, language preference.",
        "Listing data provided by advertisers, including photos (we remove photo metadata such as GPS location when you upload).",
        "Verification documents that advertisers choose to submit. These are stored in private storage, are never public, and are visible only to the submitter and authorised reviewers.",
        "Viewing requests, reports and any attachments you provide.",
        "Security data: session records, and hashed (not raw) network identifiers used for rate limiting.",
        "Anonymous usage counts (for example, how many times a listing was viewed). These do not identify you.",
      ],
    },
    {
      h: "Why we use it",
      ul: [
        "To run your account and show listings.",
        "To let tenants and advertisers arrange viewings.",
        "To review listings, verification requests and reports, and to keep an audit trail of moderation decisions.",
        "To prevent fraud and abuse of the service.",
      ],
    },
    {
      h: "WhatsApp updates",
      ul: [
        "Only if you turn them on, we send short WhatsApp messages about your viewing requests and listing reviews to the mobile number on your account.",
        "These messages are delivered through Meta's WhatsApp Business Platform, so Meta processes your number and the message to deliver it.",
        "You can turn WhatsApp updates off at any time in Account settings. Updates always remain available in your dashboard notifications.",
      ],
    },
    {
      h: "SMS updates and USSD",
      ul: [
        "Only if you turn them on, we send the same updates by SMS to the mobile number on your account. You can turn them off at any time in Account settings.",
        "If you use our USSD menu, we use your phone number only to answer you and, if you ask, to send you a listing's details by SMS. We keep a coded (hashed) form of the number for a short time to limit abuse, not the number itself.",
        "SMS and USSD are delivered through Africa's Talking and your mobile network, which process your number and the message to deliver it.",
      ],
    },
    {
      h: "Who can see it",
      ul: [
        "Public: published listings, an advertiser's display name, role and verification statuses.",
        "Signed-in users: an advertiser's contact numbers if the advertiser chose to show them.",
        "An advertiser: the name and optional phone number of people who send them a viewing request.",
        "Reviewers: verification documents and report evidence. We do not tell an advertiser who reported them.",
        "We do not sell personal data.",
      ],
    },
    {
      h: "Retention and deletion",
      ul: [
        "You can delete your account from your dashboard settings. We remove your personal details and delete your uploaded files; records of moderation decisions are kept in anonymised form.",
        "Verification documents are deleted when you delete your account and should be purged after the retention period described in our operating documentation.",
      ],
    },
    { h: "Contact", p: ["Questions or requests about your data: use the contact page."] },
  ],
};

const termsEn: PageContent = {
  title: "Terms of use (draft)",
  intro: "These draft terms must be reviewed by a qualified Tanzanian lawyer before public launch.",
  sections: [
    {
      h: "The service",
      p: [
        "Dalali Trust is a platform for advertising and finding rental property. We do not own, manage or let properties, we are not a party to any tenancy agreement, and we do not collect or hold rent, deposits or fees.",
      ],
    },
    {
      h: "Verification and reviews",
      p: [
        "Listing reviews and verification checks are manual reviews of information provided to us, limited to the scope stated on each badge. They do not guarantee the honesty of any advertiser, the condition of any property, or legal ownership.",
      ],
    },
    {
      h: "Advertiser responsibilities",
      ul: [
        "Only advertise property you are entitled to let, or that the owner has authorised you to advertise.",
        "Show accurate photos and the full cost of renting, and keep availability up to date.",
        "Never ask for payment before a tenant has viewed the property.",
        "Only upload documents you are entitled to share.",
      ],
    },
    {
      h: "Reports and moderation",
      p: [
        "Anyone may report a listing. Reports are reviewed by moderators; a report alone is not a finding of wrongdoing. We may reject, suspend or remove listings and suspend accounts that break these terms. Decisions can be appealed once from your dashboard.",
      ],
    },
    {
      h: "Acceptable use",
      ul: [
        "No false, misleading or discriminatory content.",
        "No harassment, scraping or attempts to access other users' data.",
        "No malicious or retaliatory reports.",
      ],
    },
  ],
};

const swLegalNote =
  "Toleo la Kiswahili la ukurasa huu linaandaliwa. Kwa sasa maudhui yafuatayo ni kwa Kiingereza.";

export const pages = {
  howItWorks,
  verification,
  safety,
  about,
  forAdvertisers,
  privacy: { en: privacyEn, sw: { ...privacyEn, intro: `${swLegalNote} ${privacyEn.intro}` } } as Record<
    Locale,
    PageContent
  >,
  terms: { en: termsEn, sw: { ...termsEn, intro: `${swLegalNote} ${termsEn.intro}` } } as Record<
    Locale,
    PageContent
  >,
};
