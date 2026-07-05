// ============================================================
// AL BOWRY CARPENTRY — CONFIGURATION
// Version: 3.0.0 | BLUE THEME EDITION
// ============================================================

const CONFIG = {

    company: {
        name:       "AL BOWRY CARPENTRY",
        nameAr:     "نجارة البوري",
        tagline:    "Professional Carpentry & Woodwork Services",
        taglineAr:  "خدمات النجارة والأعمال الخشبية المهنية",
        
        email:      "albowry1989@gmail.com",
        phone:      "+971 50 000 0000",
        mobile:     "+971 55 000 0000",
        whatsapp:   "+971 50 000 0000",
        
        website:    "www.albowry.com",
        instagram:  "@albowrycarpentry",
        
        address:    "Industrial Area",
        emirate:    "Dubai",
        country:    "United Arab Emirates",
        poBox:      "00000",
        
        trn:        "",
        license:    "",
        
        logoId:     "1ZWhnx4XPyTzQcDFsDVL0sUxun8sv2Vx4",
        logo:       "company-logo.png",
        
        colors: {
            primary:    "#1a4d8f",
            secondary:  "#0c3672",
            gold:       "#ffd700",
            goldLight:  "#ffe135",
            accent:     "#2266b3"
        }
    },

    bank: {
        name:           "",
        accountName:    "Al Bowry Carpentry",
        accountNumber:  "",
        iban:           "",
        swift:          "",
        branch:         "",
        currency:       "AED"
    },

    invoice: {
        prefix:         "ABC-",
        startNumber:    1,
        currency:       "AED",
        currencySymbol: "د.إ",
        defaultVAT:     5,
        dueDays:        30,
        
        paymentTerms:   "Payment is due within 30 days of invoice date. Late payments may be subject to a 2% monthly service charge. All disputes shall be governed by UAE law and jurisdiction of Dubai courts.",
        
        thankYou:       "Thank you for choosing Al Bowry Carpentry for your project. We value your trust and look forward to serving you again. For any queries, please contact us at albowry1989@gmail.com.",
        
        footer:         "This is a computer-generated invoice and is valid without signature and stamp.",
        
        watermarks: {
            draft:      "DRAFT",
            cancelled:  "CANCELLED",
            duplicate:  "DUPLICATE COPY"
        }
    },

    scriptURL: "https://script.google.com/macros/s/AKfycbxmImNQQiI4UYd9lKbnGwqZnkxNB7ifUOc-MKWpu1R8IxZEsRndliDwuDK4M1x7Zd4Q/exec",

    units: [
        "PCS", "SQ.FT", "SQ.M", "R.FT", "R.M",
        "METER", "FEET", "INCH", "CM",
        "HOURS", "DAYS", "WEEKS", "MONTHS",
        "LOT", "JOB", "SET", "NOS",
        "KG", "GRAM", "TON",
        "LITER", "GALLON",
        "BOX", "ROLL", "SHEET", "PANEL", "BUNDLE"
    ],

    currencies: [
        { code: "AED", name: "UAE Dirham",       symbol: "د.إ",  flag: "🇦🇪", decimal: 2 },
        { code: "USD", name: "US Dollar",        symbol: "$",    flag: "🇺🇸", decimal: 2 },
        { code: "EUR", name: "Euro",             symbol: "€",    flag: "🇪🇺", decimal: 2 },
        { code: "GBP", name: "British Pound",    symbol: "£",    flag: "🇬🇧", decimal: 2 },
        { code: "SAR", name: "Saudi Riyal",      symbol: "﷼",   flag: "🇸🇦", decimal: 2 },
        { code: "QAR", name: "Qatari Riyal",     symbol: "﷼",   flag: "🇶🇦", decimal: 2 },
        { code: "OMR", name: "Omani Rial",       symbol: "﷼",   flag: "🇴🇲", decimal: 3 },
        { code: "KWD", name: "Kuwaiti Dinar",    symbol: "د.ك",  flag: "🇰🇼", decimal: 3 },
        { code: "BHD", name: "Bahraini Dinar",   symbol: "BD",   flag: "🇧🇭", decimal: 3 },
        { code: "INR", name: "Indian Rupee",     symbol: "₹",    flag: "🇮🇳", decimal: 2 },
        { code: "PKR", name: "Pakistani Rupee",  symbol: "₨",    flag: "🇵🇰", decimal: 2 },
        { code: "EGP", name: "Egyptian Pound",   symbol: "E£",   flag: "🇪🇬", decimal: 2 },
        { code: "JOD", name: "Jordanian Dinar",  symbol: "JD",   flag: "🇯🇴", decimal: 3 }
    ],

    categories: [
        { name: "Carpentry Work",       icon: "🪚" },
        { name: "Wood Supply",          icon: "🪵" },
        { name: "Furniture",            icon: "🪑" },
        { name: "Kitchen Cabinet",      icon: "🗄️" },
        { name: "Wardrobe",             icon: "👔" },
        { name: "Door & Frame",         icon: "🚪" },
        { name: "Flooring",             icon: "🏠" },
        { name: "Wall Paneling",        icon: "🧱" },
        { name: "Ceiling Work",         icon: "⬆️" },
        { name: "Painting & Finishing", icon: "🎨" },
        { name: "Hardware & Fittings",  icon: "🔩" },
        { name: "Installation",         icon: "🔧" },
        { name: "Transportation",       icon: "🚛" },
        { name: "Labour Charge",        icon: "👷" },
        { name: "Consultation",         icon: "📐" },
        { name: "Other",                icon: "📦" }
    ],

    app: {
        name:       "Al Bowry Invoice Pro",
        version:    "3.0.0",
        build:      "2025.01",
        developer:  "Al Bowry Tech",
        maxItems:   50,
        autoSave:   true,
        debugMode:  false
    }
};

Object.freeze(CONFIG.company);
Object.freeze(CONFIG.bank);
Object.freeze(CONFIG.invoice);
Object.freeze(CONFIG.app);