/**
 * Tanzania administrative regions (26 mainland + 5 Zanzibar).
 *
 * Region is validated against this list. District names are offered as suggestions
 * for the most active rental markets but are accepted as free text, because district
 * and council boundaries change and an incomplete hard-coded list would block real
 * listings. Review and extend this list with local partners before launch.
 */
export type Region = { slug: string; name: string; districts: string[] };

export const REGIONS: Region[] = [
  {
    slug: "arusha",
    name: "Arusha",
    districts: ["Arusha City", "Arusha DC", "Meru", "Karatu", "Monduli", "Longido", "Ngorongoro"],
  },
  {
    slug: "dar-es-salaam",
    name: "Dar es Salaam",
    districts: ["Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni"],
  },
  {
    slug: "dodoma",
    name: "Dodoma",
    districts: ["Dodoma City", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa"],
  },
  { slug: "geita", name: "Geita", districts: ["Geita", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"] },
  {
    slug: "iringa",
    name: "Iringa",
    districts: ["Iringa Municipal", "Iringa DC", "Kilolo", "Mufindi", "Mafinga"],
  },
  {
    slug: "kagera",
    name: "Kagera",
    districts: [
      "Bukoba Municipal",
      "Bukoba DC",
      "Biharamulo",
      "Karagwe",
      "Kyerwa",
      "Missenyi",
      "Muleba",
      "Ngara",
    ],
  },
  { slug: "katavi", name: "Katavi", districts: ["Mpanda", "Mlele", "Tanganyika"] },
  {
    slug: "kigoma",
    name: "Kigoma",
    districts: ["Kigoma-Ujiji", "Kigoma DC", "Buhigwe", "Kakonko", "Kasulu", "Kibondo", "Uvinza"],
  },
  {
    slug: "kilimanjaro",
    name: "Kilimanjaro",
    districts: ["Moshi Municipal", "Moshi DC", "Hai", "Mwanga", "Rombo", "Same", "Siha"],
  },
  {
    slug: "lindi",
    name: "Lindi",
    districts: ["Lindi Municipal", "Kilwa", "Liwale", "Nachingwea", "Ruangwa"],
  },
  { slug: "manyara", name: "Manyara", districts: ["Babati", "Hanang", "Kiteto", "Mbulu", "Simanjiro"] },
  {
    slug: "mara",
    name: "Mara",
    districts: ["Musoma Municipal", "Musoma DC", "Bunda", "Butiama", "Rorya", "Serengeti", "Tarime"],
  },
  {
    slug: "mbeya",
    name: "Mbeya",
    districts: ["Mbeya City", "Mbeya DC", "Chunya", "Kyela", "Mbarali", "Rungwe", "Busokelo"],
  },
  {
    slug: "morogoro",
    name: "Morogoro",
    districts: [
      "Morogoro Municipal",
      "Morogoro DC",
      "Gairo",
      "Kilombero",
      "Kilosa",
      "Malinyi",
      "Mvomero",
      "Ulanga",
    ],
  },
  {
    slug: "mtwara",
    name: "Mtwara",
    districts: ["Mtwara Municipal", "Mtwara DC", "Masasi", "Nanyumbu", "Newala", "Tandahimba"],
  },
  {
    slug: "mwanza",
    name: "Mwanza",
    districts: ["Ilemela", "Nyamagana", "Buchosa", "Kwimba", "Magu", "Misungwi", "Sengerema", "Ukerewe"],
  },
  {
    slug: "njombe",
    name: "Njombe",
    districts: ["Njombe Town", "Njombe DC", "Ludewa", "Makambako", "Makete", "Wanging'ombe"],
  },
  {
    slug: "pwani",
    name: "Pwani",
    districts: ["Kibaha", "Bagamoyo", "Chalinze", "Kisarawe", "Mkuranga", "Rufiji", "Kibiti", "Mafia"],
  },
  { slug: "rukwa", name: "Rukwa", districts: ["Sumbawanga", "Kalambo", "Nkasi"] },
  {
    slug: "ruvuma",
    name: "Ruvuma",
    districts: ["Songea Municipal", "Songea DC", "Mbinga", "Namtumbo", "Nyasa", "Tunduru"],
  },
  {
    slug: "shinyanga",
    name: "Shinyanga",
    districts: ["Shinyanga Municipal", "Shinyanga DC", "Kahama", "Kishapu", "Msalala", "Ushetu"],
  },
  { slug: "simiyu", name: "Simiyu", districts: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"] },
  {
    slug: "singida",
    name: "Singida",
    districts: ["Singida Municipal", "Singida DC", "Ikungi", "Iramba", "Manyoni", "Mkalama"],
  },
  { slug: "songwe", name: "Songwe", districts: ["Mbozi", "Ileje", "Momba", "Songwe", "Tunduma"] },
  {
    slug: "tabora",
    name: "Tabora",
    districts: ["Tabora Municipal", "Igunga", "Kaliua", "Nzega", "Sikonge", "Urambo", "Uyui"],
  },
  {
    slug: "tanga",
    name: "Tanga",
    districts: ["Tanga City", "Handeni", "Kilindi", "Korogwe", "Lushoto", "Mkinga", "Muheza", "Pangani"],
  },
  { slug: "kaskazini-pemba", name: "Kaskazini Pemba", districts: ["Micheweni", "Wete"] },
  { slug: "kusini-pemba", name: "Kusini Pemba", districts: ["Chake Chake", "Mkoani"] },
  { slug: "kaskazini-unguja", name: "Kaskazini Unguja", districts: ["Kaskazini A", "Kaskazini B"] },
  { slug: "kusini-unguja", name: "Kusini Unguja", districts: ["Kati", "Kusini"] },
  { slug: "mjini-magharibi", name: "Mjini Magharibi", districts: ["Mjini", "Magharibi A", "Magharibi B"] },
];

export const REGION_SLUGS = REGIONS.map((r) => r.slug) as [string, ...string[]];

export function regionName(slug: string): string {
  return REGIONS.find((r) => r.slug === slug)?.name ?? slug;
}

export function isRegion(slug: string): boolean {
  return REGIONS.some((r) => r.slug === slug);
}
