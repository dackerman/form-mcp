import { describe, it, expect } from 'vitest';
import { TEST_BASE_URL, TEST_MCP_URL } from './setup.js';

describe('HTTP Form Server', () => {
  it('should serve health check endpoint', async () => {
    const response = await fetch(`${TEST_BASE_URL}/health`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(typeof data.forms).toBe('number');
  });

  it('should return 404 for non-existent form', async () => {
    const response = await fetch(`${TEST_BASE_URL}/forms/non-existent-id`);
    expect(response.status).toBe(404);
    
    const html = await response.text();
    expect(html).toContain('Form Not Found');
  });

  it('should create and serve a form', async () => {
    // First create a form via MCP
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);
    
    const createResult = await client.callTool('createForm', {
      schema: {
        title: 'HTTP Test Form',
        description: 'Testing HTTP form serving',
        fields: [
          {
            id: 'test_input',
            label: 'Test Input',
            type: 'text',
            required: true,
          },
          {
            id: 'test_select',
            label: 'Test Select',
            type: 'select',
            required: false,
            options: ['Option 1', 'Option 2', 'Option 3'],
          },
        ],
      },
    });
    
    const { formId, url } = JSON.parse((createResult.content[0] as any).text);
    
    // Now fetch the form HTML
    const response = await fetch(url);
    expect(response.ok).toBe(true);
    
    const html = await response.text();
    expect(html).toContain('HTTP Test Form');
    expect(html).toContain('Testing HTTP form serving');
    expect(html).toContain('Test Input');
    expect(html).toContain('Test Select');
    expect(html).toContain('Option 1');
    expect(html).toContain('required');
    expect(html).toContain(`action="/forms/${formId}"`);
    
    // Cleanup
    await client.close();
  });

  it('should handle form submission', async () => {
    // Create a form first
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);
    
    const createResult = await client.callTool('createForm', {
      schema: {
        title: 'Submission Test Form',
        fields: [
          {
            id: 'name',
            label: 'Name',
            type: 'text',
            required: true,
          },
          {
            id: 'message',
            label: 'Message',
            type: 'textarea',
            required: false,
          },
        ],
      },
    });
    
    const { formId } = JSON.parse((createResult.content[0] as any).text);
    
    // Submit the form
    const formData = new URLSearchParams({
      csrf_token: formId,
      name: 'Test User',
      message: 'Test message',
    });
    
    const submitResponse = await fetch(`${TEST_BASE_URL}/forms/${formId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    expect(submitResponse.ok).toBe(true);
    
    const resultHtml = await submitResponse.text();
    expect(resultHtml).toContain('Thank you for your submission');
    expect(resultHtml).toContain('Submission Test Form');
    
    // Verify the form was submitted via MCP
    const getResult = await client.callTool('getResponses', { 
      schema: { formId } 
    });
    const responses = JSON.parse((getResult.content[0] as any).text);
    
    expect(responses.submitted).toBe(true);
    expect(responses.responses).toEqual({
      name: 'Test User',
      message: 'Test message',
    });
    
    // Cleanup
    await client.close();
  });

  it('should prevent resubmission', async () => {
    // Create and submit a form
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    const transport = new StreamableHTTPClientTransport(new URL(TEST_MCP_URL));
    await client.connect(transport);
    
    const createResult = await client.callTool('createForm', {
      schema: {
        title: 'Resubmission Test',
        fields: [{ id: 'field1', label: 'Field 1', type: 'text', required: true }],
      },
    });
    
    const { formId } = JSON.parse((createResult.content[0] as any).text);
    
    // First submission
    const formData = new URLSearchParams({
      csrf_token: formId,
      field1: 'Value 1',
    });
    
    await fetch(`${TEST_BASE_URL}/forms/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    // Try to access form again
    const secondAccess = await fetch(`${TEST_BASE_URL}/forms/${formId}`);
    const html = await secondAccess.text();
    
    expect(html).toContain('This form has already been submitted');
    expect(html).not.toContain('<form');
    
    // Cleanup
    await client.close();
  });
});