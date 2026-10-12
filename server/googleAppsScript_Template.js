/**
 * GOOGLE APPS SCRIPT WEBHOOK FOR IDEATHON 2026 REGISTRATIONS
 * 
 * INSTRUCTIONS FOR ORGANIZER:
 * 1. Open Google Sheets (create a new blank spreadsheet).
 * 2. Rename Sheet 1 to "Registrations".
 * 3. Go to Extensions > Apps Script.
 * 4. Paste this entire code into Code.gs, replacing any existing code.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "Ideathon 2026 Registrations"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (allows the backend server to POST data)
 * 8. Click "Deploy" and authorize permissions.
 * 9. Copy the generated Web app URL (ends with /exec).
 * 10. Paste into .env:
 *     GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 */

function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = [
    "Registration ID",
    "Submission Timestamp",
    "Team Name",
    "Team Size",
    "Lead Name",
    "Lead Reg No",
    "Lead Department",
    "Lead Academic Year",
    "Lead Email",
    "Lead Phone",
    "Member 2 Name",
    "Member 2 Reg No",
    "Member 2 Department",
    "Member 2 Academic Year",
    "Member 2 Email",
    "Member 2 Phone",
    "Member 3 Name",
    "Member 3 Reg No",
    "Member 3 Department",
    "Member 3 Academic Year",
    "Member 3 Email",
    "Member 3 Phone",
    "Status"
  ];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#1e1b4b");
    range.setFontColor("#22d3ee");
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupHeaders();

    var row = [
      data.registrationId || "",
      data.timestamp || "",
      data.teamName || "",
      data.teamSize || "",
      data.leadName || "",
      data.leadRegNo || "",
      data.leadDepartment || "",
      data.leadAcademicYear || "",
      data.leadEmail || "",
      data.leadPhone || "",
      data.member2Name || "",
      data.member2RegNo || "",
      data.member2Department || "",
      data.member2AcademicYear || "",
      data.member2Email || "",
      data.member2Phone || "",
      data.member3Name || "",
      data.member3RegNo || "",
      data.member3Department || "",
      data.member3AcademicYear || "",
      data.member3Email || "",
      data.member3Phone || "",
      data.status || "CONFIRMED"
    ];

    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ result: "success", id: data.registrationId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
