const express = require('express');
const { body, validationResult } = require('express-validator');
const { tapparkClient, tapparkConfig } = require('../tappark');

const router = express.Router();

const lookupValidation = [
  body('idNumber')
    .trim()
    .notEmpty()
    .withMessage('ID number is required'),
  body('type')
    .optional()
    .isIn(['student', 'employee'])
    .withMessage('Type must be either student or employee'),
];

const unwrapPayload = (payload) => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
};

const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const findPersonRecord = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPersonRecord(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const directRecordSignals = [
    value.first_name,
    value.last_name,
    value.firstname,
    value.lastname,
    value.firstName,
    value.lastName,
    value.student_id,
    value.employee_id,
    value.id_number,
    value.email,
    value.school_email,
    value.full_name,
    value.fullname,
    value.name,
  ];

  if (directRecordSignals.some(Boolean)) {
    return value;
  }

  const nestedKeys = [
    'student',
    'employee',
    'person',
    'profile',
    'record',
    'result',
    'data',
  ];

  for (const key of nestedKeys) {
    if (key in value) {
      const found = findPersonRecord(value[key]);
      if (found) {
        return found;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findPersonRecord(nestedValue);
    if (found) {
      return found;
    }
  }

  return value;
};

const normalizePerson = (payload, type, idNumber) => {
  const source = unwrapPayload(payload);
  const person = findPersonRecord(source);

  if (!person || typeof person !== 'object') {
    return null;
  }

  const fullName = pickFirstString(
    person.full_name,
    person.fullname,
    person.name
  );
  const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
  const derivedFirstName = nameParts[0] || '';
  const derivedLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const firstName = pickFirstString(
    person.first_name,
    person.firstname,
    person.given_name,
    person.firstName,
    derivedFirstName
  );
  const lastName = pickFirstString(
    person.last_name,
    person.lastname,
    person.surname,
    person.lastName,
    derivedLastName
  );
  const middleName = pickFirstString(
    person.middle_name,
    person.middlename,
    person.middleName
  );
  const email = pickFirstString(
    person.email,
    person.email_address,
    person.school_email,
    person.emailAddress
  );
  const externalId =
    person.student_id ||
    person.employee_id ||
    person.id_number ||
    person.studentId ||
    person.employeeId ||
    person.id ||
    idNumber;

  return {
    external_id: String(externalId || idNumber),
    external_type: type,
    external_source: 'foundationu_mis',
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email,
    raw: person,
  };
};

const fetchByType = async (type, idNumber) => {
  if (type === 'student') {
    const result = await tapparkClient.getStudent(idNumber);
    return normalizePerson(result, 'student', idNumber);
  }

  const result = await tapparkClient.getEmployee(idNumber);
  return normalizePerson(result, 'employee', idNumber);
};

router.get('/status', async (_req, res) => {
  const hasAccessToken = Boolean(tapparkClient.accessToken);
  const hasRefreshToken = Boolean(tapparkConfig.refreshToken);

  res.json({
    success: true,
    data: {
      configured: tapparkClient.isConfigured(),
      baseUrl: tapparkConfig.baseUrl,
      hasAccessToken,
      hasRefreshToken,
      expiresAt: tapparkClient.expiresAt || tapparkConfig.expiresAt || null,
    },
  });
});

router.post('/lookup-id', lookupValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const idNumber = String(req.body.idNumber || '').trim();
    const preferredType = req.body.type;
    const typesToTry = preferredType ? [preferredType] : ['student', 'employee'];

    for (const type of typesToTry) {
      try {
        const profile = await fetchByType(type, idNumber);
        if (profile) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Tappark lookup] success:', {
              idNumber,
              type,
              profile,
            });
          }
          return res.json({
            success: true,
            message: `${type} found`,
            data: profile,
          });
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
          continue;
        }
        const remoteMessage =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error.message;
        const normalizedMessage =
          typeof remoteMessage === 'string' && remoteMessage.trim()
            ? remoteMessage
            : `Tappark lookup failed (${status || 502})`;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[Tappark lookup] failure:', {
            idNumber,
            type,
            status: status || 502,
            message: normalizedMessage,
            responseData: error?.response?.data ?? null,
          });
        }

        return res.status(status || 502).json({
          success: false,
          message: normalizedMessage,
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'ID number not found in Tappark MIS',
    });
  } catch (error) {
    console.error('Tappark lookup error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to lookup ID number',
    });
  }
});

module.exports = router;
