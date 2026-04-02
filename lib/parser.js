const STORAGE_PROFILES = {
  api: "api",
  js: "js"
};

const DEFAULT_PROFILES = {
  api: {
    label: "API",
    requiredParams: [
      "CampaignId",
      "ActionTrackerId",
      "EventDate",
      "ClickId",
      "OrderId",
      "OrderDiscount",
      "ItemCategory{i}",
      "ItemSku{i}",
      "ItemSubTotal{i}",
      "ItemQuantity{i}"
    ],
    recommendedParams: [
      "IpAddress",
      "CustomerId",
      "CustomerEmail",
      "CustomerStatus",
      "OrderPromoCode",
      "CurrencyCode"
    ],
    optionalParams: [
      "ItemName{i}"
    ],
    metadata: {
      CampaignId: "Value specific to your program",
      ActionTrackerId: "Value specific to each conversion event",
      EventDate: "Timestamp of the event",
      ClickId: "Click ID captured from landing page URL",
      OrderId: "Unique trackable ID per event",
      OrderDiscount: "Total discounts applied to the conversion",
      "ItemCategory{i}": "Item category identifier",
      "ItemSku{i}": "Item-specific identifier",
      "ItemSubTotal{i}": "Line item subtotal",
      "ItemQuantity{i}": "Quantity of the line item",
      IpAddress: "Customer public IP for fraud detection",
      CustomerId: "Internal customer identifier",
      CustomerEmail: "SHA1 hash of customer email",
      CustomerStatus: "Customer status, usually New or Existing",
      OrderPromoCode: "Single promo code or empty string",
      CurrencyCode: "ISO 4217 currency code",
      "ItemName{i}": "Name of the line item"
    },
    aliases: {}
  },
  js: {
    label: "JS",
    requiredParams: [
      "orderId",
      "orderDiscount",
      "subTotal{i}",
      "category{i}",
      "sku{i}",
      "quantity{i}"
    ],
    recommendedParams: [
      "customProfileId",
      "customerId",
      "customerEmail",
      "customerStatus",
      "currencycode",
      "orderPromoCode"
    ],
    optionalParams: [
      "name{i}"
    ],
    specialParams: [
      "_ir"
    ],
    metadata: {
      orderId: "Unique trackable ID for each event",
      customProfileId: "Unique visitor identifier used across signed-in and anonymous sessions",
      customerId: "Platform-specific customer identifier",
      customerEmail: "SHA1 hash of the customer's email",
      customerStatus: "Usually New or Existing",
      currencycode: "ISO 4217 currency code",
      orderPromoCode: "Single promo code",
      orderDiscount: "Total order discount applied to the conversion",
      "subTotal{i}": "Item subtotal before shipping and tax",
      "category{i}": "Item category identifier",
      "sku{i}": "Item-specific identifier",
      "quantity{i}": "Quantity of the item",
      "name{i}": "Item name",
      _ir: "UTT identity/session payload used to tie on-site events together"
    },
    aliases: {
      ordersubtotalprediscount: "oabd",
      ordersubtotalpostdiscount: "amount",
      referenceid: "refid",
      customerEmail: "custemail",
      customProfileId: "custprofileid",
      customerId: "custid",
      searchterm: "searchtxt",
      actiontrackerid: "actiontrackerid",
      eventtypeid: "eventtypeid",
      eventtypecode: "eventtypecode",
      customercity: "custct",
      customercountry: "custctry",
      customerpostcode: "postcode",
      customerregion: "custrgn",
      orderrebate: "rebate",
      orderDiscount: "odsc",
      orderpromocodedesc: "pmod",
      orderPromoCode: "pmoc",
      siteversion: "sitever",
      sitecategory: "sitecat",
      hearaboutus: "hrau",
      ordershipping: "st",
      customerStatus: "cs",
      currencycode: "currcd",
      ordertax: "tax",
      giftpurchase: "gp",
      orderId: "oid",
      paymenttype: "pt",
      locationname: "ln",
      locationtype: "lt",
      locationid: "li",
      propertyid: "propid",
      "sku{i}": "sku{i}",
      "promocodedesc{i}": "pd{i}",
      "promocode{i}": "p{i}",
      "price{i}": "pr{i}",
      "subTotal{i}": "amt{i}",
      "quantity{i}": "qty{i}",
      "name{i}": "nme{i}",
      "mpn{i}": "ms{i}",
      "subcategory{i}": "sc{i}",
      "deliverytype{i}": "dt{i}",
      "discount{i}": "r{i}",
      "category{i}": "cat{i}",
      "totaldiscount{i}": "tr{i}",
      "totalrebate{i}": "rbt{i}",
      "brand{i}": "bnd{i}",
      "referenceid{i}": "refid{i}",
      "custparam{i}": "cup{i}",
      "discountrate{i}": "rr{i}"
    }
  }
};

