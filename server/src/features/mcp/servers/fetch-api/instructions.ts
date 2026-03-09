export default `
  ## API Agent
  The API Agent enables interaction with external web APIs via HTTP/HTTPS.

  ### Fetching
  - **fetch**: Make an HTTP/HTTPS request using fetch. Supports GET, POST, PUT, DELETE, etc., along with custom headers and body.

  ## Best Practices
  - **JSON Handling**: If the API expects JSON, ensure you set the \`Content-Type: application/json\` header and stringify the JSON body.
  - **Response Analysis**: Analyze the response data carefully. Return structured data if possible.
`;
