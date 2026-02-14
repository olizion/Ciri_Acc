"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  CarIcon,
  UtensilsIcon,
  WineIcon,
  BedDoubleIcon,
  SmartphoneIcon,
  LaptopIcon,
  PackageIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MinimizeIcon,
  LightbulbIcon,
  BuildingIcon,
  PlaneIcon,
  GiftIcon,
  CoffeeIcon,
  FuelIcon,
  WrenchIcon,
  BookOpenIcon,
  MonitorIcon,
  PrinterIcon,
  CameraIcon,
  HeadphonesIcon,
  TvIcon,
  WifiIcon,
  ServerIcon,
  HardDriveIcon,
  MouseIcon,
  KeyboardIcon,
  WatchIcon,
  LampIcon,
  ArmchairIcon,
  BikeIcon,
  ShipIcon,
  TrainFrontIcon,
  BusIcon,
  GraduationCapIcon,
  MicIcon,
  VideoIcon,
  PaletteIcon,
  MegaphoneIcon,
  FileTextIcon,
  ShieldIcon,
  HeartPulseIcon,
  HardHatIcon,
  SprayCanIcon,
  TreesIcon,
  FrameIcon,
  TicketIcon,
  MusicIcon,
  DumbbellIcon,
  ScissorsIcon,
  BookIcon,
  NewspaperIcon,
  MailIcon,
  CreditCardIcon,
  BanknoteIcon,
  CalculatorIcon,
  ClipboardIcon,
  PenToolIcon,
  RulerIcon,
  CompassIcon,
  FlameIcon,
  ThermometerIcon,
  AirVentIcon,
  DropletIcon,
  ZapIcon,
  SunIcon,
  CloudIcon,
  UmbrellaIcon,
  ShirtIcon,
  BriefcaseIcon,
  LuggageIcon,
  KeyIcon,
  LockIcon,
  EyeIcon,
  StethoscopeIcon,
  PillIcon,
  SyringeIcon,
  ActivityIcon,
  UsersIcon,
  UserIcon,
  MessageSquareIcon,
  PhoneIcon,
  MailboxIcon,
  GlobeIcon,
  MapPinIcon,
  NavigationIcon,
  FlagIcon,
  AwardIcon,
  TrophyIcon,
  StarIcon,
  HeartIcon,
  ThumbsUpIcon,
  SmileIcon,
  FrownIcon,
  AlertTriangleIcon,
  InfoIcon,
  HelpCircleIcon,
  SettingsIcon,
  CogIcon,
  RefreshCwIcon,
  RotateCwIcon,
  UploadIcon,
  DownloadIcon,
  ShareIcon,
  LinkIcon,
  ExternalLinkIcon,
  CopyIcon,
  ClipboardCopyIcon,
  SaveIcon,
  FolderIcon,
  FileIcon,
  ImageIcon,
  FilmIcon,
  Volume2Icon,
  VolumeXIcon,
  PlayIcon,
  PauseIcon,
  SquareIcon,
  CircleIcon,
  TriangleIcon,
  OctagonIcon,
  HexagonIcon,
  PentagonIcon,
  DiamondIcon,
  BoxIcon,
  PackageOpenIcon,
  ArchiveIcon,
  TrashIcon,
  Trash2Icon,
  XIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  DivideIcon,
  PercentIcon,
  HashIcon,
  AtSignIcon,
  AsteriskIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

// ============================================================================
// COMPREHENSIVE NORWEGIAN MVA DEDUCTION RULES DATABASE
// Based on Merverdiavgiftsloven and real business scenarios
// ============================================================================

interface DeductionRule {
  id: string;
  keywords: string[];
  category: string;
  verdict: "yes" | "no" | "partial";
  title: string;
  shortAnswer: string;
  explanation: string;
  exception?: string;
  tip?: string;
  legalRef: string;
  icon: React.ComponentType<{ className?: string }>;
}

