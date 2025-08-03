import express, { Express } from "express";
import { storage } from "./storage.js";
import { FormSchema } from "./types.js";
import {
  generateFormHTML,
  generateSuccessHTML,
  generateAlreadySubmittedHTML,
} from "./form-generator.js";

export function registerHttpEndpoints(app: Express): express.Application {
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Serve form page
  app.get("/forms/:id", async (req, res) => {
    const formId = req.params.id;
    const formData = await storage.getForm(formId);

    if (!formData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Form Not Found</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px; 
              background-color: #f5f5f5;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            h1 { color: #e74c3c; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Form Not Found</h1>
            <p>The form you're looking for doesn't exist or has been removed.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (formData.submitted) {
      return res.send(generateAlreadySubmittedHTML(formData.schema));
    }

    res.send(generateFormHTML(formId, formData.schema));
  });

  // Handle form submission
  app.post("/forms/:id", async (req, res) => {
    const formId = req.params.id;
    const formData = await storage.getForm(formId);

    if (!formData) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (formData.submitted) {
      return res.send(generateAlreadySubmittedHTML(formData.schema));
    }

    // CSRF protection
    if (req.body.csrf_token !== formId) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }

    // Validate form data
    const { errors, responses } = validateFormData(formData.schema, req.body);

    if (Object.keys(errors).length > 0) {
      // Return form with errors
      return res.send(generateFormHTML(formId, formData.schema, errors));
    }

    // Save responses
    formData.responses = responses;
    formData.submitted = true;
    storage.setForm(formId, formData);

    console.error(`Form ${formId} submitted successfully`);

    // Show success page
    res.send(generateSuccessHTML(formData.schema));
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", forms: storage.getAllForms().size });
  });

  return app;
}

function validateFormData(
  schema: FormSchema,
  data: Record<string, any>
): {
  errors: Record<string, string>;
  responses: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const responses: Record<string, any> = {};

  for (const field of schema.fields) {
    const value = data[field.id];

    // Handle different field types
    if (field.type === "checkbox") {
      // Checkboxes can have multiple values or be undefined
      if (value === undefined) {
        responses[field.id] = [];
      } else if (Array.isArray(value)) {
        responses[field.id] = value;
      } else {
        responses[field.id] = [value];
      }

      // Check required validation for checkboxes
      if (field.required && responses[field.id].length === 0) {
        errors[field.id] = `${field.label} is required`;
      }
    } else {
      // Handle other field types (text, textarea, select, radio)
      responses[field.id] = value || "";

      // Check required validation
      if (field.required && (!value || value.trim() === "")) {
        errors[field.id] = `${field.label} is required`;
      }

      // For radio buttons, validate that the value is one of the options
      if (
        field.type === "radio" &&
        value &&
        field.options &&
        !field.options.includes(value)
      ) {
        errors[field.id] = `Invalid option selected for ${field.label}`;
      }

      // For select fields, validate that the value is one of the options
      if (
        field.type === "select" &&
        value &&
        field.options &&
        !field.options.includes(value)
      ) {
        errors[field.id] = `Invalid option selected for ${field.label}`;
      }
    }

    // For checkbox fields, validate that all values are valid options
    if (
      field.type === "checkbox" &&
      field.options &&
      responses[field.id].length > 0
    ) {
      const invalidOptions = responses[field.id].filter(
        (val: string) => !field.options!.includes(val)
      );
      if (invalidOptions.length > 0) {
        errors[field.id] = `Invalid options selected for ${field.label}`;
      }
    }
  }

  return { errors, responses };
}
