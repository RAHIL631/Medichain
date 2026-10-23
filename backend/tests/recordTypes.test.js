const { normalizeRecordType } = require('../utils/recordTypes');

describe('normalizeRecordType', () => {
  it.each([
    ['Lab Report', 'lab_report'],
    ['lab-report', 'lab_report'],
    ['lab_report', 'lab_report'],
    ['X-Ray', 'xray'],
    ['xray', 'xray'],
    ['Imaging', 'xray'],
    ['Vaccination', 'other'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeRecordType(input)).toBe(expected);
  });

  it('returns null for unsupported record types', () => {
    expect(normalizeRecordType('invalid type')).toBeNull();
  });
});
