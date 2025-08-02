export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface FormSchema {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormData {
  schema: FormSchema;
  responses: Record<string, any> | null;
  submitted: boolean;
}

export interface CreateFormRequest {
  schema: FormSchema;
}

export interface CreateFormResponse {
  formId: string;
  url: string;
}

export interface GetResponsesRequest {
  formId: string;
}

export interface GetResponsesResponse {
  submitted: boolean;
  responses: Record<string, any> | null;
}