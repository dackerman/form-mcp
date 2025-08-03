import { z } from "zod";

export const schemaType = z
  .object({
    title: z.string().describe("The title of the form"),
    description: z
      .string()
      .optional()
      .describe("Optional description for the form"),
    fields: z
      .array(
        z.object({
          id: z.string().describe("Unique identifier for the field"),
          label: z.string().describe("Display label for the field"),
          type: z
            .enum(["text", "textarea", "select", "radio", "checkbox", "email"])
            .describe("Type of the form field"),
          required: z.boolean().describe("Whether the field is required"),
          options: z
            .array(z.string())
            .optional()
            .describe("Options for select, radio, or checkbox fields"),
        })
      )
      .describe("Array of form fields"),
  })
  .describe("The form schema object");

export type FormSchema = z.infer<typeof schemaType>;
