const VALID_RECORD_TYPES = new Set([
  'prescription',
  'lab_report',
  'diagnosis',
  'xray',
  'scan',
  'other',
]);

const normalizeRecordType = (recordType) => {
  let normalized = typeof recordType === 'string'
    ? recordType.toLowerCase().trim().replace(/[\s-]+/g, '_')
    : '';

  if (normalized === 'x_ray' || normalized === 'imaging') normalized = 'xray';
  if (normalized === 'vaccination') normalized = 'other';

  return VALID_RECORD_TYPES.has(normalized) ? normalized : null;
};

module.exports = { normalizeRecordType };
