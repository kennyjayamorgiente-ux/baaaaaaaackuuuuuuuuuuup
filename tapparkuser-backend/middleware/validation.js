const toPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const fail = (res, message) => (
  res.status(400).json({
    success: false,
    message
  })
);

const validateParamInt = (name, label = name) => (req, res, next) => {
  const parsed = toPositiveInt(req.params[name]);
  if (!parsed) {
    return fail(res, `${label} must be a positive integer`);
  }
  req.params[name] = parsed;
  return next();
};

const validateBodyInt = (name, label = name) => (req, res, next) => {
  const parsed = toPositiveInt(req.body?.[name]);
  if (!parsed) {
    return fail(res, `${label} must be a positive integer`);
  }
  req.body[name] = parsed;
  return next();
};

const validateParamPattern = (name, pattern, label = name) => (req, res, next) => {
  const value = String(req.params[name] || '').trim();
  if (!value || !pattern.test(value)) {
    return fail(res, `Invalid ${label}`);
  }
  req.params[name] = value;
  return next();
};

const validateBodyEnum = (name, allowedValues, label = name) => (req, res, next) => {
  const value = String(req.body?.[name] || '').trim().toLowerCase();
  if (!allowedValues.includes(value)) {
    return fail(res, `Invalid ${label}. Must be one of: ${allowedValues.join(', ')}`);
  }
  req.body[name] = value;
  return next();
};

const validateBodyString = (name, options = {}) => (req, res, next) => {
  const {
    label = name,
    min = 1,
    max = 100,
    pattern,
    optional = false
  } = options;

  const rawValue = req.body?.[name];
  if (rawValue === undefined || rawValue === null) {
    if (optional) return next();
    return fail(res, `${label} is required`);
  }

  const value = String(rawValue).trim();
  if (!value && optional) return next();
  if (value.length < min || value.length > max) {
    return fail(res, `${label} must be between ${min} and ${max} characters`);
  }
  if (pattern && !pattern.test(value)) {
    return fail(res, `Invalid ${label}`);
  }

  req.body[name] = value;
  return next();
};

module.exports = {
  validateParamInt,
  validateBodyInt,
  validateParamPattern,
  validateBodyEnum,
  validateBodyString
};
