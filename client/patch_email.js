const fs = require('fs');

const path = '../notification-service/src/utils/email.utils.js';
let content = fs.readFileSync(path, 'utf8');

// Ensure invoiceId and apiUrl are passed
if (!content.includes('apiUrl:')) {
  // Add API_URL constant
  content = content.replace(
    /const DASHBOARD_URL = \(\) => `\$\{CLIENT_URL\(\)\}\/dashboard`;/,
    `const DASHBOARD_URL = () => \`\${CLIENT_URL()}/dashboard\`;\nconst API_URL = () => process.env.API_URL || "http://localhost:3000/api";` // Default API URL just in case
  );

  content = content.replace(
    /invoiceNumber, total, currency,/,
    `invoiceNumber, total, currency,\n    invoiceId,`
  );

  content = content.replace(
    /isOverdue,\n    paymentUrl,\n    pdfUrl,/,
    `isOverdue,\n    paymentUrl,\n    pdfUrl,\n    invoiceId,\n    apiUrl: API_URL(),`
  );
  
  fs.writeFileSync(path, content, 'utf8');
  console.log("Success patch.js");
}

const templatePath = '../notification-service/src/templates/invoice-sent.hbs';
let templateContent = fs.readFileSync(templatePath, 'utf8');

if (!templateContent.includes('invoiceId')) {
    templateContent += `\n<img src="{{apiUrl}}/invoices/{{invoiceId}}/view" width="1" height="1" style="display:none; visibility:hidden;" alt="" />\n`;
    fs.writeFileSync(templatePath, templateContent, 'utf8');
}