function safeDecode(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function normalizeKey(key) {
  return key.trim().toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseParamList(input) {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      raw: value,
      normalized: normalizeKey(value)
    }));
}

function splitTokens(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes("&")) {
    return trimmed
      .split("&")
      .map((token) => token.trim())
      .filter(Boolean);
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPatternMatcher(pattern) {
  const normalized = normalizeKey(pattern);
  if (!normalized.includes("{i}")) {
    return {
      raw: pattern,
      normalized,
      matches: (value) => normalizeKey(value) === normalized
    };
  }

  const regex = new RegExp(`^${escapeRegex(normalized).replace("\\{i\\}", "\\d+")}$`);
  return {
    raw: pattern,
    normalized,
    matches: (value) => regex.test(normalizeKey(value))
  };
}

function buildRuleDefinitions(profileRules) {
  const aliasMap = invertAliases(profileRules.aliases || {});

  const createDefinitions = (patterns, level, metadata) => {
    return parseParamList(patterns.join("\n")).map((item) => {
      const matcher = buildPatternMatcher(item.raw);
      return {
        ...matcher,
        level,
        description: metadata[item.raw] || "",
        alias: aliasMap[normalizeKey(item.raw)] || ""
      };
    });
  };

  return [
    ...createDefinitions(profileRules.requiredParams, "required", profileRules.metadata || {}),
    ...createDefinitions(profileRules.recommendedParams, "recommended", profileRules.metadata || {}),
    ...createDefinitions(profileRules.optionalParams || [], "optional", profileRules.metadata || {}),
    ...createDefinitions(profileRules.specialParams || [], "special", profileRules.metadata || {})
  ];
}

function invertAliases(aliases) {
  return Object.entries(aliases).reduce((result, [canonical, shortened]) => {
    result[normalizeKey(canonical)] = shortened;
    return result;
  }, {});
}

function buildAliasResolvers(profileRules) {
  const aliases = profileRules.aliases || {};

  return Object.entries(aliases).map(([canonical, aliasPattern]) => {
    const canonicalValue = canonical;
    const aliasLower = normalizeKey(aliasPattern);

    if (!aliasLower.includes("{i}")) {
      return {
        matches: (value) => normalizeKey(value) === aliasLower,
        resolve: () => canonicalValue
      };
    }

    const aliasPrefix = aliasLower.replace("{i}", "");
    return {
      matches: (value) => {
        const normalized = normalizeKey(value);
        const suffix = normalized.slice(aliasPrefix.length);
        return normalized.startsWith(aliasPrefix) && /^\d+$/.test(suffix);
      },
      resolve: (value) => {
        const normalized = normalizeKey(value);
        const index = normalized.slice(aliasPrefix.length);
        return canonicalValue.replace("{i}", index);
      }
    };
  });
}

function canonicalizeKey(key, profileRules) {
  const resolvers = buildAliasResolvers(profileRules);
  const directMatch = resolvers.find((resolver) => resolver.matches(key));

  if (directMatch) {
    return directMatch.resolve(key);
  }

  return key;
}

export function parsePayload(input, profile = STORAGE_PROFILES.api, overrideRules = null) {
  const profileRules = overrideRules || getDefaultRules(profile);
  const tokens = splitTokens(input);
  const entries = [];
  const params = new Map();

  tokens.forEach((token, index) => {
    const separatorIndex = token.indexOf("=");
    const rawKey = separatorIndex >= 0 ? token.slice(0, separatorIndex) : token;
    const rawValue = separatorIndex >= 0 ? token.slice(separatorIndex + 1) : "";
    const originalKey = safeDecode(rawKey.trim());
    const value = safeDecode(rawValue.trim());
    const key = canonicalizeKey(originalKey, profileRules);
    const normalizedKey = normalizeKey(key);

    entries.push({
      index: index + 1,
      key,
      value,
      normalizedKey,
      raw: token,
      originalKey,
      displayKey: originalKey === key ? key : `${key}(${originalKey})`
    });

    if (!params.has(normalizedKey)) {
      params.set(normalizedKey, []);
    }

    params.get(normalizedKey).push({
      key,
      value,
      raw: token,
      originalKey
    });
  });

  return { entries, params };
}

export function comparePayloadToRules(parsedPayload, rules) {
  const definitions = buildRuleDefinitions(rules);
  const required = definitions.filter((item) => item.level === "required");
  const recommended = definitions.filter((item) => item.level === "recommended");
  const special = definitions.filter((item) => item.level === "special");

  const missingRequired = required.filter((item) => {
    return !parsedPayload.entries.some((entry) => item.matches(entry.key));
  });
  const missingRecommended = recommended.filter((item) => {
    return !parsedPayload.entries.some((entry) => item.matches(entry.key));
  });

  const extras = parsedPayload.entries.filter((entry, index, array) => {
    if (definitions.some((item) => item.matches(entry.key))) {
      return false;
    }

    return array.findIndex((candidate) => candidate.normalizedKey === entry.normalizedKey) === index;
  });

  return {
    missingRequired,
    missingRecommended,
    extras,
    specialParams: parsedPayload.entries
      .map((entry) => {
        const match = special.find((item) => item.matches(entry.key));
        return match
          ? {
              ...entry,
              description: match.description || "",
              alias: match.alias || ""
            }
          : null;
      })
      .filter(Boolean),
    parsedRows: parsedPayload.entries.map((entry) => {
      const match = definitions.find((item) => item.matches(entry.key));
      return {
        ...entry,
        level: match?.level || "unexpected",
        description: match?.description || ""
      };
    })
  };
}

export function rulesToText(rules) {
  return {
    requiredText: rules.requiredParams.join("\n"),
    recommendedText: rules.recommendedParams.join("\n"),
    optionalText: (rules.optionalParams || []).join("\n")
  };
}

export function sanitizeRules(rawRules, profile = STORAGE_PROFILES.api) {
  const defaults = getDefaultRules(profile);
  const requiredParams = parseParamList((rawRules?.requiredText || "").trim())
    .map((item) => item.raw);
  const recommendedParams = parseParamList((rawRules?.recommendedText || "").trim())
    .map((item) => item.raw);
  const optionalParams = parseParamList((rawRules?.optionalText || "").trim())
    .map((item) => item.raw);

  return {
    ...defaults,
    requiredParams: requiredParams.length ? requiredParams : defaults.requiredParams,
    recommendedParams: recommendedParams.length ? recommendedParams : defaults.recommendedParams,
    optionalParams: optionalParams.length ? optionalParams : defaults.optionalParams
  };
}

export function getDefaultRules(profile = STORAGE_PROFILES.api) {
  return {
    ...DEFAULT_PROFILES[profile],
    requiredParams: [...DEFAULT_PROFILES[profile].requiredParams],
    recommendedParams: [...DEFAULT_PROFILES[profile].recommendedParams],
    optionalParams: [...DEFAULT_PROFILES[profile].optionalParams],
    metadata: { ...(DEFAULT_PROFILES[profile].metadata || {}) },
    aliases: { ...(DEFAULT_PROFILES[profile].aliases || {}) }
  };
}

export function getDefaultProfile() {
  return STORAGE_PROFILES.api;
}

export function getSupportedProfiles() {
  return Object.entries(DEFAULT_PROFILES).map(([id, profile]) => ({
    id,
    label: profile.label
  }));
}

export function getAliasReference(profile = STORAGE_PROFILES.api) {
  const aliases = getDefaultRules(profile).aliases || {};

  return Object.entries(aliases)
    .map(([canonical, shortened]) => ({
      canonical,
      shortened
    }))
    .sort((left, right) => left.canonical.localeCompare(right.canonical));
}
