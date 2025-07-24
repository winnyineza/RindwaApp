// Temporary fix for authentication issue
export const fixAuth = () => {
  // Clear all localStorage
  localStorage.clear();
  
  // Set the new valid token
  const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AcmluZHdhLmNvbSIsImZpcnN0TmFtZSI6IlN5c3RlbSIsImxhc3ROYW1lIjoiQWRtaW5pc3RyYXRvciIsInJvbGUiOiJtYWluX2FkbWluIiwib3JnYW5pemF0aW9uSWQiOm51bGwsInN0YXRpb25JZCI6bnVsbCwib3JnYW5pemF0aW9uTmFtZSI6bnVsbCwic3RhdGlvbk5hbWUiOm51bGwsImlhdCI6MTc1MjIxNjgzMywiZXhwIjoxNzUyMzAzMjMzfQ.wPIIMh5toYT7yeTx4qEY-Dlh4HJQ55HO9xPCgzMeixk';
  
  localStorage.setItem('@rindwa/token', newToken);
  
  // Refresh the page to load the new token
  window.location.reload();
};

// Make it available globally for debugging
(window as any).fixAuth = fixAuth;