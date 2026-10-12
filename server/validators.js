import { config } from './config.js';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PHONE_REGEX = /^[0-9]{10,12}$/;
const REG_NO_REGEX = /^[A-Za-z0-9]{4,20}$/;

export function validateMember(member, roleName = 'Member') {
  const errors = {};
  if (!member || typeof member !== 'object') {
    return { valid: false, errors: { [roleName]: 'Member details are missing.' } };
  }

  const name = (member.name || '').trim();
  const regNo = (member.regNo || '').trim().toUpperCase();
  const department = (member.department || '').trim().toUpperCase();
  const academicYear = (member.academicYear || '').trim();
  const email = (member.email || '').trim().toLowerCase();
  const rawPhone = (member.phone || '').trim().replace(/[\s\-+]/g, '');
  const phone = rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone.slice(2) : rawPhone;

  if (!name || name.length < 2 || name.length > 60) {
    errors.name = `${roleName} full name must be between 2 and 60 characters.`;
  }

  if (!regNo || !REG_NO_REGEX.test(regNo)) {
    errors.regNo = `${roleName} registration number is invalid (must be 4-20 alphanumeric characters).`;
  }

  if (!config.event.eligibleDepartments.includes(department)) {
    errors.department = `${roleName} department must be one of: ${config.event.eligibleDepartments.join(', ')}.`;
  }

  // Explicit check for 4th year students
  if (academicYear.includes('4') || academicYear.toLowerCase().includes('fourth')) {
    errors.academicYear = `${roleName} is ineligible: 4th year students cannot participate. Only 2nd and 3rd year students are permitted.`;
  } else if (!config.event.eligibleYears.includes(academicYear)) {
    errors.academicYear = `${roleName} academic year must be one of: ${config.event.eligibleYears.join(', ')}.`;
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = `${roleName} has an invalid email address format.`;
  }

  if (!phone || !PHONE_REGEX.test(phone)) {
    errors.phone = `${roleName} phone number must be a valid 10-digit number.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { name, regNo, department, academicYear, email, phone },
  };
}

export function validateRegistrationPayload(payload) {
  const errors = {};

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: { general: 'Missing payload' } };
  }

  // 1. Spam honeypot
  if (payload.website || payload.honeypot || payload.confirm_blank) {
    return { valid: false, errors: { honeypot: 'Bot submission detected.' }, isSpam: true };
  }

  // 2. Team Name
  const teamName = (payload.teamName || '').trim();
  if (!teamName || teamName.length < 2 || teamName.length > 50) {
    errors.teamName = 'Team name must be between 2 and 50 characters.';
  }

  // 3. Team Size (Strictly 2, 3, or 4)
  const teamSize = parseInt(payload.teamSize, 10);
  if (![2, 3, 4].includes(teamSize)) {
    errors.teamSize = 'Team size must be exactly 2, 3, or 4 members. Individual or 5+ member teams are not permitted.';
  }

  // 4. Team Lead
  const leadRes = validateMember(payload.lead, 'Team Lead');
  if (!leadRes.valid) {
    Object.entries(leadRes.errors).forEach(([k, v]) => {
      errors[`lead.${k}`] = v;
    });
  }

  // 5. Additional Members
  const members = Array.isArray(payload.members) ? payload.members : [];
  const requiredAdditionalMembers = [2, 3, 4].includes(teamSize) ? teamSize - 1 : 0;

  if (members.length !== requiredAdditionalMembers) {
    errors.members = `Exactly ${requiredAdditionalMembers} additional team member(s) required for a team size of ${teamSize}. (Received ${members.length}).`;
  }

  const validatedMembers = [];
  members.forEach((m, idx) => {
    const roleName = `Member ${idx + 2}`;
    const mRes = validateMember(m, roleName);
    if (!mRes.valid) {
      Object.entries(mRes.errors).forEach(([k, v]) => {
        errors[`members.${idx}.${k}`] = v;
      });
    } else {
      validatedMembers.push(mRes.data);
    }
  });

  // 6. Duplicate checks within this team
  if (leadRes.valid && validatedMembers.length === requiredAdditionalMembers) {
    const allMembers = [leadRes.data, ...validatedMembers];
    const regNos = new Set();
    const emails = new Set();
    const phones = new Set();

    allMembers.forEach((m, idx) => {
      const label = idx === 0 ? 'Team Lead' : `Member ${idx + 1}`;
      if (regNos.has(m.regNo)) {
        errors.duplicateReg = `Duplicate registration number detected: '${m.regNo}' is entered more than once within your team.`;
      }
      regNos.add(m.regNo);

      if (emails.has(m.email)) {
        errors.duplicateEmail = `Duplicate email address detected: '${m.email}' is entered more than once within your team.`;
      }
      emails.add(m.email);

      if (phones.has(m.phone)) {
        errors.duplicatePhone = `Duplicate phone number detected: '${m.phone}' is entered more than once within your team.`;
      }
      phones.add(m.phone);
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      teamName,
      teamSize,
      lead: leadRes.data,
      members: validatedMembers,
    },
  };
}
