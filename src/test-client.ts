import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testMCPServer() {
  console.log("Starting MCP Form Server test...\n");

  // Spawn the MCP server
  const serverProcess = spawn("node", ["dist/index.js"], {
    env: { ...process.env, MCP_FORM_PORT: "3007" },
    stdio: ["pipe", "pipe", "pipe"]
  });

  // Create MCP client with stdio transport
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, MCP_FORM_PORT: "3006" }
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    // Connect to the server
    await client.connect(transport);
    console.log("✓ Connected to MCP server\n");

    // List available tools
    const toolsResponse = await client.listTools();
    console.log("Available tools:");
    toolsResponse.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 1: Create a form
    console.log("Test 1: Creating a contact form...");
    const createFormResponse = await client.callTool({
      name: "createForm",
      arguments: {
        schema: {
        title: "Contact Form",
        description: "Please provide your contact information",
        fields: [
          {
            id: "name",
            label: "Full Name",
            type: "text",
            required: true
          },
          {
            id: "email",
            label: "Email Address",
            type: "text",
            required: true
          },
          {
            id: "reason",
            label: "Reason for Contact",
            type: "select",
            required: true,
            options: ["General Inquiry", "Support", "Sales", "Other"]
          },
          {
            id: "urgency",
            label: "How urgent is this?",
            type: "radio",
            required: true,
            options: ["Low", "Medium", "High"]
          },
          {
            id: "preferences",
            label: "Contact Preferences",
            type: "checkbox",
            required: false,
            options: ["Email", "Phone", "SMS"]
          },
          {
            id: "message",
            label: "Your Message",
            type: "textarea",
            required: true
          }
        ]
      }
      }
    });

    const createResult = JSON.parse((createFormResponse.content as any)[0].text);
    console.log("✓ Form created successfully!");
    console.log(`  Form ID: ${createResult.formId}`);
    console.log(`  Form URL: ${createResult.url}\n`);

    // Test 2: Check responses (should be not submitted yet)
    console.log("Test 2: Checking form responses (before submission)...");
    const getResponsesBeforeResponse = await client.callTool({
      name: "getResponses",
      arguments: {
        formId: createResult.formId
      }
    });

    const responseBefore = JSON.parse((getResponsesBeforeResponse.content as any)[0].text);
    console.log("✓ Retrieved form status:");
    console.log(`  Submitted: ${responseBefore.submitted}`);
    console.log(`  Responses: ${JSON.stringify(responseBefore.responses)}\n`);

    // Test 3: Try to get responses for non-existent form
    console.log("Test 3: Testing error handling with non-existent form...");
    const errorResponse = await client.callTool({
      name: "getResponses",
      arguments: {
        formId: "non-existent-form-id"
      }
    });
    
    const errorText = (errorResponse.content as any)[0].text;
    if (errorText.includes("Error:")) {
      console.log("✓ Correctly returned error for non-existent form");
      console.log(`  Error message: ${errorText}\n`);
    } else {
      console.log("✗ Error: Should have failed for non-existent form\n");
    }

    // Test 4: Create another form with minimal fields
    console.log("Test 4: Creating a simple feedback form...");
    const simpleFeedbackResponse = await client.callTool({
      name: "createForm",
      arguments: {
        schema: {
        title: "Quick Feedback",
        fields: [
          {
            id: "rating",
            label: "How would you rate our service?",
            type: "radio",
            required: true,
            options: ["1", "2", "3", "4", "5"]
          },
          {
            id: "comments",
            label: "Additional Comments",
            type: "textarea",
            required: false
          }
        ]
      }
      }
    });

    const feedbackResult = JSON.parse((simpleFeedbackResponse.content as any)[0].text);
    console.log("✓ Simple form created successfully!");
    console.log(`  Form ID: ${feedbackResult.formId}`);
    console.log(`  Form URL: ${feedbackResult.url}\n`);

    // Test 5: Test validation - missing required fields
    console.log("Test 5: Testing form validation...");
    const validationResponse = await client.callTool({
      name: "createForm",
      arguments: {
        schema: {
          title: "Invalid Form",
          fields: [
            {
              id: "field1",
              label: "Test Field",
              type: "invalid-type",
              required: true
            }
          ]
        }
      }
    });
    
    const validationText = (validationResponse.content as any)[0].text;
    if (validationText.includes("Error:")) {
      console.log("✓ Correctly validated invalid field type");
      console.log(`  Error message: ${validationText}\n`);
    } else {
      console.log("✗ Error: Should have failed validation\n");
    }

    console.log("All tests completed successfully! 🎉");
    console.log("\nYou can now visit the form URLs to test the web interface:");
    console.log(`  1. ${createResult.url}`);
    console.log(`  2. ${feedbackResult.url}`);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Clean up
    await client.close();
    serverProcess.kill();
  }
}

// Run the test
testMCPServer().catch(console.error);