import { FormSchema, FormField } from './types.js';

export function generateFormHTML(formId: string, schema: FormSchema, errors?: Record<string, string>): string {
  const port = process.env.MCP_FORM_PORT || '3000';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(schema.title)}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .description {
      color: #666;
      margin-bottom: 30px;
      font-size: 16px;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #2c3e50;
    }
    
    .required {
      color: #e74c3c;
    }
    
    input[type="text"],
    textarea,
    select {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    
    input[type="text"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: #3498db;
    }
    
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    .radio-group,
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .radio-option,
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    input[type="radio"],
    input[type="checkbox"] {
      margin: 0;
    }
    
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .form-group.has-error input,
    .form-group.has-error textarea,
    .form-group.has-error select {
      border-color: #e74c3c;
    }
    
    button {
      background-color: #3498db;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    button:hover {
      background-color: #2980b9;
    }
    
    button:disabled {
      background-color: #bdc3c7;
      cursor: not-allowed;
    }
    
    .success-message,
    .already-submitted {
      text-align: center;
      padding: 30px;
      background-color: #d4edda;
      color: #155724;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .already-submitted {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    @media (max-width: 480px) {
      .container {
        padding: 20px;
      }
      
      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(schema.title)}</h1>
    ${schema.description ? `<div class="description">${escapeHtml(schema.description)}</div>` : ''}
    
    <form method="POST" action="/forms/${formId}">
      <input type="hidden" name="csrf_token" value="${formId}">
      
      ${schema.fields.map(field => generateFieldHTML(field, errors)).join('')}
      
      <button type="submit">Submit Form</button>
    </form>
  </div>
</body>
</html>`;
}

function generateFieldHTML(field: FormField, errors?: Record<string, string>): string {
  const hasError = errors && errors[field.id];
  const errorClass = hasError ? ' has-error' : '';
  const requiredMark = field.required ? ' <span class="required">*</span>' : '';
  
  let fieldHTML = '';
  
  switch (field.type) {
    case 'text':
      fieldHTML = `<input type="text" id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>`;
      break;
      
    case 'textarea':
      fieldHTML = `<textarea id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}></textarea>`;
      break;
      
    case 'select':
      fieldHTML = `<select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
        <option value="">Please select...</option>
        ${field.options?.map(option => 
          `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
        ).join('') || ''}
      </select>`;
      break;
      
    case 'radio':
      fieldHTML = `<div class="radio-group">
        ${field.options?.map(option => `
          <div class="radio-option">
            <input type="radio" id="${field.id}_${sanitizeId(option)}" name="${field.id}" value="${escapeHtml(option)}" ${field.required ? 'required' : ''}>
            <label for="${field.id}_${sanitizeId(option)}">${escapeHtml(option)}</label>
          </div>
        `).join('') || ''}
      </div>`;
      break;
      
    case 'checkbox':
      fieldHTML = `<div class="checkbox-group">
        ${field.options?.map(option => `
          <div class="checkbox-option">
            <input type="checkbox" id="${field.id}_${sanitizeId(option)}" name="${field.id}" value="${escapeHtml(option)}">
            <label for="${field.id}_${sanitizeId(option)}">${escapeHtml(option)}</label>
          </div>
        `).join('') || ''}
      </div>`;
      break;
  }
  
  return `
    <div class="form-group${errorClass}">
      <label for="${field.id}">${escapeHtml(field.label)}${requiredMark}</label>
      ${fieldHTML}
      ${hasError ? `<div class="error">${escapeHtml(errors[field.id])}</div>` : ''}
    </div>
  `;
}

export function generateSuccessHTML(schema: FormSchema): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form Submitted - ${escapeHtml(schema.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .success-icon {
      font-size: 48px;
      color: #27ae60;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #27ae60;
      margin-bottom: 15px;
    }
    
    p {
      color: #666;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>Thank You!</h1>
    <p>Your form submission for "${escapeHtml(schema.title)}" has been received successfully.</p>
  </div>
</body>
</html>`;
}

export function generateAlreadySubmittedHTML(schema: FormSchema): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Already Submitted - ${escapeHtml(schema.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .info-icon {
      font-size: 48px;
      color: #f39c12;
      margin-bottom: 20px;
    }
    
    h1 {
      color: #f39c12;
      margin-bottom: 15px;
    }
    
    p {
      color: #666;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="info-icon">ⓘ</div>
    <h1>Form Already Submitted</h1>
    <p>This form "${escapeHtml(schema.title)}" has already been submitted and cannot be filled out again.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '_');
}