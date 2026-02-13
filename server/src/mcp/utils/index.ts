import { ContentResult } from 'fastmcp';

export const responseToContent = (response: any): ContentResult => {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
};
