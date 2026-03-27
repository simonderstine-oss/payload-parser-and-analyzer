const DEFAULT_RULES = {
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
  ]
};

const DEFAULT_METADATA = {
  CampaignId: {
    description: "Value specific to your program"
  },
  ActionTrackerId: {
    description: "Value specific to each conversion event"
  },
  EventDate: {
    description: "Timestamp of the event"
  },
  ClickId: {
    description: "Click ID captured from landing page URL"
  },
  OrderId: {
    description: "Unique trackable ID per event"
  },
  OrderDiscount: {
    description: "Total discounts applied to the conversion"
  },
  "ItemCategory{i}": {
    description: "Item category identifier"
  },
  "ItemSku{i}": {
    description: "Item-specific identifier"
  },
  "ItemSubTotal{i}": {
    description: "Line item subtotal"
  },
  "ItemQuantity{i}": {
    description: "Quantity of the line item"
  },
  IpAddress: {
    description: "Customer public IP for fraud detection"
  },
  CustomerId: {
    description: "Internal customer identifier"
  },
  CustomerEmail: {
    description: "SHA1 hash of customer email"
  },
  CustomerStatus: {
    description: "Customer status, usually New or Existing"
  },
  OrderPromoCode: {
    description: "Single promo code or empty string"
  },
  CurrencyCode: {
    description: "ISO 4217 currency code"
  },
  "ItemName{i}": {
    description: "Name of the line item"
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

function buildRuleDefinitions(rules) {
  const createDefinitions = (patterns, level) => {
    return parseParamList(patterns.join("\n")).map((item) => {
      const matcher = buildPatternMatcher(item.raw);
      return {
        ...matcher,
        level,
        description: DEFAULT_METADATA[item.raw]?.description || ""
      };
    });
  };

  return [
    ...createDefinitions(rules.requiredParams, "required"),
    ...createDefinitions(rules.recommendedParams, "recommended"),
    ...createDefinitions(rules.optionalParams || [], "optional")
  ];
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

export function parsePayload(input) {
  const tokens = splitTokens(input);
  const entries = [];
  const params = new Map();

  tokens.forEach((token, index) => {
    const separatorIndex = token.indexOf("=");
    const rawKey = separatorIndex >= 0 ? token.slice(0, separatorIndex) : token;
    const rawValue = separatorIndex >= 0 ? token.slice(separatorIndex + 1) : "";
    const key = safeDecode(rawKey.trim());
    const value = safeDecode(rawValue.trim());
    const normalizedKey = normalizeKey(key);

    entries.push({
      index: index + 1,
      key,
      value,
      normalizedKey,
      raw: token
    });

    if (!params.has(normalizedKey)) {
      params.set(normalizedKey, []);
    }

    params.get(normalizedKey).push({
      key,
      value,
      raw: token
    });
  });

  return { entries, params };
}

export function parseParamList(input) {
  return input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      raw: value,
      normalized: normalizeKey(value)
    }));
}

export function comparePayloadToRules(parsedPayload, rules) {
  const definitions = buildRuleDefinitions(rules);
  const required = definitions.filter((item) => item.level === "required");
  const recommended = definitions.filter((item) => item.level === "recommended");

  const missingRequired = required.filter((item) => {
    return !parsedPayload.entries.some((entry) => item.matches(entry.key));
  });
  const missingRecommended = recommended.filter((item) => {
    return !parsedPayload.entries.some((entry) => item.matches(entry.key));
  });

  const expected = definitions;

  const extras = parsedPayload.entries.filter((entry, index, array) => {
    if (expected.some((item) => item.matches(entry.key))) {
      return false;
    }

    return array.findIndex((candidate) => candidate.normalizedKey === entry.normalizedKey) === index;
  });

  return {
    missingRequired,
    missingRecommended,
    extras,
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

export function sanitizeRules(rawRules) {
  const requiredParams = parseParamList((rawRules?.requiredText || "").trim())
    .map((item) => item.raw);
  const recommendedParams = parseParamList((rawRules?.recommendedText || "").trim())
    .map((item) => item.raw);
  const optionalParams = parseParamList((rawRules?.optionalText || "").trim())
    .map((item) => item.raw);

  return {
    requiredParams: requiredParams.length ? requiredParams : DEFAULT_RULES.requiredParams,
    recommendedParams: recommendedParams.length ? recommendedParams : DEFAULT_RULES.recommendedParams,
    optionalParams: optionalParams.length ? optionalParams : DEFAULT_RULES.optionalParams
  };
}

export function getDefaultRules() {
  return DEFAULT_RULES;
}