const deductionRules: DeductionRule[] = [
  // ============================================================================
  // VEHICLES & TRANSPORT - BIL OG TRANSPORT
  // ============================================================================
  {
    id: "personbil",
    keywords: [
      "personbil", "bil", "car", "firmabil", "leasingbil", "elbil", "hybridbil",
      "tesla", "audi", "bmw", "mercedes", "volkswagen", "volvo", "toyota", "honda",
      "nissan", "mazda", "ford", "opel", "peugeot", "renault", "citroen", "skoda",
      "seat", "hyundai", "kia", "mitsubishi", "subaru", "suzuki", "fiat", "alfa romeo",
      "porsche", "jaguar", "land rover", "range rover", "jeep", "lexus", "infiniti",
      "ds", "mini", "smart", "dacia", "cupra", "polestar", "lucid", "rivian",
      "sedan", "stasjonsvogn", "suv", "crossover", "cabriolet", "coupe", "kombi",
      "bilkjøp", "billeasing", "billån", "bilforsikring", "bilservice",
      "klasse 1", "varebil klasse 1"
    ],
    category: "bil",
    verdict: "no",
    title: "Personbil (klasse 1)",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Personbiler og varebiler klasse 1 gir ikke rett til MVA-fradrag, uansett hvor mye den brukes i næring. Dette gjelder kjøp, leasing, drivstoff, service og vedlikehold.",
    exception: "Unntak: Drosjer, bilutleie og bilforhandlere kan få fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: CarIcon
  },
  {
    id: "varebil-2",
    keywords: [
      "varebil", "varebil klasse 2", "lastebil", "truck", "van", "transporter",
      "sprinter", "crafter", "transit", "master", "movano", "boxer", "ducato",
      "pickup", "arbeidsbil", "servicebil", "budbil", "kassebil",
      "klasse 2", "n1", "nyttekjøretøy"
    ],
    category: "bil",
    verdict: "yes",
    title: "Varebil klasse 2 / Lastebil",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Varebiler klasse 2 og lastebiler som brukes i avgiftspliktig virksomhet gir full fradragsrett. Dette gjelder både kjøp, leasing, drivstoff og vedlikehold.",
    tip: "Sjekk vognkortet - klasse 2 har maks 2 seter og minst 50% lasterom.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CarIcon
  },
  {
    id: "drivstoff",
    keywords: [
      "bensin", "diesel", "drivstoff", "bensinkort", "drivstoffkort",
      "circle k", "esso", "shell", "uno-x", "best", "yx", "st1",
      "tanking", "fylling", "bensinstasjon", "ladekort", "elbillading",
      "lading", "hurtiglading", "hjemmelading", "ladeboks", "lader"
    ],
    category: "bil",
    verdict: "no",
    title: "Drivstoff til personbil",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Drivstoff og lading til personbil eller varebil klasse 1 gir ikke MVA-fradrag, selv om bilen brukes i næring.",
    tip: "Driver du drosje eller har varebil klasse 2? Da får du fradrag!",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: FuelIcon
  },
  {
    id: "bilservice",
    keywords: [
      "service", "bilservice", "eu-kontroll", "pkk", "dekkskift", "dekk",
      "vinterdekk", "sommerdekk", "piggdekk", "felg", "felger",
      "reparasjon", "bilverksted", "verksted", "lakk", "lakkering",
      "karosseri", "kollisjon", "bilskade", "ruteskift", "frontrute",
      "bremseskift", "bremser", "oljebytte", "olje", "motorolje",
      "batteri", "bilbatteri", "eksosanlegg", "katalysator"
    ],
    category: "bil",
    verdict: "no",
    title: "Bilservice og vedlikehold (personbil)",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Service, reparasjoner, dekk og vedlikehold av personbil gir ikke MVA-fradrag.",
    exception: "Unntak: Varebil klasse 2 og lastebiler gir full fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: WrenchIcon
  },
  {
    id: "motorsykkel",
    keywords: [
      "motorsykkel", "mc", "moped", "scooter", "atv", "firehjuling",
      "snøscooter", "snøskuter", "vannscooter", "jetski",
      "harley", "honda", "yamaha", "kawasaki", "suzuki", "bmw", "ducati",
      "ktm", "triumph", "vespa", "piaggio"
    ],
    category: "bil",
    verdict: "no",
    title: "Motorsykkel / Scooter / ATV",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Motorsykler, mopeder, scootere, ATV og snøscootere behandles som personkjøretøy og gir ikke MVA-fradrag.",
    exception: "Unntak: Kan gi fradrag hvis brukt i virksomhet som leverer transporttjenester.",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: BikeIcon
  },
  {
    id: "sykkel",
    keywords: [
      "sykkel", "elsykkel", "el-sykkel", "elsparkesykkel", "sparkesykkel",
      "fatbike", "terrengsykkel", "mtb", "landeveissykkel", "bysykkel",
      "lastesykkel", "varesykkel", "transportsykkel"
    ],
    category: "bil",
    verdict: "yes",
    title: "Sykkel / Elsykkel",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Sykler og elsykler til bruk i virksomheten gir fullt MVA-fradrag. Dette inkluderer varesykler og transportsykler.",
    tip: "Elsykkel til ansatte som naturalytelse har egne skatteregler.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BikeIcon
  },
  {
    id: "baat",
    keywords: [
      "båt", "yacht", "seilbåt", "motorbåt", "speedbåt", "jolle",
      "kajakk", "kano", "sup", "paddlebrett", "båtplass", "bryggeplass",
      "marina", "båthavn", "båtforsikring", "båtservice"
    ],
    category: "bil",
    verdict: "no",
    title: "Båt / Fritidsfartøy",
    shortAnswer: "Nei, normalt ingen MVA-fradrag",
    explanation: "Fritidsbåter og lystfartøy gir normalt ikke MVA-fradrag, da de anses som private formål.",
    exception: "Unntak: Fartøy brukt i næringsvirksomhet (fiske, transport, charter) gir fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3",
    icon: ShipIcon
  },
  {
    id: "parkering",
    keywords: [
      "parkering", "parkeringsplass", "parkeringsavgift", "parkeringshus",
      "p-plass", "garasje", "parkeringsbot", "kontrollavgift", "p-avgift"
    ],
    category: "bil",
    verdict: "no",
    title: "Parkering",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Parkering er fritatt for MVA (0% sats). Ingen MVA betales, og derfor ingen fradragsrett.",
    tip: "Parkeringsbøter og kontrollavgifter er uansett ikke fradragsberettiget.",
    legalRef: "Merverdiavgiftsloven § 3-11",
    icon: CarIcon
  },
  {
    id: "bompenger",
    keywords: [
      "bompenger", "bomavgift", "autopass", "ferjebillett", "ferje",
      "brobompenger", "vegprising", "rushtidsavgift"
    ],
    category: "bil",
    verdict: "no",
    title: "Bompenger / Ferjebillett",
    shortAnswer: "Nei, ingen MVA på bompenger",
    explanation: "Bompenger og ferjebilletter for kjøretøy er fritatt for MVA. Ingen MVA betyr ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-4",
    icon: CarIcon
  },

  // ============================================================================
  // TRAVEL - REISE
  // ============================================================================
  {
    id: "flybillett",
    keywords: [
      "fly", "flybillett", "flyreise", "flytur", "flight",
      "sas", "norwegian", "widerøe", "flyr", "norse", "ryanair", "easyjet",
      "lufthansa", "klm", "british airways", "finnair", "qatar", "emirates",
      "business class", "first class", "economy", "innenlandsfly", "utenlandsfly",
      "flyavgift", "flysete", "bagasje", "innsjekket bagasje"
    ],
    category: "reise",
    verdict: "no",
    title: "Flybilletter",
    shortAnswer: "Nei, flyreiser er MVA-fritt",
    explanation: "Persontransport med fly er fritatt for MVA i Norge. Du betaler ikke MVA på flybilletter, og har derfor ingenting å kreve fradrag for.",
    tip: "Kostnaden er fortsatt fradragsberettiget skattemessig som reiseutgift!",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: PlaneIcon
  },
  {
    id: "tog",
    keywords: [
      "tog", "togbillett", "togreise", "nsb", "vy", "sj", "flytoget",
      "interrail", "eurail", "togtur", "sovevogn", "togkupé"
    ],
    category: "reise",
    verdict: "no",
    title: "Togbilletter",
    shortAnswer: "Nei, 0% MVA på persontransport",
    explanation: "Togreiser har 0% MVA i Norge. Ingen MVA betyr ingenting å kreve fradrag for.",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: TrainFrontIcon
  },
  {
    id: "buss",
    keywords: [
      "buss", "bussbillett", "bussreise", "ekspressbuss", "flybuss",
      "turbuss", "rutebuss", "nettbuss", "nor-way", "lavprisekspressen",
      "busstur", "busspakke"
    ],
    category: "reise",
    verdict: "no",
    title: "Bussbilletter",
    shortAnswer: "Nei, 0% MVA på persontransport",
    explanation: "Bussreiser har 0% MVA i Norge. Ingen MVA betyr ingenting å kreve fradrag for.",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: BusIcon
  },
  {
    id: "kollektiv",
    keywords: [
      "kollektiv", "kollektivtransport", "ruter", "atb", "skyss", "kolumbus",
      "brakar", "østfold kollektivtrafikk", "trikk", "t-bane", "tbane", "metro",
      "bybane", "bybanen", "månedskort", "periodebillett", "enkeltbillett"
    ],
    category: "reise",
    verdict: "no",
    title: "Kollektivtransport",
    shortAnswer: "Nei, 0% MVA på persontransport",
    explanation: "Kollektivtransport (trikk, t-bane, buss) har 0% MVA. Ingen MVA betyr ingenting å kreve fradrag for.",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: TrainFrontIcon
  },
  {
    id: "taxi",
    keywords: [
      "taxi", "drosje", "taxitur", "uber", "bolt", "yango", "taxiregning"
    ],
    category: "reise",
    verdict: "no",
    title: "Taxi / Drosje",
    shortAnswer: "Nei, persontransport har 0% MVA",
    explanation: "Taxiturer har 0% MVA i Norge (persontransport). Ingen MVA betyr ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: CarIcon
  },
  {
    id: "leiebil",
    keywords: [
      "leiebil", "bilutleie", "billeie", "rental car", "hertz", "avis", "sixt",
      "europcar", "budget", "enterprise", "thrifty", "national", "alamo",
      "getaround", "nabobil", "hyre"
    ],
    category: "reise",
    verdict: "no",
    title: "Leiebil (personbil)",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Leie av personbil gir ikke MVA-fradrag, på samme måte som kjøp av personbil.",
    exception: "Unntak: Leie av varebil klasse 2 eller lastebil gir fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: CarIcon
  },

  // ============================================================================
  // ACCOMMODATION - OVERNATTING
  // ============================================================================
  {
    id: "hotell",
    keywords: [
      "hotell", "overnatting", "hotellrom", "hotellovernattning",
      "scandic", "thon", "choice", "clarion", "comfort", "quality", "radisson",
      "nordic choice", "first hotels", "best western", "hilton", "marriott",
      "rica", "hotel", "hotellopphold", "hotellpris", "romleie", "suite",
      "dobbeltrom", "enkeltrom", "familierom"
    ],
    category: "hotell",
    verdict: "yes",
    title: "Hotellovernatting",
    shortAnswer: "Ja, men HUSK å skille ut frokost!",
    explanation: "Overnatting på hotell gir MVA-fradrag (12% sats). MEN: Hvis frokost er inkludert, må du trekke ut frokostkostnaden - den gir ikke fradrag.",
    tip: "Be hotellet spesifisere frokost separat på fakturaen, eller bruk standardsats på kr 315 per frokost.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: BedDoubleIcon
  },
  {
    id: "hotell-frokost",
    keywords: [
      "hotellfrokost", "frokost hotell", "frokost inkludert", "frokostbuffet"
    ],
    category: "hotell",
    verdict: "partial",
    title: "Hotell med frokost",
    shortAnswer: "Delvis - frokost må trekkes ut",
    explanation: "Når hotellet har frokost inkludert, må du splitte beløpet. Rommet gir MVA-fradrag, men frokosten gir ikke fradrag.",
    tip: "Standardsats for frokost er kr 315. Trekk dette fra totalbeløpet før du beregner MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: BedDoubleIcon
  },
  {
    id: "airbnb",
    keywords: [
      "airbnb", "feriebolig", "ferieleilighet", "hytteleie", "hytte",
      "leilighet", "privat utleie", "korttidsleie", "booking.com", "vrbo",
      "homes", "novasol"
    ],
    category: "hotell",
    verdict: "partial",
    title: "Airbnb / Feriebolig",
    shortAnswer: "Avhenger av utleier",
    explanation: "Private utleiere er ofte ikke MVA-registrert, så du får ingen fradrag. Profesjonelle utleiere kan være registrert.",
    tip: "Sjekk fakturaen - hvis MVA er spesifisert, kan du kreve fradrag for overnatting.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BedDoubleIcon
  },

  // ============================================================================
  // FOOD & DRINKS - MAT OG DRIKKE
  // ============================================================================
  {
    id: "mat-generelt",
    keywords: [
      "mat", "matinnkjøp", "matvarer", "dagligvarer", "kolonial", "meny", "kiwi",
      "rema", "coop", "bunnpris", "joker", "spar", "extra", "prix", "obs",
      "lunsj", "frokost", "middag", "kveldsmat", "matbit", "snack", "snacks",
      "kjeks", "sjokolade", "godteri", "chips", "popcorn", "nøtter",
      "frukt", "grønnsaker", "brød", "pålegg", "melk", "yoghurt", "ost",
      "kjøtt", "fisk", "kylling", "egg", "smør", "margarin"
    ],
    category: "mat",
    verdict: "no",
    title: "Mat og dagligvarer",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Mat og drikke som konsumeres av ansatte, eier eller kunder gir ikke MVA-fradrag. Dette gjelder selv om det er i jobbsammenheng.",
    exception: "Unntak: Mat kjøpt for videresalg (restaurant, kiosk, dagligvare) gir fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: UtensilsIcon
  },
  {
    id: "restaurant",
    keywords: [
      "restaurant", "restaurantbesøk", "spising", "spisested", "kafé", "cafe",
      "bistro", "brasserie", "pizzeria", "sushi", "thai", "indisk", "kinesisk",
      "meksikansk", "italiensk", "burger", "fastfood", "hurtigmat",
      "mcdonalds", "burger king", "subway", "dominos", "peppes", "dolly dimples",
      "takeaway", "take away", "henting", "levering", "wolt", "foodora", "just eat"
    ],
    category: "mat",
    verdict: "no",
    title: "Restaurant og takeaway",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Mat kjøpt på restaurant eller som takeaway gir ikke MVA-fradrag, selv om det er i jobbsammenheng.",
    tip: "Unntaket er hvis restaurantbesøket er ren representasjon - men da gjelder egne regler.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: UtensilsIcon
  },
  {
    id: "kantine",
    keywords: [
      "kantine", "kantinemat", "bedriftskantine", "personalmat", "ansattmat",
      "lunsjordning", "matservering"
    ],
    category: "mat",
    verdict: "no",
    title: "Kantine / Personalmat",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Mat til ansatte via kantine eller lunsjordning gir ikke MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: UtensilsIcon
  },
  {
    id: "kaffe",
    keywords: [
      "kaffe", "te", "kakao", "espresso", "cappuccino", "latte", "americano",
      "kaffebønner", "kaffekapsel", "nespresso", "dolce gusto", "senseo",
      "kaffemaskin", "kaffekanne", "kaffetrakter", "starbucks", "espresso house",
      "kaffebrenneriet", "stockfleths"
    ],
    category: "mat",
    verdict: "no",
    title: "Kaffe og te",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Kaffe, te og kaffekapsler til kontoret gir ikke MVA-fradrag.",
    tip: "Kaffemaskinen selv kan være fradragsberettiget som inventar - men ikke kaffekapsler!",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: CoffeeIcon
  },
  {
    id: "brus",
    keywords: [
      "brus", "mineralvann", "cola", "fanta", "sprite", "pepsi", "solo",
      "farris", "imsdal", "bonaqua", "vann", "flaskevann", "juice",
      "smoothie", "energidrikk", "redbull", "monster", "battery"
    ],
    category: "mat",
    verdict: "no",
    title: "Brus og drikkevarer",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Brus, mineralvann, juice og andre drikkevarer til kontoret gir ikke MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: CoffeeIcon
  },
  {
    id: "alkohol",
    keywords: [
      "vin", "øl", "sprit", "alkohol", "champagne", "prosecco", "whisky",
      "vodka", "gin", "rom", "cognac", "brennevin", "likør", "aperitiff",
      "vinmonopolet", "polet", "vingave", "firmafest"
    ],
    category: "mat",
    verdict: "no",
    title: "Alkohol",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Alkoholholdige drikkevarer gir aldri MVA-fradrag, verken til internt bruk eller som gave.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: WineIcon
  },
  {
    id: "catering",
    keywords: [
      "catering", "matlevering", "cateringfirma", "smørbrød", "kanapeer",
      "fingermat", "møtemat", "kurs-mat", "lunsjbuffet", "koldtbord",
      "varmbuffet", "pauseservering"
    ],
    category: "mat",
    verdict: "no",
    title: "Catering og møtemat",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Catering og mat til møter, kurs og arrangementer gir ikke MVA-fradrag.",
    exception: "Unntak: Hvis maten er del av en avgiftspliktig konferanse-pakke med overnatting, kan andel av MVA være fradragsberettiget.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) d",
    icon: UtensilsIcon
  },

  // ============================================================================
  // REPRESENTATION - REPRESENTASJON
  // ============================================================================
  {
    id: "representasjon",
    keywords: [
      "representasjon", "kundemiddag", "forretningmiddag", "kundearrangement",
      "firmamiddag", "kundekveld", "networking", "relasjonsbygging",
      "forretningslunsj", "kundepleie", "relasjonsmiddag", "kunderelasjon"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Representasjon",
    shortAnswer: "Nei, aldri MVA-fradrag",
    explanation: "Representasjon gir aldri MVA-fradrag. Dette inkluderer kundemiddager, arrangementer og bevertning av forretningsforbindelser.",
    tip: "Kostnaden kan fortsatt være skattemessig fradragsberettiget (inntil kr 559 per person), men MVA får du aldri tilbake.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) e",
    icon: WineIcon
  },
  {
    id: "firmafest",
    keywords: [
      "firmafest", "julebord", "sommerfest", "jubileum", "firmafeiring",
      "årsfest", "kick-off", "kickoff", "avslutning", "julelunsj", "sommerbord",
      "personalfest", "ansattfest", "fest", "feiring"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Firmafest / Julebord",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Firmafester, julebord og tilsvarende arrangementer for ansatte gir ikke MVA-fradrag.",
    tip: "To velferdstiltak per år (julebord/sommerfest) er skattefritt for ansatte, men MVA-fradrag får du ikke.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) e",
    icon: WineIcon
  },
  {
    id: "gaver",
    keywords: [
      "gave", "gaver", "julegave", "firmgave", "reklamegave", "kundegave",
      "jubileumsgave", "takkegave", "påskjønnelse", "premie", "gevinst",
      "blomster", "konfekt", "konfektboks", "gavekort", "gavesett"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Gaver",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Gaver til kunder, forretningsforbindelser eller ansatte gir ikke MVA-fradrag.",
    exception: "Unntak: Reklameartikler under kr 100 eks. mva (penner, kalendere etc.) kan gi fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) f",
    icon: GiftIcon
  },
  {
    id: "teater-konsert",
    keywords: [
      "teater", "konsert", "opera", "ballett", "show", "forestilling",
      "musikal", "revy", "kabaret", "underholdning", "kino", "kinobillett",
      "museum", "utstilling", "galleri", "kulturarrangement", "kulturopplevelse",
      "festival", "musikkfestival", "øyafestivalen", "palmesus", "findings"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Teater / Konsert / Kultur",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Kulturbilletter og opplevelser gir ikke MVA-fradrag, verken for ansatte eller kunder.",
    tip: "Mange kulturtilbud har allerede 0% eller redusert MVA, så det er ofte lite å spare uansett.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) e",
    icon: TicketIcon
  },
  {
    id: "teambuilding",
    keywords: [
      "teambuilding", "teamaktivitet", "aktivitetsdag", "sosial aktivitet",
      "paintball", "escape room", "go-kart", "bowling", "minigolf",
      "rafting", "klatring", "fallskjerm", "zipline", "teamøvelse",
      "ledersamling", "avdelingstur"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Teambuilding / Aktiviteter",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Teambuilding-aktiviteter og sosiale arrangementer for ansatte gir ikke MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) e",
    icon: UsersIcon
  },
  {
    id: "sport-trening",
    keywords: [
      "treningsstudio", "gym", "treningssenter", "sats", "elixia", "evo",
      "fresh fitness", "treningsmedlemskap", "firmaidrett", "bedriftsidrett",
      "sponsing", "klubbsponsor", "idrettslag", "fotballklubb", "håndball"
    ],
    category: "representasjon",
    verdict: "no",
    title: "Trening / Idrett",
    shortAnswer: "Nei, ingen MVA-fradrag",
    explanation: "Treningsmedlemskap og idrettsaktiviteter gir ikke MVA-fradrag, selv om det er personalvelferd.",
    tip: "Bedriften kan betale for trening som naturalytelse, men det er ingen MVA-fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 8-3",
    icon: DumbbellIcon
  },

  // ============================================================================
  // PHONE & TELECOM - TELEFON OG TELEKOM
  // ============================================================================
  {
    id: "mobiltelefon",
    keywords: [
      "mobil", "mobiltelefon", "smartphone", "smarttelefon",
      "iphone", "samsung", "google pixel", "oneplus", "xiaomi", "huawei",
      "oppo", "sony", "nokia", "motorola", "asus", "lg",
      "iphone 15", "iphone 14", "galaxy", "android"
    ],
    category: "telefon",
    verdict: "partial",
    title: "Mobiltelefon",
    shortAnswer: "Delvis - typisk 75% fradrag",
    explanation: "Mobiltelefoner som også brukes privat gir kun delvis MVA-fradrag. Du må vurdere yrkesandelen. Vanligvis godtas 75% som næringsbruk.",
    tip: "Dokumenter at telefonen primært brukes i næring. En ren jobbtelefon uten privatbruk gir 100% fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-2",
    icon: SmartphoneIcon
  },
  {
    id: "telefonabonnement",
    keywords: [
      "telefonabonnement", "mobilabonnement", "abonnement", "datapakke",
      "telenor", "telia", "ice", "talkmore", "onecall", "chilimobil", "happybytes",
      "fjordkraft mobil", "komplett mobil", "mycall"
    ],
    category: "telefon",
    verdict: "partial",
    title: "Mobilabonnement",
    shortAnswer: "Delvis - fordeles etter bruk",
    explanation: "Telefonabonnement som også brukes privat må fordeles. Du kan kun kreve fradrag for næringsandelen av MVA.",
    tip: "75% næringsbruk er vanlig å bruke hvis du ikke har nøyaktig oversikt.",
    legalRef: "Merverdiavgiftsloven § 8-2",
    icon: SmartphoneIcon
  },
  {
    id: "internett",
    keywords: [
      "internett", "bredbånd", "fiber", "wifi", "wlan", "router", "modem",
      "hjemmekontor internett", "4g", "5g", "mobilt bredbånd", "trådløst",
      "altibox", "telenor bredbånd", "telia bredbånd", "get", "canal digital"
    ],
    category: "telefon",
    verdict: "partial",
    title: "Internett / Bredbånd",
    shortAnswer: "Delvis - fordeles ved privat bruk",
    explanation: "Bredbånd på hjemmekontor må fordeles mellom næring og privat bruk. Bredbånd kun på kontoret gir fullt fradrag.",
    tip: "Dokumenter at internett brukes til jobb - f.eks. via arbeidsavtale om hjemmekontor.",
    legalRef: "Merverdiavgiftsloven § 8-2",
    icon: WifiIcon
  },
  {
    id: "fasttelefon",
    keywords: [
      "fasttelefon", "fast telefon", "kontortelefon", "sentralbord",
      "telefonsystem", "ip-telefoni", "voip", "teams telefon"
    ],
    category: "telefon",
    verdict: "yes",
    title: "Fasttelefon / Sentralbord",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Fasttelefoner og telefonsystemer til kontoret gir fullt MVA-fradrag når det kun brukes i virksomheten.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: PhoneIcon
  },

  // ============================================================================
  // IT & ELECTRONICS - IT OG ELEKTRONIKK
  // ============================================================================
  {
    id: "pc-laptop",
    keywords: [
      "pc", "laptop", "bærbar", "datamaskin", "computer", "stasjonær",
      "macbook", "mac", "imac", "mac mini", "mac studio", "mac pro",
      "dell", "hp", "lenovo", "asus", "acer", "microsoft surface",
      "thinkpad", "elitebook", "latitude", "chromebook"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "PC / Laptop",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Datamaskiner og laptoper til bruk i virksomheten gir fullt MVA-fradrag så lenge det brukes i avgiftspliktig virksomhet.",
    exception: "Ved blandet bruk (jobb/privat): Fordel fradraget etter næringsandel.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: LaptopIcon
  },
  {
    id: "nettbrett",
    keywords: [
      "nettbrett", "tablet", "ipad", "ipad pro", "ipad air", "ipad mini",
      "samsung tablet", "galaxy tab", "surface pro", "android nettbrett"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Nettbrett / Tablet",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Nettbrett til bruk i virksomheten gir fullt MVA-fradrag.",
    exception: "Ved blandet bruk: Fordel fradraget etter næringsandel.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: LaptopIcon
  },
  {
    id: "skjerm",
    keywords: [
      "skjerm", "monitor", "dataskjerm", "pcskjerm", "bildeskjerm",
      "ultrawide", "curved", "4k", "8k", "27 tommer", "32 tommer",
      "samsung skjerm", "lg skjerm", "dell skjerm", "benq", "asus skjerm"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "PC-skjerm / Monitor",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Skjermer til arbeidsstasjonen gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MonitorIcon
  },
  {
    id: "tv",
    keywords: [
      "tv", "fjernsyn", "televisjon", "smart tv", "flatskjerm",
      "samsung tv", "lg tv", "sony tv", "philips", "oled", "qled",
      "digital signage", "presentasjonsskjerm", "møteromsskjerm"
    ],
    category: "utstyr",
    verdict: "partial",
    title: "TV / Fjernsyn",
    shortAnswer: "Avhenger av bruk",
    explanation: "TV til rent forretningsmessig bruk (møterom, digital signage) gir fradrag. TV til pauserom eller personalrom kan diskuteres.",
    tip: "Dokumenter at TV-en brukes i virksomheten (f.eks. presentasjoner, videokonferanser).",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: TvIcon
  },
  {
    id: "printer",
    keywords: [
      "printer", "skriver", "blekkskriver", "laserskriver", "multifunksjon",
      "kopimaskin", "scanner", "fax", "plotter", "3d-printer",
      "hp printer", "brother", "canon", "epson", "xerox"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Printer / Skriver",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Printere, skrivere og kopimaskiner til kontoret gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: PrinterIcon
  },
  {
    id: "blekk-toner",
    keywords: [
      "blekk", "blekkpatron", "toner", "tonerpatron", "printblekk",
      "printpapir", "kopipapir", "a4-papir", "fargetoner", "svart toner"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Blekk og toner",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Blekkpatroner, toner og papir til printer gir fullt MVA-fradrag som kontorrekvisita.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: PrinterIcon
  },
  {
    id: "tastatur-mus",
    keywords: [
      "tastatur", "keyboard", "mus", "datamus", "trådløs mus",
      "ergonomisk tastatur", "mekanisk tastatur", "gaming mus",
      "logitech", "microsoft", "apple magic keyboard", "magic mouse"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Tastatur og mus",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Tastatur, mus og annet datautstyr til arbeidsplassen gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: KeyboardIcon
  },
  {
    id: "kamera",
    keywords: [
      "kamera", "digitalkamera", "speilrefleks", "systemkamera", "dslr",
      "canon kamera", "nikon", "sony alpha", "fujifilm", "olympus",
      "gopro", "actionkamera", "webkamera", "webcam", "videokamera",
      "objektiv", "linse", "stativ", "tripod", "kamerabag"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Kamera og foto-utstyr",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Kamera og fotoutstyr til bruk i virksomheten (produktfoto, markedsføring etc.) gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CameraIcon
  },
  {
    id: "headset",
    keywords: [
      "headset", "hodetelefoner", "ørepropper", "earpods", "airpods",
      "bluetooth headset", "trådløst headset", "jabra", "plantronics",
      "bose", "sony hodetelefoner", "sennheiser", "støyreduserende"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Headset / Hodetelefoner",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Headset og hodetelefoner til jobbbruk (videomøter, kundeservice) gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: HeadphonesIcon
  },
  {
    id: "mikrofon",
    keywords: [
      "mikrofon", "mikker", "podcast-mikrofon", "usb-mikrofon",
      "kondensatormikrofon", "studiomikrofon", "blue yeti", "rode",
      "shure", "audio-technica", "klemmemikrofon", "lavalier"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Mikrofon",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Mikrofoner til opptak, podcast, videomøter etc. gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MicIcon
  },
  {
    id: "projektor",
    keywords: [
      "projektor", "prosjektor", "beamer", "videoprojektor",
      "møteprojektor", "presentasjonsprojektor", "hjemmekinoprojektor",
      "lerret", "projektorlerret"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Projektor",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Projektorer til møterom og presentasjoner gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: VideoIcon
  },
  {
    id: "smartklokke",
    keywords: [
      "smartklokke", "smartwatch", "apple watch", "samsung watch",
      "garmin", "fitbit", "polar", "aktivitetsmåler", "pulsklokke"
    ],
    category: "utstyr",
    verdict: "partial",
    title: "Smartklokke",
    shortAnswer: "Delvis - avhenger av bruk",
    explanation: "Smartklokker brukes ofte privat også. Fradrag må fordeles etter næringsandel, typisk 50-75%.",
    tip: "Hvis klokken kun brukes til jobbformål (f.eks. feltarbeid), dokumenter dette.",
    legalRef: "Merverdiavgiftsloven § 8-2",
    icon: WatchIcon
  },
  {
    id: "server",
    keywords: [
      "server", "tjener", "rack", "serverskab", "ups", "avbruddsfri",
      "nas", "lagring", "dell server", "hp server", "synology", "qnap"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Server og lagring",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Servere, NAS og serverutstyr til virksomheten gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ServerIcon
  },
  {
    id: "harddisk",
    keywords: [
      "harddisk", "ekstern harddisk", "ssd", "usb-minne", "minnepinne",
      "flashdrive", "minnekort", "sd-kort", "microsd", "lagring"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Lagringsmedier",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Harddisker, SSD, USB-minne og minnekort til jobben gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: HardDriveIcon
  },
  {
    id: "kabler",
    keywords: [
      "kabel", "kabler", "ladekabel", "usb-kabel", "hdmi", "displayport",
      "ethernet", "nettverkskabel", "strømkabel", "adapter", "hub",
      "docking", "dockingstasjon", "thunderbolt", "usb-c hub"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Kabler og adaptere",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Kabler, adaptere og dockingstasjoner til datautstyr gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: LaptopIcon
  },

  // ============================================================================
  // SOFTWARE & SERVICES - PROGRAMVARE OG TJENESTER
  // ============================================================================
  {
    id: "programvare",
    keywords: [
      "programvare", "software", "lisens", "programvarelisens",
      "microsoft", "office", "microsoft 365", "office 365", "windows",
      "adobe", "creative cloud", "photoshop", "illustrator", "indesign",
      "premiere", "after effects", "acrobat", "lightroom",
      "autodesk", "autocad", "revit", "maya", "3ds max",
      "antivirus", "norton", "mcafee", "kaspersky", "avast"
    ],
    category: "software",
    verdict: "yes",
    title: "Programvare og lisenser",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Programvare og lisenser til bruk i virksomheten gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: LaptopIcon
  },
  {
    id: "saas",
    keywords: [
      "saas", "abonnement", "sky-tjeneste", "cloud", "skytjeneste",
      "dropbox", "google drive", "onedrive", "icloud",
      "slack", "teams", "zoom", "google meet", "webex",
      "asana", "trello", "monday", "notion", "jira", "confluence",
      "salesforce", "hubspot", "mailchimp", "intercom",
      "github", "gitlab", "bitbucket", "figma", "miro",
      "spotify business", "canva", "grammarly", "linkedin premium"
    ],
    category: "software",
    verdict: "yes",
    title: "SaaS og sky-tjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "SaaS-tjenester og skyløsninger gir fullt MVA-fradrag når de brukes i virksomheten.",
    tip: "Utenlandske tjenester uten norsk MVA? Sjekk regler for snudd avregning.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CloudIcon
  },
  {
    id: "regnskap-programvare",
    keywords: [
      "regnskapsprogram", "fiken", "tripletex", "visma", "poweroffice",
      "dnb regnskap", "conta", "uniconta", "xledger", "mamut",
      "fakturering", "fakturaprogram", "timeregistrering"
    ],
    category: "software",
    verdict: "yes",
    title: "Regnskapsprogramvare",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Regnskapsprogrammer og faktureringsløsninger gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CalculatorIcon
  },
  {
    id: "webhotell",
    keywords: [
      "webhotell", "hosting", "domene", "webhosting", "server hosting",
      "one.com", "domeneshop", "pro isp", "simply", "loopia",
      "aws", "azure", "google cloud", "digitalocean", "heroku",
      "wordpress hosting", "e-post hosting"
    ],
    category: "software",
    verdict: "yes",
    title: "Webhotell og hosting",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Webhotell, domener og hosting-tjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: GlobeIcon
  },

  // ============================================================================
  // PROFESSIONAL SERVICES - PROFESJONELLE TJENESTER
  // ============================================================================
  {
    id: "konsulent",
    keywords: [
      "konsulent", "konsulenttjenester", "rådgivning", "rådgiver",
      "managementkonsulent", "it-konsulent", "bedriftskonsulent",
      "prosjektleder", "interim", "innleid"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Konsulenttjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Konsulenttjenester og rådgivning gir fullt MVA-fradrag når det er til bruk i avgiftspliktig virksomhet.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BriefcaseIcon
  },
  {
    id: "advokat",
    keywords: [
      "advokat", "advokatbistand", "juridisk", "juridiske tjenester",
      "advokathjelp", "kontrakt", "kontraktsrett", "arbeidsrett",
      "forretningsadvokat", "prosedyre"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Advokattjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Advokattjenester til forretningsformål gir fullt MVA-fradrag.",
    exception: "Private saker (skilsmisse, arv etc.) gir ikke fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BriefcaseIcon
  },
  {
    id: "regnskapsforer",
    keywords: [
      "regnskapsfører", "regnskap", "bokføring", "regnskapstjenester",
      "regnskapskontor", "bokføringstjenester", "regnskapsbistand",
      "lønnstjenester", "lønnskjøring"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Regnskapstjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Regnskapsførsel, bokføring og lønnstjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CalculatorIcon
  },
  {
    id: "revisor",
    keywords: [
      "revisor", "revisjon", "årsoppgjør", "revisortjenester",
      "revisjonsberetning", "kontrollhandlinger"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Revisjonstjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Revisjon og revisortjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ClipboardIcon
  },
  {
    id: "arkitekt",
    keywords: [
      "arkitekt", "arkitekt tjenester", "arkitektur", "byggeprosjekt",
      "interiørarkitekt", "landskapsarkitekt", "prosjektering"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Arkitekttjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Arkitekttjenester for næringsbygg gir fullt MVA-fradrag.",
    tip: "For private boliger gjelder andre regler.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BuildingIcon
  },
  {
    id: "designer",
    keywords: [
      "designer", "design", "grafisk design", "webdesign", "ux-design",
      "ui-design", "produktdesign", "industridesign", "merkevaredesign",
      "logo", "logodesign", "visuell identitet", "profil"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Designtjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Grafisk design, webdesign og designtjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: PaletteIcon
  },
  {
    id: "fotograf",
    keywords: [
      "fotograf", "fotografering", "produktfoto", "portrettfoto",
      "bedriftsfoto", "reklamefoto", "eventfoto", "industriell foto"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Fotograftjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Fotografering til forretningsformål (produkter, ansatte, markedsføring) gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: CameraIcon
  },
  {
    id: "video-produksjon",
    keywords: [
      "videoproduksjon", "film", "reklamefilm", "promotionsvideo",
      "animasjon", "motion graphics", "videoredigering", "klipping",
      "colorgrading", "lyddesign", "voiceover"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Videoproduksjon",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Videoproduksjon til markedsføring og opplæring gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: VideoIcon
  },
  {
    id: "webutvikling",
    keywords: [
      "webutvikling", "webside", "nettside", "hjemmeside", "app",
      "apputvikling", "programvareutvikling", "systemutvikling",
      "wordpress", "wix", "squarespace", "shopify", "webshop",
      "e-handel", "nettbutikk"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Webutvikling",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Webutvikling, apputvikling og programvareutvikling gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: GlobeIcon
  },
  {
    id: "markedsforing",
    keywords: [
      "markedsføring", "markedsfører", "digital markedsføring", "seo",
      "sem", "google ads", "facebook-annonser", "instagram-annonser",
      "linkedin-annonser", "tiktok", "sosiale medier", "some",
      "innholdsmarkedsføring", "content marketing", "pr", "kommunikasjon",
      "reklame", "reklamebyrå", "mediebyrå", "markedsbyrå"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Markedsføringstjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Markedsførings- og reklametjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MegaphoneIcon
  },
  {
    id: "oversettelse",
    keywords: [
      "oversettelse", "oversetter", "tolking", "tolk", "språktjenester",
      "korrektur", "språkvask", "lokalisering", "translation"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Oversettelses-tjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Oversettelse og tolketjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: GlobeIcon
  },
  {
    id: "rengjoring",
    keywords: [
      "rengjøring", "renhold", "vaskehjelp", "kontorrengjøring",
      "rengjøringsfirma", "rengjøringsbyrå", "renholder", "vasker",
      "vinduspuss", "gulvvask", "hovedrengjøring"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Rengjøringstjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Rengjøringstjenester til kontor og næringslokaler gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: SprayCanIcon
  },
  {
    id: "vaktmester",
    keywords: [
      "vaktmester", "vaktmestertjenester", "facility", "driftstjenester",
      "bygningsdrift", "vedlikeholdstjenester", "håndverker"
    ],
    category: "tjenester",
    verdict: "yes",
    title: "Vaktmester-tjenester",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Vaktmester- og driftstjenester for næringsbygg gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: WrenchIcon
  },

  // ============================================================================
  // EDUCATION & TRAINING - KURS OG OPPLÆRING
  // ============================================================================
  {
    id: "kurs",
    keywords: [
      "kurs", "fagkurs", "kursavgift", "opplæring", "etterutdanning",
      "kompetanseheving", "sertifisering", "opplæringsprogram",
      "e-læring", "nettkurs", "webinar", "online kurs", "mooc",
      "kursmateriell", "kursdeltakelse"
    ],
    category: "kurs",
    verdict: "no",
    title: "Kurs og opplæring",
    shortAnswer: "Nei, undervisning er MVA-fritatt",
    explanation: "Undervisning og kurs er fritatt for MVA (0% sats). Ingen MVA betalt = ingenting å kreve fradrag for.",
    tip: "Selv om du ikke får MVA-fradrag, er kurskostnaden ofte skattemessig fradragsberettiget!",
    legalRef: "Merverdiavgiftsloven § 3-5",
    icon: GraduationCapIcon
  },
  {
    id: "konferanse",
    keywords: [
      "konferanse", "konferanseavgift", "konferansedeltakelse",
      "fagkonferanse", "bransjekonferanse", "messe", "utstilling",
      "trade show", "expo"
    ],
    category: "kurs",
    verdict: "partial",
    title: "Konferanse / Messe",
    shortAnswer: "Delvis - avhenger av innhold",
    explanation: "Ren kursavgift er MVA-fri, men konferansepakker med mat, overnatting etc. kan ha MVA på deler av prisen.",
    tip: "Sjekk fakturaen nøye - den bør spesifisere hva som har MVA.",
    legalRef: "Merverdiavgiftsloven § 3-5",
    icon: GraduationCapIcon
  },
  {
    id: "foredrag",
    keywords: [
      "foredrag", "foredragsholder", "keynote", "speaker", "inspirasjon",
      "motivasjonsforedrag", "fagforedrag", "gjesteforeleser"
    ],
    category: "kurs",
    verdict: "no",
    title: "Foredrag",
    shortAnswer: "Nei, undervisning er MVA-fritatt",
    explanation: "Foredrag og undervisning er fritatt for MVA. Ingen MVA = ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-5",
    icon: GraduationCapIcon
  },
  {
    id: "coaching",
    keywords: [
      "coaching", "coach", "mentor", "mentoring", "karriereveiledning",
      "lederutvikling", "executive coaching", "business coaching"
    ],
    category: "kurs",
    verdict: "partial",
    title: "Coaching / Mentoring",
    shortAnswer: "Avhenger av type tjeneste",
    explanation: "Coaching som undervisning kan være MVA-fritatt. Konsulentpreget coaching kan ha MVA.",
    tip: "Sjekk fakturaen - hvis det står MVA, kan du kreve fradrag.",
    legalRef: "Merverdiavgiftsloven § 3-5",
    icon: GraduationCapIcon
  },
  {
    id: "faglitteratur",
    keywords: [
      "bok", "bøker", "fagbok", "fagbøker", "lærebok", "oppslagsverk",
      "faglitteratur", "pensum", "litteratur", "bibliotek",
      "akademisk", "håndbok", "manual"
    ],
    category: "kurs",
    verdict: "no",
    title: "Faglitteratur / Bøker",
    shortAnswer: "Nei, bøker har 0% MVA",
    explanation: "Trykte bøker har 0% MVA i Norge. Ingen MVA betalt = ingen fradragsrett.",
    tip: "E-bøker har derimot 25% MVA og gir fradragsrett!",
    legalRef: "Merverdiavgiftsloven § 6-3",
    icon: BookIcon
  },
  {
    id: "ebøker",
    keywords: [
      "e-bok", "ebok", "digital bok", "kindle", "audible", "lydbok"
    ],
    category: "kurs",
    verdict: "yes",
    title: "E-bøker og lydbøker",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Digitale bøker og lydbøker har 25% MVA og gir fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BookIcon
  },

  // ============================================================================
  // OFFICE & FURNITURE - KONTOR OG MØBLER
  // ============================================================================
  {
    id: "kontormobler",
    keywords: [
      "kontormøbler", "møbler", "skrivebord", "arbeidspult", "hevsenk",
      "kontorstol", "ergonomisk stol", "arbeidsstol", "direktørstol",
      "hylle", "bokhylle", "skap", "arkivskap", "garderobeskap",
      "møtebord", "konferansebord", "resepsjon", "skranke"
    ],
    category: "kontor",
    verdict: "yes",
    title: "Kontormøbler",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Møbler og inventar til kontoret gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ArmchairIcon
  },
  {
    id: "belysning",
    keywords: [
      "lampe", "lys", "belysning", "skrivebordslampe", "taklampe",
      "gulvlampe", "led", "lyspære", "spot", "arbeidslampe"
    ],
    category: "kontor",
    verdict: "yes",
    title: "Belysning",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Lamper og belysning til kontoret gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: LampIcon
  },
  {
    id: "kontorrekvisita",
    keywords: [
      "kontorrekvisita", "rekvisita", "penn", "penner", "blyant",
      "notisblokk", "notisbok", "post-it", "klistremerke", "tape",
      "lim", "stifter", "stiftemaskin", "hullemaskin", "saks",
      "permer", "mapper", "arkivboks", "konvolutter", "frimerker"
    ],
    category: "kontor",
    verdict: "yes",
    title: "Kontorrekvisita",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Kontorrekvisita og forbruksmateriell gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ClipboardIcon
  },
  {
    id: "whiteboard",
    keywords: [
      "whiteboard", "tavle", "skrivetavle", "flipover", "flipoverblokk",
      "tusjer", "whiteboardtusj", "whiteboardvisker", "magneter"
    ],
    category: "kontor",
    verdict: "yes",
    title: "Whiteboard og tavler",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Whiteboard, flipover og tilbehør gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ClipboardIcon
  },

  // ============================================================================
  // REAL ESTATE - EIENDOM
  // ============================================================================
  {
    id: "husleie",
    keywords: [
      "husleie", "kontorleie", "leie av lokale", "lokale", "næringslokale",
      "leiekontrakt", "leieavtale", "kontor", "butikk", "lagerlokale",
      "felleskostnader", "husleietillegg"
    ],
    category: "eiendom",
    verdict: "partial",
    title: "Husleie / Kontorleie",
    shortAnswer: "Kun hvis utleier er frivillig registrert",
    explanation: "Utleie av fast eiendom er i utgangspunktet MVA-fritt. Men utleier kan være frivillig registrert og fakturere med MVA - da får du fradrag.",
    tip: "Sjekk fakturaen! Hvis det står MVA, kan du kreve fradrag.",
    legalRef: "Merverdiavgiftsloven § 3-11",
    icon: BuildingIcon
  },
  {
    id: "lager",
    keywords: [
      "lager", "lagerplass", "lagerleie", "minilager", "oppbevaring",
      "lagring", "varelager", "eksternt lager", "citylager"
    ],
    category: "eiendom",
    verdict: "partial",
    title: "Lagerleie",
    shortAnswer: "Avhenger av utleier",
    explanation: "Lagerleie kan ha MVA hvis utleier er frivillig registrert. Sjekk fakturaen.",
    legalRef: "Merverdiavgiftsloven § 3-11",
    icon: PackageIcon
  },
  {
    id: "kontorhotell",
    keywords: [
      "kontorhotell", "coworking", "delt kontor", "wework", "spaces",
      "regus", "meetingpoint", "tøyen startup village", "mesh",
      "kontorfellesskap", "kontorplass", "arbeidsplass"
    ],
    category: "eiendom",
    verdict: "yes",
    title: "Kontorhotell / Coworking",
    shortAnswer: "Ja, normalt fullt MVA-fradrag",
    explanation: "Kontorhotell og coworking-plasser fakturerer normalt med MVA, så du får fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BuildingIcon
  },
  {
    id: "moterom",
    keywords: [
      "møterom", "møteromsleie", "konferanserom", "kurslokale",
      "leie av møterom", "timeleie", "dagsleie"
    ],
    category: "eiendom",
    verdict: "yes",
    title: "Møteromsleie",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Korttidsleie av møterom har normalt MVA og gir fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: BuildingIcon
  },

  // ============================================================================
  // MARKETING & ADVERTISING - MARKEDSFØRING
  // ============================================================================
  {
    id: "annonsering",
    keywords: [
      "annonse", "annonsering", "reklame", "kampanje", "google ads",
      "facebook ads", "instagram ads", "linkedin ads", "tiktok ads",
      "display-annonser", "banner", "søkeannonser", "ppc", "cpc",
      "youtube-annonser", "snapchat", "twitter ads", "x ads"
    ],
    category: "markedsforing",
    verdict: "yes",
    title: "Digital annonsering",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Digital annonsering og online-reklame gir fullt MVA-fradrag.",
    tip: "Utenlandske plattformer (Google, Facebook) kan kreve snudd avregning.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MegaphoneIcon
  },
  {
    id: "trykt-reklame",
    keywords: [
      "plakat", "flyer", "brosjyre", "katalog", "visittkort", "roll-up",
      "banner", "messemateriale", "salgsmateriale", "reklamemateriell",
      "trykksak", "trykksaker", "printmateriell"
    ],
    category: "markedsforing",
    verdict: "yes",
    title: "Trykksaker og reklamemateriell",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Trykksaker, plakater og reklamemateriell gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: FileTextIcon
  },
  {
    id: "messestand",
    keywords: [
      "messestand", "stand", "utstilling", "messe", "standbetjening",
      "rollup", "beachflag", "messeutstyr", "messebord"
    ],
    category: "markedsforing",
    verdict: "yes",
    title: "Messeutstyr",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Messestand, roll-ups og utstillingsutstyr gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: FlagIcon
  },
  {
    id: "profilering",
    keywords: [
      "profilering", "profilartikler", "give-aways", "giveaways",
      "reklameartikler", "firmalogo", "logoprodukt", "t-skjorte",
      "caps", "nøkkelring", "penn med logo", "paraply", "kopp"
    ],
    category: "markedsforing",
    verdict: "partial",
    title: "Profilartikler",
    shortAnswer: "Delvis - verdigrense gjelder",
    explanation: "Reklameartikler under kr 100 eks. mva gir fradrag. Dyrere artikler regnes som gave.",
    tip: "Penner, notisblokker og lignende lavverdiprodukter gir fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-3 (1) f",
    icon: GiftIcon
  },

  // ============================================================================
  // INSURANCE & FINANCE - FORSIKRING OG FINANS
  // ============================================================================
  {
    id: "forsikring",
    keywords: [
      "forsikring", "bedriftsforsikring", "naeringsforsikring", "ansvarsforsikring",
      "innboforsikring", "bygningsforsikring", "bilforsikring", "reiseforsikring",
      "yrkesskadeforsikring", "pensjonsforsikring", "livsforsikring",
      "if", "gjensidige", "tryg", "storebrand", "frende", "eika"
    ],
    category: "finans",
    verdict: "no",
    title: "Forsikring",
    shortAnswer: "Nei, forsikring er MVA-fritt",
    explanation: "Forsikringstjenester er fritatt for MVA. Ingen MVA = ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-6",
    icon: ShieldIcon
  },
  {
    id: "bank",
    keywords: [
      "bank", "banktjenester", "bankgebyr", "kortgebyr", "terminalprovison",
      "nets", "vipps", "betalingsterminal", "kortterminal", "lån", "renter",
      "dnb", "nordea", "sparebank", "handelsbanken", "danske bank"
    ],
    category: "finans",
    verdict: "no",
    title: "Banktjenester",
    shortAnswer: "Nei, finansielle tjenester er MVA-fritt",
    explanation: "Banktjenester og finansielle tjenester er fritatt for MVA. Ingen MVA = ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-6",
    icon: BanknoteIcon
  },
  {
    id: "inkasso",
    keywords: [
      "inkasso", "inkassotjenester", "purring", "inndrivelse", "kreditt",
      "factoring", "fakturakjøp"
    ],
    category: "finans",
    verdict: "no",
    title: "Inkasso og factoring",
    shortAnswer: "Nei, finansielle tjenester er MVA-fritt",
    explanation: "Inkasso og factoring er finansielle tjenester uten MVA. Ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-6",
    icon: BanknoteIcon
  },
  {
    id: "leasing",
    keywords: [
      "leasing", "finansiell leasing", "operasjonell leasing",
      "leasingavtale", "finansieringsleasing"
    ],
    category: "finans",
    verdict: "partial",
    title: "Leasing",
    shortAnswer: "Avhenger av leasingobjekt",
    explanation: "Leasing av driftsmidler (ikke personbil) kan gi MVA-fradrag på leasingavgiften.",
    exception: "Leasing av personbil: Ingen MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-4",
    icon: CreditCardIcon
  },

  // ============================================================================
  // HEALTH & SAFETY - HMS OG HELSE
  // ============================================================================
  {
    id: "hms-utstyr",
    keywords: [
      "hms", "vernebriller", "hjelm", "vernesko", "verneklær",
      "hørselsvern", "verneutstyr", "sikkerhetsutstyr", "åndedrettsvern",
      "hansker", "arbeidshansker", "refleksvest", "fallutstyr"
    ],
    category: "hms",
    verdict: "yes",
    title: "HMS-utstyr og verneutstyr",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Verneutstyr og HMS-materiell til ansatte gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: HardHatIcon
  },
  {
    id: "forstehjelp",
    keywords: [
      "førstehjelp", "førstehjelpsutstyr", "førstehjelpskoffert",
      "hjertestarter", "defibrillator", "brannslokkingsapparat",
      "brannslukker", "brannvarsler", "røykvarsler"
    ],
    category: "hms",
    verdict: "yes",
    title: "Førstehjelpsutstyr",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Førstehjelpsutstyr og brannsikkerhetsutstyr gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: HeartPulseIcon
  },
  {
    id: "bedriftshelsetjeneste",
    keywords: [
      "bht", "bedriftshelsetjeneste", "helse", "helsesjekk", "helseundersøkelse",
      "arbeidsmiljø", "ergonomi", "fysioterapi", "bedriftslege"
    ],
    category: "hms",
    verdict: "no",
    title: "Bedriftshelsetjeneste",
    shortAnswer: "Nei, helsetjenester er MVA-fritt",
    explanation: "Helsetjenester er fritatt for MVA. Ingen MVA = ingen fradragsrett.",
    legalRef: "Merverdiavgiftsloven § 3-2",
    icon: StethoscopeIcon
  },
  {
    id: "arbeidsklær",
    keywords: [
      "arbeidsklær", "uniform", "bekledning", "vernetøy", "kjeledress",
      "arbeidsbukse", "arbeidsjakke", "t-skjorte med logo"
    ],
    category: "hms",
    verdict: "partial",
    title: "Arbeidsklær",
    shortAnswer: "Avhenger av type",
    explanation: "Verneklær og uniformer med firmamerke gir fradrag. Vanlige klær gir normalt ikke fradrag.",
    tip: "Klær med tydelig firmalogo og som ikke kan brukes privat gir fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ShirtIcon
  },

  // ============================================================================
  // TOOLS & EQUIPMENT - VERKTØY OG MASKINER
  // ============================================================================
  {
    id: "verktoy",
    keywords: [
      "verktøy", "håndverktøy", "elektroverktøy", "maskin", "maskiner",
      "drill", "skrutrekker", "hammer", "sag", "slipemaskin",
      "sveiseapparat", "kompressor", "høytrykkspyler", "målebånd",
      "vater", "laser", "lasermåler", "multimeter"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Verktøy og maskiner",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Verktøy og maskiner til bruk i virksomheten gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: WrenchIcon
  },
  {
    id: "stige",
    keywords: [
      "stige", "gardintrapp", "stillas", "lift", "arbeidslift",
      "sakselift", "bomlift"
    ],
    category: "utstyr",
    verdict: "yes",
    title: "Stige og lift",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Stiger, stillaser og lifter til virksomheten gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: WrenchIcon
  },

  // ============================================================================
  // UTILITIES - STRØM OG FORBRUK
  // ============================================================================
  {
    id: "strom",
    keywords: [
      "strøm", "elektrisitet", "kraftleverandør", "strømregning",
      "strømavtale", "nettleie", "tibber", "fjordkraft", "hafslund",
      "lyse", "agva", "strømpris"
    ],
    category: "drift",
    verdict: "yes",
    title: "Strøm",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Strøm til næringslokaler gir fullt MVA-fradrag.",
    exception: "Hjemmekontor: Fordel etter næringsandel.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: ZapIcon
  },
  {
    id: "oppvarming",
    keywords: [
      "oppvarming", "fjernvarme", "gass", "olje", "fyringsolje",
      "pellets", "ved", "propan", "varme"
    ],
    category: "drift",
    verdict: "yes",
    title: "Oppvarming",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Oppvarming av næringslokaler gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: FlameIcon
  },
  {
    id: "vann-avlop",
    keywords: [
      "vann", "vannforsyning", "avløp", "kloakk", "kommunale avgifter",
      "renovasjon", "søppel", "avfallshåndtering"
    ],
    category: "drift",
    verdict: "no",
    title: "Vann og renovasjon",
    shortAnswer: "Nei, kommunale avgifter er MVA-fritt",
    explanation: "Vann, avløp og renovasjon er kommunale tjenester uten MVA.",
    legalRef: "Merverdiavgiftsloven § 3-9",
    icon: DropletIcon
  },

  // ============================================================================
  // MISCELLANEOUS - DIVERSE
  // ============================================================================
  {
    id: "porto",
    keywords: [
      "porto", "frimerke", "frimerker", "frakt", "sending", "pakke",
      "posten", "postnord", "bring", "dhl", "ups", "fedex", "helthjem"
    ],
    category: "drift",
    verdict: "yes",
    title: "Porto og frakt",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Porto og frakttjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MailIcon
  },
  {
    id: "postboks",
    keywords: [
      "postboks", "postadresse", "postmottak", "postombud"
    ],
    category: "drift",
    verdict: "yes",
    title: "Postboks",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Postboks og posttjenester gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: MailboxIcon
  },
  {
    id: "avis-tidsskrift",
    keywords: [
      "avis", "aviser", "tidsskrift", "magasin", "fagblad", "abonnement",
      "e-avis", "digital avis", "nettavis", "vg", "dagbladet", "aftenposten",
      "dagens næringsliv", "dn", "finansavisen", "e24"
    ],
    category: "drift",
    verdict: "no",
    title: "Aviser og tidsskrifter",
    shortAnswer: "Nei, trykte aviser har 0% MVA",
    explanation: "Trykte aviser og tidsskrifter har 0% MVA. Ingen MVA = ingen fradragsrett.",
    tip: "E-aviser har 25% MVA og gir fradragsrett!",
    legalRef: "Merverdiavgiftsloven § 6-2",
    icon: NewspaperIcon
  },
  {
    id: "planter-blomster",
    keywords: [
      "planter", "kontorplanter", "grøntanlegg", "blomster", "plantestell",
      "vedlikehold planter", "plantevanning", "grønne planter"
    ],
    category: "drift",
    verdict: "yes",
    title: "Kontorplanter",
    shortAnswer: "Ja, fullt MVA-fradrag",
    explanation: "Planter til kontoret og plantestell gir fullt MVA-fradrag.",
    legalRef: "Merverdiavgiftsloven § 8-1",
    icon: TreesIcon
  },
  {
    id: "kunst",
    keywords: [
      "kunst", "kunstverk", "maleri", "skulptur", "kunstinnkjøp",
      "galleri", "original kunst", "kunstner"
    ],
    category: "drift",
    verdict: "partial",
    title: "Kunst",
    shortAnswer: "Avhenger av type og kjøper",
    explanation: "Originale kunstverk fra kunstner har 5% MVA. Kunst til utsmykning av næringslokaler kan gi fradrag.",
    legalRef: "Merverdiavgiftsloven § 5-9",
    icon: FrameIcon
  },
  {
    id: "musikk-lisens",
    keywords: [
      "tono", "gramo", "musikkrettigheter", "bakgrunnsmusikk",
      "ventemusikk", "spotify premium", "apple music"
    ],
    category: "drift",
    verdict: "partial",
    title: "Musikklisenser",
    shortAnswer: "Avhenger av lisenstype",
    explanation: "TONO/GRAMO-avgift er normalt MVA-fri. Streaming-tjenester kan ha MVA.",
    legalRef: "Merverdiavgiftsloven § 3-7",
    icon: MusicIcon
  },
  {
    id: "for-registrering",
    keywords: [
      "før registrering", "før mva", "kjøpt før", "før jeg registrerte",
      "tilbake i tid", "retroaktivt", "tilbakegående", "oppstart",
      "etableringskostnader", "før oppstart"
    ],
    category: "pre-registration",
    verdict: "no",
    title: "Kjøp før MVA-registrering",
    shortAnswer: "Nei, ikke automatisk fradrag",
    explanation: "Kjøp gjort FØR bedriften ble MVA-registrert gir normalt ikke fradrag. Du har ikke rett til å fakturere med MVA eller kreve fradrag på kjøp før registreringsdato.",
    exception: "Unntak: Ved tilbakegående avgiftsoppgjør kan du søke om fradrag for driftsmidler (ikke forbruksvarer) inntil 3 år tilbake.",
    tip: "Send inn tilleggsmelding hvis du har kapitalvarer kjøpt før registrering.",
    legalRef: "Merverdiavgiftsloven § 8-6",
    icon: PackageIcon
  }
];

// Quick access categories
interface QuickCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  query: string;
  color: string;
}

const quickCategories: QuickCategory[] = [
  { id: "bil", label: "Bil", icon: CarIcon, query: "personbil", color: "from-rose-500/20 to-rose-600/10" },
  { id: "mat", label: "Mat", icon: UtensilsIcon, query: "mat", color: "from-amber-500/20 to-amber-600/10" },
  { id: "representasjon", label: "Representasjon", icon: WineIcon, query: "representasjon", color: "from-purple-500/20 to-purple-600/10" },
  { id: "hotell", label: "Hotell", icon: BedDoubleIcon, query: "hotell", color: "from-blue-500/20 to-blue-600/10" },
  { id: "telefon", label: "Telefon", icon: SmartphoneIcon, query: "mobiltelefon", color: "from-emerald-500/20 to-emerald-600/10" },
  { id: "utstyr", label: "PC/Utstyr", icon: LaptopIcon, query: "pc laptop", color: "from-cyan-500/20 to-cyan-600/10" },
  { id: "kurs", label: "Kurs", icon: GraduationCapIcon, query: "kurs", color: "from-indigo-500/20 to-indigo-600/10" },
  { id: "programvare", label: "Software", icon: CloudIcon, query: "programvare", color: "from-violet-500/20 to-violet-600/10" }
];

const verdictConfig = {
  yes: {
    icon: CheckCircleIcon,
    label: "Ja, fradrag!",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800/50",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-green-400"
  },
  no: {
    icon: XCircleIcon,
    label: "Nei, ingen fradrag",
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800/50",
    gradientFrom: "from-rose-500",
    gradientTo: "to-red-400"
  },
  partial: {
    icon: AlertCircleIcon,
    label: "Delvis fradrag",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800/50",
    gradientFrom: "from-amber-500",
    gradientTo: "to-yellow-400"
  }
};

export function Fradragsveiviser() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DeductionRule | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [hasUsedRecently, setHasUsedRecently] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track if user has used the tool recently
  useEffect(() => {
    if (result) {
      setHasUsedRecently(true);
    }
  }, [result]);

  // Search logic with improved matching
  const searchDeductions = (searchQuery: string) => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery.length < 2) {
      setResult(null);
      setShowResult(false);
      return;
    }

    // Find best matching rule
    let bestMatch: DeductionRule | null = null;
    let bestScore = 0;

    for (const rule of deductionRules) {
      for (const keyword of rule.keywords) {
        const normalizedKeyword = keyword.toLowerCase();
        let score = 0;

        // Exact match
        if (normalizedQuery === normalizedKeyword) {
          score = 100;
        }
        // Query contains keyword
        else if (normalizedQuery.includes(normalizedKeyword)) {
          score = 80 + (normalizedKeyword.length / normalizedQuery.length) * 15;
        }
        // Keyword contains query
        else if (normalizedKeyword.includes(normalizedQuery)) {
          score = 60 + (normalizedQuery.length / normalizedKeyword.length) * 15;
        }
        // Word starts with query
        else if (normalizedKeyword.startsWith(normalizedQuery)) {
          score = 70;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = rule;
        }
      }
    }

    setResult(bestMatch);
    setShowResult(true);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setIsSearching(true);

    // Debounce search
    const timer = setTimeout(() => {
      searchDeductions(value);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  };

  const handleQuickCategory = (cat: QuickCategory) => {
    setQuery(cat.query);
    searchDeductions(cat.query);
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setShowResult(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // ============================================================================
          // COLLAPSED STATE - Inviting button with Ciri and animated speech bubble
          // ============================================================================
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className="group relative w-full overflow-hidden rounded-2xl border-2 border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/5 via-background to-[var(--secondary)]/5 p-5 text-left transition-all duration-300 hover:border-[var(--primary)]/50 hover:shadow-lg hover:shadow-[var(--primary)]/10"
            >
              {/* Aurora background effect */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-20 -top-20 size-64 rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-400/20 to-[var(--primary)]/20 blur-3xl"
                />
                <motion.div
                  animate={{
                    x: [0, -80, 0],
                    y: [0, 40, 0],
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-10 -right-20 size-48 rounded-full bg-gradient-to-tl from-violet-400/20 via-[var(--secondary)]/20 to-pink-400/20 blur-3xl"
                />
              </div>

              <div className="relative flex items-center gap-4">
                {/* Ciri Avatar with glow effect */}
                <div className="relative shrink-0">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(var(--primary-rgb), 0.2)",
                        "0 0 30px rgba(var(--primary-rgb), 0.4)",
                        "0 0 20px rgba(var(--primary-rgb), 0.2)",
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-full"
                  >
                    <CiriLogo size="lg" />
                  </motion.div>
                  {/* Recent use indicator */}
                  {hasUsedRecently && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background"
                    >
                      <CheckCircleIcon className="size-3 text-white" />
                    </motion.span>
                  )}
                </div>

                {/* Speech bubble */}
                <div className="relative flex-1">
                  <div className="relative rounded-2xl rounded-bl-md border border-[var(--primary)]/20 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/10">
                    {/* Bubble tail */}
                    <div className="absolute -left-2 bottom-3 size-3 rotate-45 border-b border-l border-[var(--primary)]/20 bg-white/80 dark:bg-white/10" />

                    <p className="font-display text-base font-semibold tracking-tight text-foreground">
                      Lurer du på MVA-fradrag?
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Klikk for å spørre meg om hva som kan trekkes fra
                    </p>

                    {/* Sparkle decorations */}
                    <SparklesIcon className="absolute -right-2 -top-2 size-4 text-[var(--primary)]" />
                  </div>
                </div>

                {/* Expand indicator */}
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="shrink-0"
                >
                  <ChevronRightIcon className="size-5 text-muted-foreground transition-colors group-hover:text-[var(--primary)]" />
                </motion.div>
              </div>
            </button>
          </motion.div>
        ) : (
          // ============================================================================
          // EXPANDED STATE - Full Fradragsveiviser functionality
          // ============================================================================
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              height: "auto",
              scale: 1,
              transition: {
                height: { type: "spring", stiffness: 200, damping: 30 },
                opacity: { duration: 0.3 },
                scale: { type: "spring", stiffness: 300, damping: 25 }
              }
            }}
            exit={{
              opacity: 0,
              height: 0,
              scale: 0.95,
              transition: { duration: 0.25, ease: "easeInOut" }
            }}
            className="overflow-hidden rounded-2xl border-2 border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 via-background to-[var(--secondary)]/5"
          >
            {/* Aurora reveal effect on expand */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <motion.div
                initial={{ x: -200, y: -200, scale: 0 }}
                animate={{ x: 0, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -right-32 -top-32 size-96 rounded-full bg-gradient-to-br from-emerald-400/10 via-cyan-400/10 to-[var(--primary)]/10 blur-3xl"
              />
              <motion.div
                initial={{ x: 200, y: 200, scale: 0 }}
                animate={{ x: 0, y: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -bottom-20 -left-20 size-64 rounded-full bg-gradient-to-tr from-violet-400/10 via-[var(--secondary)]/10 to-pink-400/10 blur-2xl"
              />
            </motion.div>

            {/* Header with minimize button */}
            <div className="relative border-b border-[var(--primary)]/10 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] opacity-20 blur" />
                    <div className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]">
                      <BookOpenIcon className="size-6 text-white" />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="font-display text-xl font-bold tracking-tight">Fradragsveiviseren</h3>
                    <p className="text-sm text-muted-foreground">Spør Ciri: Kan jeg trekke fra MVA på dette?</p>
                  </motion.div>
                </div>

                {/* Minimize button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  onClick={() => setIsExpanded(false)}
                  className="group flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-white/50 px-3 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-[var(--primary)]/40 hover:bg-white/80 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <MinimizeIcon className="size-4" />
                  <span className="hidden sm:inline">Minimer</span>
                  <ChevronDownIcon className="size-3 transition-transform group-hover:translate-y-0.5" />
                </motion.button>
              </div>
            </div>

      <div className="relative p-6 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--primary)]/20 to-[var(--secondary)]/20 blur-sm" />
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="F.eks. &quot;firmabil&quot;, &quot;kundemiddag&quot;, &quot;laptop&quot;, &quot;kurs&quot;..."
              className="h-14 w-full rounded-xl border-2 border-[var(--primary)]/30 bg-white/80 pl-12 pr-4 text-lg shadow-sm backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 dark:bg-white/5"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XCircleIcon className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Categories */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vanlige spørsmål</p>
          <div className="flex flex-wrap gap-2">
            {quickCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleQuickCategory(cat)}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-gradient-to-r px-4 py-2 text-sm font-medium transition-all hover:border-[var(--primary)]/40 hover:shadow-md",
                    cat.color
                  )}
                >
                  <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span>{cat.label}</span>
                  <ChevronRightIcon className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {showResult && result && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Verdict Banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 p-6",
                  verdictConfig[result.verdict].bgColor,
                  verdictConfig[result.verdict].borderColor
                )}
              >
                {/* Animated gradient background */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-10",
                  verdictConfig[result.verdict].gradientFrom,
                  verdictConfig[result.verdict].gradientTo
                )} />

                <div className="relative flex items-start gap-4">
                  {/* Verdict Icon with pulse effect */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="relative"
                  >
                    <div className={cn(
                      "absolute -inset-2 rounded-full blur-md",
                      result.verdict === "yes" ? "bg-emerald-400/30" :
                      result.verdict === "no" ? "bg-rose-400/30" :
                      "bg-amber-400/30"
                    )} />
                    {(() => {
                      const VerdictIcon = verdictConfig[result.verdict].icon;
                      return (
                        <div className={cn(
                          "relative flex size-14 items-center justify-center rounded-full",
                          result.verdict === "yes" ? "bg-emerald-100 dark:bg-emerald-900/50" :
                          result.verdict === "no" ? "bg-rose-100 dark:bg-rose-900/50" :
                          "bg-amber-100 dark:bg-amber-900/50"
                        )}>
                          <VerdictIcon className={cn("size-8", verdictConfig[result.verdict].color)} />
                        </div>
                      );
                    })()}
                  </motion.div>

                  <div className="flex-1 space-y-1">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <p className={cn("text-sm font-semibold uppercase tracking-wider", verdictConfig[result.verdict].color)}>
                        {verdictConfig[result.verdict].label}
                      </p>
                      <h4 className="font-display text-2xl font-bold tracking-tight">{result.title}</h4>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg font-medium"
                    >
                      {result.shortAnswer}
                    </motion.p>
                  </div>

                  {/* Category Icon */}
                  {(() => {
                    const CategoryIcon = result.icon;
                    return (
                      <CategoryIcon className="size-8 text-muted-foreground/30" />
                    );
                  })()}
                </div>
              </motion.div>

              {/* Explanation Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl border bg-white/50 p-5 backdrop-blur-sm dark:bg-white/5"
              >
                <p className="leading-relaxed text-foreground/90">
                  {result.explanation}
                </p>

                {result.exception && (
                  <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                    <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{result.exception}</p>
                  </div>
                )}
              </motion.div>

              {/* Tip from Ciri */}
              {result.tip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-4 rounded-xl border-2 border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/10 to-transparent p-5"
                >
                  <div className="relative shrink-0">
                    <CiriLogo size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                      <span className="relative inline-flex size-3 rounded-full bg-[var(--primary)]">
                        <LightbulbIcon className="size-2 m-auto text-white" />
                      </span>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--primary)]">Tips fra Ciri</p>
                    <p className="mt-1 text-sm text-muted-foreground">{result.tip}</p>
                  </div>
                </motion.div>
              )}

              {/* Legal Reference */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-xs text-muted-foreground"
              >
                <span>Hjemmel: {result.legalRef}</span>
                <a href="https://lovdata.no/dokument/NL/lov/2009-06-19-58" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-[var(--primary)] hover:underline">
                  Les mer på Lovdata
                  <ChevronRightIcon className="size-3" />
                </a>
              </motion.div>
            </motion.div>
          )}

          {/* No Result State */}
          {showResult && !result && query.length >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center"
            >
              <div className="flex justify-center">
                <CiriLogo size="md" />
              </div>
              <p className="mt-4 text-lg font-medium">Hmm, jeg fant ikke noe om &quot;{query}&quot;</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prøv å søke med andre ord, eller velg en kategori over.
              </p>
            </motion.div>
          )}

          {/* Empty State */}
          {!showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20">
                <SparklesIcon className="size-8 text-[var(--primary)]" />
              </div>
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                Skriv hva du lurer på - jeg hjelper deg!
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                F.eks. &quot;Kan jeg trekke fra MVA på firmabilen?&quot;
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
