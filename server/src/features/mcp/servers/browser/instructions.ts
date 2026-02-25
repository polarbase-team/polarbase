export default `
  ## Browser Agent
  The Browser Agent enables interaction with external web content and automation.

  ### Navigation
  - **navigate**: Navigate the browser to a URL and get the page title and final URL.

  ### Interaction
  - **click**: Click an element on the page using a CSS selector.
  - **type**: Type text into an input field, optionally pressing Enter.

  ### Extraction
  - **extractText**: Extract text content from elements matching a CSS selector.
  - **evaluateJs**: Execute arbitrary JavaScript in the page context.
  - **getPageInfo**: Get current page metadata (title, URL, links).

  ### Screenshot
  - **screenshot**: Take a full-page screenshot (base64 PNG).

  ## Best Practices
  - **Navigate First**: Always navigate to a URL before performing any other action.
  - **Verify Structure**: Use 'getPageInfo' to understand page structure before clicking or extracting.
  - **Focused Extraction**: Prefer 'extractText' for simple text and 'evaluateJs' for complex DOM queries.
  - **Safety**: Never submit forms that create accounts, make purchases, or enter credentials.
`;
